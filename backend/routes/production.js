const express = require('express');
const { ProductionRepository, ItemRepository, UserRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac, checkPermission } = require('../middleware/rbac');
const audit = require('../middleware/audit');
const { bulkUpdateStock } = require('../services/inventoryService');
const { generateBarcodeNumber } = require('../services/barcodeService');
const router = express.Router();

// Generate batch ID
async function generateBatchId() {
    const all = await ProductionRepository.findAll();
    const count = all.length;
    const date = new Date();
    return `BATCH${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(count + 1).padStart(5, '0')}`;
}

// GET /api/production
router.get('/', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
        let productions = await ProductionRepository.findAll();

        if (status) {
            productions = productions.filter(p => p.status === status);
        }
        if (startDate || endDate) {
            productions = productions.filter(p => {
                const d = new Date(p.productionDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        productions.sort((a, b) => new Date(b.productionDate) - new Date(a.productionDate));

        const total = productions.length;
        const paged = productions.slice((page - 1) * limit, page * limit);

        // Populate details
        for (let p of paged) {
            if (p.finishedProduct) {
                const product = await ItemRepository.findById(p.finishedProduct);
                p.finishedProduct = product ? { itemName: product.itemName, itemCode: product.itemCode, barcodeNumber: product.barcodeNumber } : null;
            }
            if (p.createdBy) {
                const user = await UserRepository.findById(p.createdBy);
                p.createdBy = user ? { name: user.name } : null;
            }
            if (p.approvedBy) {
                const user = await UserRepository.findById(p.approvedBy);
                p.approvedBy = user ? { name: user.name } : null;
            }
        }

        res.json({ productions: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/production/:id
router.get('/:id', auth, rbac('developer', 'admin', 'store'), async (req, res) => {
    try {
        const production = await ProductionRepository.findById(req.params.id);
        if (!production) return res.status(404).json({ error: 'Production batch not found' });

        if (production.finishedProduct) {
            production.finishedProduct = await ItemRepository.findById(production.finishedProduct);
        }
        if (production.rawMaterials) {
            for (let m of production.rawMaterials) {
                if (m.rawMaterial) {
                    m.rawMaterial = await ItemRepository.findById(m.rawMaterial);
                }
            }
        }
        if (production.createdBy) {
            const user = await UserRepository.findById(production.createdBy);
            production.createdBy = user ? { name: user.name } : null;
        }
        if (production.approvedBy) {
            const user = await UserRepository.findById(production.approvedBy);
            production.approvedBy = user ? { name: user.name } : null;
        }

        res.json(production);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/production
router.post('/', auth, rbac('developer', 'admin'), audit('PRODUCTION_CREATE', 'Production'), async (req, res) => {
    try {
        const { finishedProduct, quantityProduced, rawMaterials, expiryDate, notes } = req.body;

        const product = await ItemRepository.findById(finishedProduct);
        if (!product) {
            return res.status(400).json({ error: 'Finished product not found' });
        }
        if (product.itemType === 'Raw Material') {
            return res.status(400).json({ error: 'Cannot produce a raw material. Must be Finished Medicine or Both.' });
        }

        const processedMaterials = [];
        for (const mat of rawMaterials) {
            const rawItem = await ItemRepository.findById(mat.rawMaterial);
            if (!rawItem) {
                return res.status(400).json({ error: `Raw material not found: ${mat.rawMaterial}` });
            }
            const requiredQty = mat.quantity * quantityProduced;
            if (rawItem.currentStock < requiredQty) {
                return res.status(400).json({
                    error: `Insufficient raw material: ${rawItem.itemName}. Available: ${rawItem.currentStock}, Required: ${requiredQty}`
                });
            }
            processedMaterials.push({
                rawMaterial: rawItem.id,
                itemName: rawItem.itemName,
                itemCode: rawItem.itemCode,
                quantity: requiredQty,
                unitOfMeasure: rawItem.unitOfMeasure
            });
        }

        const batchId = await generateBatchId();
        const productBarcode = product.barcodeNumber || generateBarcodeNumber();

        const productionData = {
            batchId,
            finishedProduct: product.id,
            productName: product.itemName,
            productBarcode,
            quantityProduced,
            rawMaterials: processedMaterials,
            expiryDate,
            notes,
            status: 'Completed',
            createdBy: req.user.id,
            approvedBy: req.user.id,
            productionDate: new Date()
        };

        const production = await ProductionRepository.create(productionData);

        // Deduct raw materials
        await bulkUpdateStock(
            processedMaterials.map(m => ({ item: m.rawMaterial, quantity: m.quantity })),
            'Production_Out',
            production.id,
            'Production',
            req.user.id
        );

        // Add finished goods
        await bulkUpdateStock(
            [{ item: product.id, quantity: quantityProduced }],
            'Production_In',
            production.id,
            'Production',
            req.user.id
        );

        res.status(201).json(production);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
