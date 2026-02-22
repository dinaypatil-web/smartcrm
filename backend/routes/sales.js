const express = require('express');
const { SaleRepository, ItemRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac, checkPermission } = require('../middleware/rbac');
const audit = require('../middleware/audit');
const { calculateLineItem, calculateInvoiceTotals } = require('../services/gstService');
const { bulkUpdateStock, revertBulkUpdateStock } = require('../services/inventoryService');
const router = express.Router();

// Generate invoice number
async function generateInvoiceNumber() {
    const all = await SaleRepository.findAll();
    const count = all.length;
    const date = new Date();
    const prefix = `INV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

// GET /api/sales
router.get('/', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const { startDate, endDate, customer, page = 1, limit = 20 } = req.query;
        let sales = await SaleRepository.findAll();

        if (startDate || endDate) {
            sales = sales.filter(s => {
                const d = new Date(s.saleDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }
        if (customer) {
            const c = customer.toLowerCase();
            sales = sales.filter(s => s.customer?.name?.toLowerCase().includes(c));
        }

        sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

        const total = sales.length;
        const paged = sales.slice((page - 1) * limit, page * limit);

        // Populate createdBy and Normalize dates
        const { UserRepository } = require('../repositories');
        for (let s of paged) {
            // Firestore timestamp normalization
            if (s.saleDate && typeof s.saleDate === 'object' && s.saleDate._seconds) {
                s.saleDate = new Date(s.saleDate._seconds * 1000).toISOString();
            } else if (s.saleDate && s.saleDate.toDate) {
                s.saleDate = s.saleDate.toDate().toISOString();
            }

            if (s.createdBy) {
                const user = await UserRepository.findById(s.createdBy);
                s.createdBy = user ? { name: user.name } : null;
            }
        }

        res.json({ sales: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sales/:id
router.get('/:id', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const sale = await SaleRepository.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const { UserRepository } = require('../repositories');
        // Firestore timestamp normalization
        if (sale.saleDate && typeof sale.saleDate === 'object' && sale.saleDate._seconds) {
            sale.saleDate = new Date(sale.saleDate._seconds * 1000).toISOString();
        } else if (sale.saleDate && sale.saleDate.toDate) {
            sale.saleDate = sale.saleDate.toDate().toISOString();
        }

        if (sale.createdBy) {
            const user = await UserRepository.findById(sale.createdBy);
            sale.createdBy = user ? { name: user.name } : null;
        }

        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sales (POS Billing)
router.post('/', auth, rbac('developer', 'admin', 'store'), audit('SALE_CREATE', 'Sale'), async (req, res) => {
    try {
        const { customer, items, paymentMode, prescriptionRef, notes, billDiscountValue = 0, billDiscountType = 'percentage' } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // Permission check for bill-level variable discount
        if (billDiscountValue > 0) {
            if (!req.user.permissions?.variableDiscount && req.user.role !== 'developer' && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Variable discount not permitted' });
            }
        }

        const processedItems = [];
        for (const entry of items) {
            const item = await ItemRepository.findById(entry.item);
            if (!item) {
                return res.status(400).json({ error: `Item not found: ${entry.item}` });
            }

            if (item.currentStock < entry.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for ${item.itemName}. Available: ${item.currentStock}, Requested: ${entry.quantity}`
                });
            }

            // Strictly use Fixed Discount from Item Master
            let discountPercentage = 0;
            if (item.fixedDiscount?.enabled) {
                discountPercentage = item.fixedDiscount.percentage;
            }

            const lineCalc = calculateLineItem(
                entry.unitPrice || item.sellingPrice,
                entry.quantity,
                discountPercentage,
                item.gstPercentage
            );

            processedItems.push({
                item: item.id,
                itemName: item.itemName,
                itemCode: item.itemCode,
                barcodeNumber: item.barcodeNumber,
                hsnCode: item.hsnCode,
                quantity: entry.quantity,
                unitPrice: entry.unitPrice || item.sellingPrice,
                mrp: item.mrp,
                discount: discountPercentage,
                discountType: 'fixed',
                gstPercentage: item.gstPercentage,
                cgst: lineCalc.cgst,
                sgst: lineCalc.sgst,
                igst: lineCalc.igst,
                totalAmount: lineCalc.totalWithGST,
                batchNumber: entry.batchNumber,
                expiryDate: entry.expiryDate || item.expiryDate || null
            });
        }

        let totals = calculateInvoiceTotals(processedItems);

        // Apply Bill-level Variable Discount
        let billDiscountAmount = 0;
        if (billDiscountType === 'percentage') {
            billDiscountAmount = (totals.subtotal * billDiscountValue) / 100;
        } else {
            billDiscountAmount = billDiscountValue;
        }

        totals.totalDiscount = parseFloat((totals.totalDiscount + billDiscountAmount).toFixed(2));
        totals.grandTotal = parseFloat((totals.grandTotal - billDiscountAmount).toFixed(2));

        const invoiceNumber = await generateInvoiceNumber();

        const saleData = {
            invoiceNumber,
            customer: customer || { name: 'Walk-in Customer' },
            items: processedItems,
            grossTotal: totals.grossTotal,
            subtotal: totals.subtotal,
            totalGST: totals.totalGST,
            totalDiscount: totals.totalDiscount,
            billDiscount: {
                value: billDiscountValue,
                type: billDiscountType,
                amount: billDiscountAmount
            },
            grandTotal: totals.grandTotal,
            paymentMode,
            prescriptionRef,
            notes,
            createdBy: req.user.id,
            saleDate: new Date()
        };

        const sale = await SaleRepository.create(saleData);

        // Deduct stock
        await bulkUpdateStock(processedItems, 'Sale', sale.id, 'Sale', req.user.id);

        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/sales/:id
router.put('/:id', auth, rbac('developer', 'admin'), audit('SALE_UPDATE', 'Sale'), async (req, res) => {
    try {
        const oldSale = await SaleRepository.findById(req.params.id);
        if (!oldSale) return res.status(404).json({ error: 'Sale not found' });

        const { customer, items, paymentMode, notes, billDiscountValue = 0, billDiscountType = 'percentage' } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'Items required' });

        // 1. Revert old stock
        await revertBulkUpdateStock(oldSale.items, 'Sale', oldSale.id, 'Sale', req.user.id);

        // 2. Process new items and calculate totals
        const processedItems = [];
        for (const entry of items) {
            const itemId = entry.item && typeof entry.item === 'object' ? entry.item.id || entry.item._id : entry.item;
            if (!itemId) continue;

            const item = await ItemRepository.findById(itemId);
            if (!item) throw new Error(`Item not found: ${itemId}`);

            let discountPercentage = 0;
            if (item.fixedDiscount?.enabled) {
                discountPercentage = item.fixedDiscount.percentage;
            }

            const lineCalc = calculateLineItem(entry.unitPrice || item.sellingPrice, entry.quantity, discountPercentage, item.gstPercentage);
            processedItems.push({
                item: item.id, itemName: item.itemName, itemCode: item.itemCode, barcodeNumber: item.barcodeNumber,
                hsnCode: item.hsnCode, quantity: entry.quantity, unitPrice: entry.unitPrice || item.sellingPrice,
                discount: discountPercentage, gstPercentage: item.gstPercentage,
                taxableAmount: lineCalc.taxableAmount,
                cgst: lineCalc.cgst, sgst: lineCalc.sgst, igst: lineCalc.igst,
                totalAmount: lineCalc.totalWithGST,
                discountAmount: lineCalc.discountAmount,
                batchNumber: entry.batchNumber,
                expiryDate: entry.expiryDate || item.expiryDate || null
            });
        }

        let totals = calculateInvoiceTotals(processedItems);

        // Apply Bill-level Variable Discount
        let billDiscountAmount = 0;
        if (billDiscountType === 'percentage') {
            billDiscountAmount = (totals.subtotal * billDiscountValue) / 100;
        } else {
            billDiscountAmount = billDiscountValue;
        }

        totals.totalDiscount = parseFloat((totals.totalDiscount + billDiscountAmount).toFixed(2));
        totals.grandTotal = parseFloat((totals.grandTotal - billDiscountAmount).toFixed(2));

        const updateData = {
            customer, items: processedItems,
            grossTotal: totals.grossTotal,
            subtotal: totals.subtotal, totalGST: totals.totalGST,
            totalDiscount: totals.totalDiscount,
            billDiscount: { value: billDiscountValue, type: billDiscountType, amount: billDiscountAmount },
            grandTotal: totals.grandTotal, paymentMode, notes, updatedAt: new Date()
        };

        const updated = await SaleRepository.update(req.params.id, updateData);

        // 3. Apply new stock
        await bulkUpdateStock(processedItems, 'Sale', updated.id, 'Sale', req.user.id);

        res.json(updated);
    } catch (error) {
        console.error('[SalesRoute] PUT Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/sales/:id
router.delete('/:id', auth, rbac('developer', 'admin'), audit('SALE_DELETE', 'Sale'), async (req, res) => {
    try {
        const sale = await SaleRepository.findById(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        // Revert stock
        await revertBulkUpdateStock(sale.items, 'Sale', sale.id, 'Sale', req.user.id);

        // Delete sale
        await SaleRepository.delete(req.params.id);

        res.json({ message: 'Sale deleted and stock reverted' });
    } catch (error) {
        console.error('[SalesRoute] DELETE Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
