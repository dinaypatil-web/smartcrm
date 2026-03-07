const express = require('express');
const { InventoryLedgerRepository, ItemRepository, UserRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { getMonthlyStockSummary } = require('../services/inventoryService');
const router = express.Router();

// GET /api/inventory - Current stock for all items
router.get('/', auth, async (req, res) => {
    try {
        const { category, itemType, search, lowStockOnly, page = 1, limit = 50 } = req.query;
        let items = await ItemRepository.findAll();

        items = items.filter(i => i.isActive);

        if (category) items = items.filter(i => i.category === category);
        if (itemType) items = items.filter(i => i.itemType === itemType);
        if (search) {
            const s = search.toLowerCase();
            items = items.filter(i =>
                (i.itemName && i.itemName.toLowerCase().includes(s)) ||
                (i.itemCode && i.itemCode.toLowerCase().includes(s)) ||
                (i.barcodeNumber && i.barcodeNumber.toLowerCase().includes(s))
            );
        }
        if (lowStockOnly === 'true') {
            items = items.filter(i => (i.currentStock || 0) <= (i.lowStockLevel || 0));
        }

        items.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));

        const total = items.length;
        const paged = items.slice((page - 1) * limit, page * limit);

        const result = paged.map(i => ({
            id: i.id,
            itemName: i.itemName,
            itemCode: i.itemCode,
            barcodeNumber: i.barcodeNumber,
            category: i.category,
            itemType: i.itemType,
            currentStock: i.currentStock,
            lowStockLevel: i.lowStockLevel,
            unitOfMeasure: i.unitOfMeasure,
            sellingPrice: i.sellingPrice,
            mrp: i.mrp,
            purchasePrice: i.purchasePrice
        }));

        res.json({ items: result, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/ledger/:itemId - Inventory ledger for specific item
router.get('/ledger/:itemId', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        let ledger = await InventoryLedgerRepository.findAll();

        ledger = ledger.filter(l => l.item === req.params.itemId);

        if (startDate || endDate) {
            ledger = ledger.filter(l => {
                const d = new Date(l.createdAt);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        ledger.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = ledger.length;
        const paged = ledger.slice((page - 1) * limit, page * limit);

        for (let l of paged) {
            if (l.createdBy) {
                const user = await UserRepository.findById(l.createdBy);
                l.createdBy = user ? { name: user.name } : null;
            }
        }

        res.json({ ledger: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/monthly-summary
router.get('/monthly-summary', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const { year, month, itemId, category } = req.query;

        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required' });
        }

        let items;
        if (itemId) {
            items = [await ItemRepository.findById(itemId)];
        } else {
            items = await ItemRepository.findAll();
            items = items.filter(i => i.isActive);
            if (category) items = items.filter(i => i.category === category);
        }

        const summaries = [];
        for (const item of items) {
            if (!item) continue;
            const summary = await getMonthlyStockSummary(item.id, parseInt(year), parseInt(month));
            summaries.push({
                item: {
                    id: item.id,
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    barcodeNumber: item.barcodeNumber,
                    category: item.category
                },
                ...summary
            });
        }

        res.json({ year: parseInt(year), month: parseInt(month), summaries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/alerts - Items expiring within 15 days
router.get('/alerts', auth, async (req, res) => {
    try {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 15);

        // We need to check inventory_ledger for positive quantities (stock in) that haven't been fully consumed?
        // Actually, the simplest way is to check all batches in ledger with expiryDate < threshold
        const allLedger = await InventoryLedgerRepository.findAll();
        const activeStock = {}; // itemId -> { batchNumber -> { quantity, expiryDate } }

        // This is a bit complex in Firestore without a proper batch table. 
        // We'll calculate current stock by batch from ledger.
        allLedger.forEach(entry => {
            if (!entry.batchNumber || !entry.expiryDate) return;
            const key = `${entry.item}_${entry.batchNumber}`;
            if (!activeStock[key]) {
                activeStock[key] = { itemId: entry.item, batchNumber: entry.batchNumber, quantity: 0, expiryDate: new Date(entry.expiryDate) };
            }
            activeStock[key].quantity += entry.quantity;
        });

        const now = new Date();
        const alerts = [];
        const expired = [];

        for (const key in activeStock) {
            const batch = activeStock[key];
            if (batch.quantity <= 0) continue;

            if (batch.expiryDate < now) {
                expired.push(batch);
            } else if (batch.expiryDate <= threshold) {
                alerts.push(batch);
            }
        }

        // Populate item names
        for (const list of [alerts, expired]) {
            for (const batch of list) {
                const item = await ItemRepository.findById(batch.itemId);
                batch.itemName = item ? item.itemName : 'Unknown';
                batch.itemCode = item ? item.itemCode : '';
            }
        }

        res.json({ expiringSoon: alerts, expired });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/valuation
router.get('/valuation', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        let items = await ItemRepository.findAll();
        items = items.filter(i => i.isActive && (i.currentStock || 0) > 0);

        const valuation = items.map(item => ({
            ...item,
            costValue: parseFloat(((item.currentStock || 0) * (item.purchasePrice || 0)).toFixed(2)),
            sellingValue: parseFloat(((item.currentStock || 0) * (item.sellingPrice || 0)).toFixed(2)),
            mrpValue: parseFloat(((item.currentStock || 0) * (item.mrp || 0)).toFixed(2))
        }));

        const totalCostValue = valuation.reduce((sum, v) => sum + v.costValue, 0);
        const totalSellingValue = valuation.reduce((sum, v) => sum + v.sellingValue, 0);
        const totalMRPValue = valuation.reduce((sum, v) => sum + v.mrpValue, 0);

        res.json({ items: valuation, totalCostValue, totalSellingValue, totalMRPValue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/batches/:itemId - Batches for specific item
router.get('/batches/:itemId', auth, async (req, res) => {
    try {
        const allLedger = await InventoryLedgerRepository.findAll();
        const itemLedger = allLedger.filter(l => l.item === req.params.itemId && l.batchNumber);

        const batchStock = {}; // batchNumber -> { quantity, expiryDate }

        itemLedger.forEach(entry => {
            const b = entry.batchNumber;
            if (!batchStock[b]) {
                batchStock[b] = { batchNumber: b, quantity: 0, expiryDate: entry.expiryDate };
            }
            batchStock[b].quantity += entry.quantity;
        });

        // Filter for positive stock and sort by expiry
        const batches = Object.values(batchStock)
            .filter(b => b.quantity > 0)
            .sort((a, b) => {
                const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date('9999-12-31');
                const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date('9999-12-31');
                return dateA - dateB;
            });

        res.json(batches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
