const express = require('express');
const { body, validationResult } = require('express-validator');
const { ItemRepository } = require('../repositories');
const { updateStock } = require('../services/inventoryService');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const audit = require('../middleware/audit');
const { generateBarcodeNumber } = require('../services/barcodeService');
const { generateSampleExcel, parseItemExcel } = require('../services/itemExcelService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// GET /api/items/sample-excel
router.get('/sample-excel', auth, rbac('developer', 'admin'), (req, res) => {
    try {
        const buffer = generateSampleExcel();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=item_master_sample.xlsx');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/items/upload-excel
router.post('/upload-excel', auth, rbac('developer', 'admin'), upload.single('file'), audit('ITEM_EXCEL_UPLOAD', 'Item'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const itemsData = parseItemExcel(req.file.buffer);
        const results = { created: 0, updated: 0, errors: [] };

        for (const item of itemsData) {
            try {
                if (!item.itemName || !item.itemCode) continue;

                const existing = await ItemRepository.findByCode(item.itemCode);
                if (existing) {
                    await ItemRepository.update(existing.id, { ...item, updatedAt: new Date() });
                    results.updated++;
                } else {
                    if (!item.barcodeNumber) {
                        item.barcodeNumber = generateBarcodeNumber();
                    }
                    await ItemRepository.create({ ...item, isActive: true });
                    results.created++;
                }
            } catch (err) {
                results.errors.push({ itemCode: item.itemCode, error: err.message });
            }
        }

        res.json({ message: 'Upload completed', results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items
router.get('/', auth, async (req, res) => {
    try {
        const { search, category, itemType, isActive = 'true', page = 1, limit = 50 } = req.query;
        let items = await ItemRepository.findAll();

        // Apply filters in-memory for complex search/isActive
        if (isActive !== undefined) {
            items = items.filter(i => i.isActive === (isActive === 'true'));
        }
        if (category) {
            items = items.filter(i => i.category === category);
        }
        if (itemType) {
            items = items.filter(i => i.itemType === itemType);
        }
        if (search) {
            const s = search.toLowerCase();
            items = items.filter(i =>
                (i.itemName && i.itemName.toLowerCase().includes(s)) ||
                (i.itemCode && i.itemCode.toLowerCase().includes(s)) ||
                (i.barcodeNumber && i.barcodeNumber.toLowerCase().includes(s))
            );
        }

        // Sorting
        items.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));

        const total = items.length;
        const pagedItems = items.slice((page - 1) * limit, page * limit);

        res.json({ items: pagedItems, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/barcode/:barcode
router.get('/barcode/:barcode', auth, async (req, res) => {
    try {
        const item = await ItemRepository.findOne({ barcodeNumber: req.params.barcode, isActive: true });
        if (!item) return res.status(404).json({ error: 'Item not found for this barcode' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/categories
router.get('/categories', auth, async (req, res) => {
    try {
        const items = await ItemRepository.findAll();
        const categories = [...new Set(items.filter(i => i.isActive).map(i => i.category))];
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/low-stock
router.get('/low-stock', auth, async (req, res) => {
    try {
        const items = await ItemRepository.findAll();
        const lowStockItems = items.filter(i =>
            i.isActive && (i.currentStock || 0) <= (i.lowStockLevel || 0)
        );
        lowStockItems.sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));
        res.json(lowStockItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await ItemRepository.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/items
router.post('/', auth, rbac('developer', 'admin', 'store'), audit('ITEM_CREATE', 'Item'), [
    body('itemName').trim().notEmpty().withMessage('Item name is required'),
    body('itemCode').trim().notEmpty().withMessage('Item code is required'),
    body('itemType').isIn(['Raw Material', 'Finished Medicine', 'Both']).withMessage('Invalid item type'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('purchasePrice').isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    body('mrp').isFloat({ min: 0 }).withMessage('Valid MRP required'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Valid selling price required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = { ...req.body };
        if (!data.barcodeNumber) {
            data.barcodeNumber = generateBarcodeNumber();
        }

        const existingBarcode = await ItemRepository.findOne({ barcodeNumber: data.barcodeNumber });
        if (existingBarcode) {
            return res.status(400).json({ error: 'Barcode number already exists' });
        }

        const existingCode = await ItemRepository.findByCode(data.itemCode);
        if (existingCode) {
            return res.status(400).json({ error: 'Item code already exists' });
        }

        const item = await ItemRepository.create({ ...data, isActive: true });

        // Handle Advanced Opening Stock
        if (data.openingStockEntries && Array.isArray(data.openingStockEntries) && data.openingStockEntries.length > 0) {
            let totalOpeningStock = 0;

            for (const entry of data.openingStockEntries) {
                if (!entry.quantity || entry.quantity <= 0) continue;

                totalOpeningStock += Number(entry.quantity);

                await updateStock(
                    item.id,
                    entry.quantity,
                    'Opening',
                    item.id,
                    'Item',
                    req.user.id,
                    entry.batchNumber || null,
                    entry.landedPrice || 0,
                    `Opening stock batch: ${entry.batchNumber || 'N/A'}`
                );
            }

            // Update item with total opening stock and latest entry pricing if applicable
            const latestEntry = data.openingStockEntries[0];
            await ItemRepository.update(item.id, {
                openingStock: totalOpeningStock,
                purchasePrice: latestEntry.landedPrice || item.purchasePrice,
                mrp: latestEntry.mrp || item.mrp,
                sellingPrice: latestEntry.sellingPrice || item.sellingPrice,
                gstPercentage: latestEntry.gstPercentage !== undefined ? latestEntry.gstPercentage : item.gstPercentage
            });
        } else if (data.openingStock > 0) {
            // Fallback for simple openingStock if provided
            await updateStock(
                item.id,
                data.openingStock,
                'Opening',
                item.id,
                'Item',
                req.user.id,
                null,
                data.purchasePrice || 0,
                'Initial opening stock'
            );
        }

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/items/:id
router.put('/:id', auth, rbac('developer', 'admin', 'store'), audit('ITEM_UPDATE', 'Item'), async (req, res) => {
    try {
        const previous = await ItemRepository.findById(req.params.id);
        if (!previous) return res.status(404).json({ error: 'Item not found' });

        req.previousValue = previous;

        if (req.body.barcodeNumber && req.body.barcodeNumber !== previous.barcodeNumber) {
            const existingBarcode = await ItemRepository.findOne({ barcodeNumber: req.body.barcodeNumber });
            if (existingBarcode) {
                return res.status(400).json({ error: 'Barcode number already exists' });
            }
        }

        const item = await ItemRepository.update(req.params.id, req.body);
        req.newValue = item;
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/items/:id (soft delete)
router.delete('/:id', auth, rbac('developer', 'admin'), audit('ITEM_DELETE', 'Item'), async (req, res) => {
    try {
        const item = await ItemRepository.update(req.params.id, { isActive: false });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json({ message: 'Item deactivated', item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
