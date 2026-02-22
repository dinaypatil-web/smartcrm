const express = require('express');
const { body, validationResult } = require('express-validator');
const { EntityRepository, UserRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const audit = require('../middleware/audit');
const router = express.Router();

// GET /api/entities — Developer: list all entities
router.get('/', auth, rbac('developer'), async (req, res) => {
    try {
        const { search, isActive, page = 1, limit = 20 } = req.query;
        let entities = await EntityRepository.findAll();

        if (isActive !== undefined) {
            entities = entities.filter(e => e.isActive === (isActive === 'true'));
        }
        if (search) {
            const s = search.toLowerCase();
            entities = entities.filter(e =>
                (e.entityName && e.entityName.toLowerCase().includes(s)) ||
                (e.entityCode && e.entityCode.toLowerCase().includes(s)) ||
                (e.city && e.city.toLowerCase().includes(s))
            );
        }

        // Add user count and createdBy details
        const entitiesWithCounts = await Promise.all(entities.map(async (entity) => {
            const allUsers = await UserRepository.findAll();
            const userCount = allUsers.filter(u => u.entity === entity.id && u.isActive).length;
            const creator = entity.createdBy ? await UserRepository.findById(entity.createdBy) : null;
            return {
                ...entity,
                userCount,
                createdBy: creator ? { name: creator.name, email: creator.email } : null
            };
        }));

        entitiesWithCounts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = entitiesWithCounts.length;
        const pagedEntities = entitiesWithCounts.slice((page - 1) * limit, page * limit);

        res.json({ entities: pagedEntities, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/entities/:id
router.get('/:id', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const entity = await EntityRepository.findById(req.params.id);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        if (req.user.role === 'admin' && req.user.entity !== entity.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const creator = entity.createdBy ? await UserRepository.findById(entity.createdBy) : null;
        const allUsers = await UserRepository.findAll();
        const userCount = allUsers.filter(u => u.entity === entity.id && u.isActive).length;

        res.json({
            ...entity,
            userCount,
            createdBy: creator ? { name: creator.name, email: creator.email } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/entities — Developer only
router.post('/', auth, rbac('developer'), audit('ENTITY_CREATE', 'Entity'), [
    body('entityName').trim().notEmpty().withMessage('Entity name is required'),
    body('entityCode').trim().notEmpty().withMessage('Entity code is required'),
    body('entityType').isIn(['Clinic', 'Store', 'Manufacturing', 'All']).withMessage('Invalid entity type'),
    body('validFrom').isISO8601().withMessage('Valid start date required'),
    body('validTo').isISO8601().withMessage('Valid end date required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const existing = await EntityRepository.findByCode(req.body.entityCode.toUpperCase());
        if (existing) {
            return res.status(400).json({ error: 'Entity code already exists' });
        }

        if (new Date(req.body.validTo) <= new Date(req.body.validFrom)) {
            return res.status(400).json({ error: 'Valid To date must be after Valid From date' });
        }

        const entity = await EntityRepository.create({
            ...req.body,
            entityCode: req.body.entityCode.toUpperCase(),
            createdBy: req.user.id,
            isActive: true
        });

        res.status(201).json(entity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/entities/:id — Developer only
router.put('/:id', auth, rbac('developer'), audit('ENTITY_UPDATE', 'Entity'), async (req, res) => {
    try {
        const updates = { ...req.body };
        delete updates.createdBy;

        if (updates.validFrom && updates.validTo) {
            if (new Date(updates.validTo) <= new Date(updates.validFrom)) {
                return res.status(400).json({ error: 'Valid To date must be after Valid From date' });
            }
        }

        const entity = await EntityRepository.update(req.params.id, updates);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });
        res.json(entity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/entities/:id — Developer only (soft delete)
router.delete('/:id', auth, rbac('developer'), audit('ENTITY_DELETE', 'Entity'), async (req, res) => {
    try {
        const entity = await EntityRepository.update(req.params.id, { isActive: false });
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        // Deactivate all users in this entity
        const users = await UserRepository.findAll();
        const entityUsers = users.filter(u => u.entity === entity.id);
        for (const user of entityUsers) {
            await UserRepository.update(user.id, { isActive: false });
        }

        res.json({ message: 'Entity and its users deactivated', entity });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
