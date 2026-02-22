const express = require('express');
const { body, validationResult } = require('express-validator');
const { UserRepository, EntityRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// GET /api/users — List users
router.get('/', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const { role, isActive, page = 1, limit = 20 } = req.query;
        let users = await UserRepository.findAll();

        if (role) users = users.filter(u => u.role === role);
        if (isActive !== undefined) users = users.filter(u => u.isActive === (isActive === 'true'));

        if (req.user.role === 'admin') {
            users = users.filter(u => u.entity === req.user.entity);
        }

        // Simulate population for entity
        for (let user of users) {
            if (user.entity) {
                user.entity = await EntityRepository.findById(user.entity);
            }
        }

        // Sorting and Pagination (in-memory for now as Firestore indexing varies)
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = users.length;
        const pagedUsers = users.slice((page - 1) * limit, page * limit);

        // Sanitize output
        pagedUsers.forEach(u => {
            delete u.password;
            delete u.refreshToken;
            delete u.resetPasswordToken;
            delete u.resetPasswordExpires;
        });

        res.json({ users: pagedUsers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/me — Current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await UserRepository.findById(req.user.id);
        if (user.entity) {
            user.entity = await EntityRepository.findById(user.entity);
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/profile — Edit own profile
router.put('/profile', auth, [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = {};
        const allowedFields = ['name', 'phone', 'profileImage'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (req.body.email && req.body.email !== req.user.email) {
            const existing = await UserRepository.findByEmail(req.body.email);
            if (existing) return res.status(400).json({ error: 'Email already in use' });
            updates.email = req.body.email;
        }

        const user = await UserRepository.update(req.user.id, updates);
        if (user.entity) {
            user.entity = await EntityRepository.findById(user.entity);
        }
        res.json({ message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/change-password
router.put('/change-password', auth, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const isMatch = await UserRepository.comparePassword(req.user, req.body.currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

        await UserRepository.update(req.user.id, { password: hashedPassword });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/:id
router.get('/:id', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const user = await UserRepository.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (req.user.role === 'admin' && user.entity !== req.user.entity) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (user.entity) {
            user.entity = await EntityRepository.findById(user.entity);
        }

        delete user.password;
        delete user.refreshToken;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id
router.put('/:id', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const updates = { ...req.body };
        delete updates.password;
        delete updates.refreshToken;
        delete updates.resetPasswordToken;

        const targetUser = await UserRepository.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (req.user.role === 'admin') {
            if (targetUser.entity !== req.user.entity) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (updates.role && ['developer', 'admin'].includes(updates.role)) {
                return res.status(403).json({ error: 'Cannot assign this role' });
            }
            delete updates.entity;
        }

        const user = await UserRepository.update(req.params.id, updates);
        if (user.entity) {
            user.entity = await EntityRepository.findById(user.entity);
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', auth, rbac('developer', 'admin'), async (req, res) => {
    try {
        const targetUser = await UserRepository.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (req.user.role === 'admin') {
            if (targetUser.entity !== req.user.entity) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (['developer', 'admin'].includes(targetUser.role)) {
                return res.status(403).json({ error: 'Cannot deactivate this user' });
            }
        }

        const user = await UserRepository.update(req.params.id, { isActive: false });
        res.json({ message: 'User deactivated', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
