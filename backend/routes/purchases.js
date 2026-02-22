const express = require('express');
const { PurchaseRepository, ItemRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const audit = require('../middleware/audit');
const { calculateLineItem, calculateInvoiceTotals } = require('../services/gstService');
const { bulkUpdateStock, revertBulkUpdateStock } = require('../services/inventoryService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/purchases';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `bill-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

const router = express.Router();

// Upload bill
router.post('/upload', auth, rbac('developer', 'admin', 'store'), upload.single('bill'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/purchases/${req.file.filename}`;
    res.json({ fileUrl });
});

// Generate purchase number
async function generatePurchaseNumber() {
    const all = await PurchaseRepository.findAll();
    const count = all.length;
    const date = new Date();
    const prefix = `PUR${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

// GET /api/purchases
router.get('/', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const { startDate, endDate, supplier, page = 1, limit = 20 } = req.query;
        let purchases = await PurchaseRepository.findAll();

        if (startDate || endDate) {
            purchases = purchases.filter(p => {
                const itemDate = p.purchaseDate && p.purchaseDate.seconds
                    ? new Date(p.purchaseDate.seconds * 1000)
                    : new Date(p.purchaseDate);

                if (isNaN(itemDate.getTime())) return true; // Keep if date is unparseable

                if (startDate && itemDate < new Date(startDate)) return false;
                if (endDate && itemDate > new Date(endDate)) return false;
                return true;
            });
        }
        if (supplier) {
            const s = supplier.toLowerCase();
            purchases = purchases.filter(p => p.supplier?.name?.toLowerCase().includes(s));
        }

        // Sort by date (descending) - Safe conversion for Firestore/JS dates
        purchases.sort((a, b) => {
            const dateA = a.purchaseDate && a.purchaseDate.seconds ? a.purchaseDate.seconds * 1000 : new Date(a.purchaseDate).getTime();
            const dateB = b.purchaseDate && b.purchaseDate.seconds ? b.purchaseDate.seconds * 1000 : new Date(b.purchaseDate).getTime();
            return dateB - dateA;
        });

        const total = purchases.length;
        const paged = purchases.slice((page - 1) * limit, page * limit);

        // Populate createdBy name and Normalize dates for frontend
        const { UserRepository } = require('../repositories');
        for (let p of paged) {
            // CreatedBy population
            if (p.createdBy && typeof p.createdBy === 'string') {
                const user = await UserRepository.findById(p.createdBy);
                p.createdBy = user ? { name: user.name } : null;
            }

            // Date normalization
            if (p.purchaseDate) {
                try {
                    const d = p.purchaseDate && p.purchaseDate.seconds
                        ? new Date(p.purchaseDate.seconds * 1000)
                        : p.purchaseDate._seconds
                            ? new Date(p.purchaseDate._seconds * 1000)
                            : new Date(p.purchaseDate);

                    if (!isNaN(d.getTime())) {
                        p.purchaseDate = d.toISOString();
                    }
                } catch (e) {
                    console.error('[PurchasesRoute] Date normalization failed for:', p.purchaseNumber, e.message);
                }
            }
        }

        res.json({ purchases: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/purchases/:id
router.get('/:id', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const purchase = await PurchaseRepository.findById(req.params.id);
        if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

        const { UserRepository } = require('../repositories');
        if (purchase.createdBy) {
            const user = await UserRepository.findById(purchase.createdBy);
            purchase.createdBy = user ? { name: user.name } : null;
        }

        res.json(purchase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/purchases
router.post('/', auth, rbac('developer', 'admin', 'store'), audit('PURCHASE_CREATE', 'Purchase'), async (req, res) => {
    try {
        const {
            supplier, items, paymentMode, paymentStatus, invoiceNumber, notes, purchaseDate: rawPurchaseDate, billUrl,
            freight: rawFreight = 0, packingForwarding: rawPacking = 0
        } = req.body;
        const freight = Number(rawFreight) || 0;
        const packingForwarding = Number(rawPacking) || 0;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // 1. Calculate totalBaseValue of the bill
        let totalBaseValue = 0;
        for (const entry of items) {
            const item = await ItemRepository.findById(entry.item);
            if (!item) return res.status(400).json({ error: `Item not found: ${entry.item}` });
            const gross = entry.grossPrice !== undefined ? entry.grossPrice : (entry.unitPrice || item.purchasePrice || 0);
            const disc = entry.discount || 0;
            totalBaseValue += (gross - (gross * disc / 100)) * entry.quantity;
        }

        const billCharges = { freight, packingForwarding };
        const processedItems = [];

        for (const entry of items) {
            const item = await ItemRepository.findById(entry.item);
            const gross = entry.grossPrice !== undefined ? entry.grossPrice : (entry.unitPrice || item.purchasePrice || 0);

            const lineCalc = require('../services/gstService').calculateLandedLineItem(
                gross,
                entry.quantity,
                entry.discount || 0,
                entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                billCharges,
                totalBaseValue
            );

            processedItems.push({
                item: item.id,
                itemName: item.itemName,
                itemCode: item.itemCode,
                barcodeNumber: item.barcodeNumber,
                hsnCode: item.hsnCode,
                quantity: entry.quantity,
                unitPrice: gross,
                grossPrice: gross,
                discount: entry.discount || 0,
                baseValue: lineCalc.unitBaseValue * entry.quantity,
                allocatedCharges: lineCalc.allocatedChargesPerUnit * entry.quantity,
                landedPrice: lineCalc.landedPrice,
                gstPercentage: entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                cgst: lineCalc.cgst,
                sgst: lineCalc.sgst,
                igst: lineCalc.igst,
                totalAmount: lineCalc.netAmount,
                batchNumber: entry.batchNumber || null,
                expiryDate: entry.expiryDate || null,
                manufacturingDate: entry.manufacturingDate || null,
                mrp: entry.mrp || item.mrp || 0,
                sellingPrice: entry.sellingPrice || item.sellingPrice || 0,
                saleDiscount: entry.saleDiscount || 0
            });

            // Update item master with latest pricing/GST info
            await ItemRepository.update(item.id, {
                purchasePrice: lineCalc.landedPrice,
                mrp: entry.mrp || item.mrp || 0,
                sellingPrice: entry.sellingPrice || item.sellingPrice || 0,
                gstPercentage: entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                fixedDiscount: {
                    enabled: (entry.saleDiscount || 0) > 0,
                    percentage: entry.saleDiscount || 0
                }
            });
        }

        const totals = require('../services/gstService').calculateInvoiceTotals(processedItems.map(i => ({
            taxableAmount: i.landedPrice * i.quantity,
            cgst: i.cgst,
            sgst: i.sgst,
            igst: i.igst,
            totalGST: i.cgst + i.sgst + i.igst,
            discountAmount: (i.grossPrice * i.quantity * i.discount) / 100,
            totalWithGST: i.totalAmount
        })));

        const purchaseNumber = await generatePurchaseNumber();

        const purchaseData = {
            purchaseNumber,
            supplier,
            items: processedItems,
            freight, packingForwarding,
            subtotal: totals.subtotal,
            totalGST: totals.totalGST,
            totalDiscount: totals.totalDiscount,
            grandTotal: totals.grandTotal,
            paymentMode,
            paymentStatus,
            invoiceNumber,
            notes,
            billUrl,
            createdBy: req.user.id,
            purchaseDate: rawPurchaseDate ? new Date(rawPurchaseDate) : new Date()
        };
        console.log(`[PurchasesRoute] Saving purchase. Final purchaseDate object:`, purchaseData.purchaseDate);

        const purchase = await PurchaseRepository.create(purchaseData);

        // Update stock
        await bulkUpdateStock(processedItems, 'Purchase', purchase.id, 'Purchase', req.user.id);

        res.status(201).json(purchase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/purchases/:id
router.put('/:id', auth, rbac('developer', 'admin', 'store'), audit('PURCHASE_UPDATE', 'Purchase'), async (req, res) => {
    try {
        const oldPurchase = await PurchaseRepository.findById(req.params.id);
        if (!oldPurchase) return res.status(404).json({ error: 'Purchase not found' });

        const {
            supplier, items, paymentMode, paymentStatus, invoiceNumber, notes, purchaseDate: rawPurchaseDate, billUrl,
            freight: rawFreight = 0, packingForwarding: rawPacking = 0
        } = req.body;
        const freight = Number(rawFreight) || 0;
        const packingForwarding = Number(rawPacking) || 0;

        if (!items || items.length === 0) return res.status(400).json({ error: 'Items required' });

        // 1. Revert old stock
        await revertBulkUpdateStock(oldPurchase.items, 'Purchase', oldPurchase.id, 'Purchase', req.user.id);

        // 2. Calculate totalBaseValue
        let totalBaseValue = 0;
        for (const entry of items) {
            const itemId = entry.item && typeof entry.item === 'object' ? entry.item.id || entry.item._id : entry.item;
            const item = await ItemRepository.findById(itemId);
            if (!item) throw new Error(`Item not found: ${itemId}`);
            const gross = entry.grossPrice !== undefined ? entry.grossPrice : (entry.unitPrice || item.purchasePrice || 0);
            const disc = entry.discount || 0;
            totalBaseValue += (gross - (gross * disc / 100)) * entry.quantity;
        }

        const billCharges = { freight, packingForwarding };
        const processedItems = [];
        for (const entry of items) {
            const itemId = entry.item && typeof entry.item === 'object' ? entry.item.id || entry.item._id : entry.item;
            const item = await ItemRepository.findById(itemId);
            const gross = entry.grossPrice !== undefined ? entry.grossPrice : (entry.unitPrice || item.purchasePrice || 0);

            const lineCalc = require('../services/gstService').calculateLandedLineItem(
                gross,
                entry.quantity,
                entry.discount || 0,
                entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                billCharges,
                totalBaseValue
            );

            processedItems.push({
                item: item.id,
                itemName: item.itemName,
                itemCode: item.itemCode,
                barcodeNumber: item.barcodeNumber,
                hsnCode: item.hsnCode,
                quantity: entry.quantity,
                unitPrice: gross,
                grossPrice: gross,
                discount: entry.discount || 0,
                baseValue: lineCalc.unitBaseValue * entry.quantity,
                allocatedCharges: lineCalc.allocatedChargesPerUnit * entry.quantity,
                landedPrice: lineCalc.landedPrice,
                gstPercentage: entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                cgst: lineCalc.cgst,
                sgst: lineCalc.sgst,
                igst: lineCalc.igst,
                totalAmount: lineCalc.netAmount,
                batchNumber: entry.batchNumber || null,
                expiryDate: entry.expiryDate || null,
                manufacturingDate: entry.manufacturingDate || null,
                mrp: entry.mrp || item.mrp || 0,
                sellingPrice: entry.sellingPrice || item.sellingPrice || 0,
                saleDiscount: entry.saleDiscount || 0
            });

            // Update item master with latest pricing/GST info
            await ItemRepository.update(item.id, {
                purchasePrice: lineCalc.landedPrice,
                mrp: entry.mrp || item.mrp || 0,
                sellingPrice: entry.sellingPrice || item.sellingPrice || 0,
                gstPercentage: entry.gstPercentage !== undefined ? entry.gstPercentage : item.gstPercentage,
                fixedDiscount: {
                    enabled: (entry.saleDiscount || 0) > 0,
                    percentage: entry.saleDiscount || 0
                }
            });
        }

        const totals = require('../services/gstService').calculateInvoiceTotals(processedItems.map(i => ({
            taxableAmount: i.landedPrice * i.quantity,
            cgst: i.cgst,
            sgst: i.sgst,
            igst: i.igst,
            totalGST: i.cgst + i.sgst + i.igst,
            discountAmount: (i.grossPrice * i.quantity * i.discount) / 100,
            totalWithGST: i.totalAmount
        })));

        const updateData = {
            supplier, items: processedItems,
            freight, packingForwarding,
            subtotal: totals.subtotal, totalGST: totals.totalGST,
            totalDiscount: totals.totalDiscount, grandTotal: totals.grandTotal, paymentMode,
            paymentStatus, invoiceNumber, notes, billUrl, updatedAt: new Date(),
            purchaseDate: rawPurchaseDate ? new Date(rawPurchaseDate) : oldPurchase.purchaseDate
        };
        console.log(`[PurchasesRoute] Updating purchase ${req.params.id}. Final purchaseDate object:`, updateData.purchaseDate);

        const updated = await PurchaseRepository.update(req.params.id, updateData);

        // 3. Apply new stock
        await bulkUpdateStock(processedItems, 'Purchase', updated.id, 'Purchase', req.user.id);

        res.json(updated);
    } catch (error) {
        console.error('[PurchasesRoute] PUT Error:', error);
        const fs = require('fs');
        fs.appendFileSync('error_capture.log', `[${new Date().toISOString()}] PUT /api/purchases/${req.params.id} ERROR: ${error.message}\n${error.stack}\n\n`);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/purchases/:id
router.delete('/:id', auth, rbac('developer', 'admin'), audit('PURCHASE_DELETE', 'Purchase'), async (req, res) => {
    try {
        const purchase = await PurchaseRepository.findById(req.params.id);
        if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

        // Revert stock
        await revertBulkUpdateStock(purchase.items, 'Purchase', purchase.id, 'Purchase', req.user.id);

        // Delete purchase
        await PurchaseRepository.delete(req.params.id);

        res.json({ message: 'Purchase deleted and stock reverted' });
    } catch (error) {
        console.error('[PurchasesRoute] DELETE Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
