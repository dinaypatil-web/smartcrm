const express = require('express');
const { SaleRepository, PurchaseRepository, ProductionRepository, ItemRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { getMonthlyStockSummary } = require('../services/inventoryService');
const router = express.Router();

// GET /api/reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let sales = await SaleRepository.findAll();
        let purchases = await PurchaseRepository.findAll();
        const items = await ItemRepository.findAll();
        let productions = await ProductionRepository.findAll();

        // Normalize dates helper
        const normalizeDate = (obj, field) => {
            if (!obj[field]) return null;
            if (typeof obj[field] === 'object' && obj[field]._seconds) {
                return new Date(obj[field]._seconds * 1000);
            }
            if (obj[field].toDate) {
                return obj[field].toDate();
            }
            return new Date(obj[field]);
        };

        // Today's sales
        const todaySalesList = sales.filter(s => {
            const d = normalizeDate(s, 'saleDate');
            return d && d >= startOfDay;
        });
        const todaySales = {
            total: todaySalesList.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
            count: todaySalesList.length
        };

        // Month's sales
        const monthSalesList = sales.filter(s => {
            const d = normalizeDate(s, 'saleDate');
            return d && d >= startOfMonth;
        });
        const monthSales = {
            total: monthSalesList.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
            count: monthSalesList.length
        };

        // Month's purchases
        const monthPurchasesList = purchases.filter(p => {
            const d = normalizeDate(p, 'purchaseDate');
            return d && d >= startOfMonth;
        });
        const monthPurchases = {
            total: monthPurchasesList.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
            count: monthPurchasesList.length
        };

        // Low stock items count
        const activeItems = items.filter(i => i.isActive);
        const lowStockCount = activeItems.filter(i => (i.currentStock || 0) <= (i.lowStockLevel || 0)).length;

        // Total items & stock value
        const totalItems = activeItems.length;
        const stockValue = activeItems.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.purchasePrice || 0)), 0);

        // Production this month
        const monthProduction = productions.filter(p => {
            const d = normalizeDate(p, 'productionDate');
            return d && d >= startOfMonth && p.status === 'Completed';
        }).length;

        // Top selling items (Month)
        const itemMap = new Map();
        monthSalesList.forEach(sale => {
            (sale.items || []).forEach(item => {
                const id = item.item;
                if (!itemMap.has(id)) {
                    itemMap.set(id, { itemName: item.itemName, barcodeNumber: item.barcodeNumber, totalQuantity: 0, totalRevenue: 0 });
                }
                const data = itemMap.get(id);
                data.totalQuantity += (item.quantity || 0);
                data.totalRevenue += (item.totalAmount || 0);
            });
        });

        const topSelling = Array.from(itemMap.values())
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        res.json({
            todaySales,
            monthSales,
            monthPurchases,
            lowStockCount,
            totalItems,
            stockValue: parseFloat(stockValue.toFixed(2)),
            monthProduction,
            topSelling
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/sales
router.get('/sales', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const { startDate, endDate, barcode, groupBy = 'day' } = req.query;
        let sales = await SaleRepository.findAll();

        if (startDate || endDate) {
            sales = sales.filter(s => {
                const d = normalizeDate(s, 'saleDate');
                if (!d) return false;
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        const groups = new Map();
        sales.forEach(sale => {
            const sDate = normalizeDate(sale, 'saleDate');
            if (!sDate) return;
            let key;
            const year = sDate.getFullYear();
            const month = String(sDate.getMonth() + 1).padStart(2, '0');
            const day = String(sDate.getDate()).padStart(2, '0');

            if (groupBy === 'month') {
                key = `${year}-${month}`;
            } else if (groupBy === 'week') {
                // Simple week calculation
                const firstJan = new Date(year, 0, 1);
                const weekNum = Math.ceil((((sDate - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
                key = `${year}-W${String(weekNum).padStart(2, '0')}`;
            } else {
                key = `${year}-${month}-${day}`;
            }

            if (!groups.has(key)) {
                groups.set(key, { _id: key, totalSales: 0, totalQuantity: 0, totalGST: 0, count: 0 });
            }
            const group = groups.get(key);

            (sale.items || []).forEach(item => {
                if (barcode && item.barcodeNumber !== barcode) return;
                group.totalSales += (item.totalAmount || 0);
                group.totalQuantity += (item.quantity || 0);
                group.totalGST += ((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0));
                group.count++;
            });
        });

        const report = Array.from(groups.values()).sort((a, b) => a._id.localeCompare(b._id));
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/purchases
router.get('/purchases', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const { startDate, endDate, barcode, groupBy = 'day' } = req.query;
        let purchases = await PurchaseRepository.findAll();

        if (startDate || endDate) {
            purchases = purchases.filter(p => {
                const d = normalizeDate(p, 'purchaseDate');
                if (!d) return false;
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        const groups = new Map();
        purchases.forEach(purchase => {
            const pDate = normalizeDate(purchase, 'purchaseDate');
            if (!pDate) return;
            let key;
            const year = pDate.getFullYear();
            const month = String(pDate.getMonth() + 1).padStart(2, '0');
            const day = String(pDate.getDate()).padStart(2, '0');

            if (groupBy === 'month') {
                key = `${year}-${month}`;
            } else {
                key = `${year}-${month}-${day}`;
            }

            if (!groups.has(key)) {
                groups.set(key, { _id: key, totalPurchases: 0, totalQuantity: 0, count: 0 });
            }
            const group = groups.get(key);

            (purchase.items || []).forEach(item => {
                if (barcode && item.barcodeNumber !== barcode) return;
                group.totalPurchases += (item.totalAmount || 0);
                group.totalQuantity += (item.quantity || 0);
                group.count++;
            });
        });

        const report = Array.from(groups.values()).sort((a, b) => a._id.localeCompare(b._id));
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/stock
router.get('/stock', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const { year, month, category, barcode } = req.query;

        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required' });
        }

        let items = await ItemRepository.findAll();
        items = items.filter(i => i.isActive);
        if (category) items = items.filter(i => i.category === category);
        if (barcode) items = items.filter(i => i.barcodeNumber === barcode);

        const summaries = [];
        for (const item of items) {
            const summary = await getMonthlyStockSummary(item.id, parseInt(year), parseInt(month));
            summaries.push({
                item: {
                    id: item.id,
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    barcodeNumber: item.barcodeNumber,
                    category: item.category,
                    unitOfMeasure: item.unitOfMeasure,
                    purchasePrice: item.purchasePrice,
                    sellingPrice: item.sellingPrice
                },
                ...summary
            });
        }

        res.json({ year: parseInt(year), month: parseInt(month), summaries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
