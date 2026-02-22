const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const barcodeService = require('../services/barcodeService');
const { ItemRepository } = require('../repositories');

// Generate barcode image (PNG)
router.get('/generate/:code', auth, async (req, res) => {
    try {
        const { code } = req.params;
        const format = req.query.format || 'code128';
        const png = await barcodeService.generateBarcode(code, format);
        res.set('Content-Type', 'image/png');
        res.send(png);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate unique barcode number
router.post('/generate-number', auth, rbac('admin', 'store'), async (req, res) => {
    try {
        const number = barcodeService.generateBarcodeNumber();
        res.json({ barcodeNumber: number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk assign barcodes to items without one
router.post('/bulk-assign', auth, rbac('admin'), async (req, res) => {
    try {
        const items = await ItemRepository.findAll();
        const unassigned = items.filter(i => (!i.barcodeNumber || i.barcodeNumber === '') && i.isActive);

        let assigned = 0;
        for (const item of unassigned) {
            await ItemRepository.update(item.id, {
                barcodeNumber: barcodeService.generateBarcodeNumber()
            });
            assigned++;
        }
        res.json({ message: `Assigned barcodes to ${assigned} items`, assigned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get label data for printing
router.get('/labels', auth, async (req, res) => {
    try {
        const { itemIds } = req.query;
        const ids = itemIds ? itemIds.split(',') : [];
        if (ids.length === 0) return res.json([]);

        const allItems = await ItemRepository.findAll();
        const items = allItems.filter(i => ids.includes(i.id) && i.isActive);

        const result = items.map(i => ({
            id: i.id,
            itemName: i.itemName,
            itemCode: i.itemCode,
            barcodeNumber: i.barcodeNumber,
            mrp: i.mrp,
            sellingPrice: i.sellingPrice,
            category: i.category
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
