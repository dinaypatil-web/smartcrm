const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { UserRepository, EntityRepository } = require('../repositories');
const config = require('../config/env');
const audit = require('../middleware/audit');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// POST /api/auth/register — Admin creates users in their entity, Developer creates admins
router.post('/register', auth, rbac('developer', 'admin'), [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['developer', 'admin', 'doctor', 'store']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, role, phone, accessStart, accessEnd, permissions, entity } = req.body;

        // Role creation rules
        if (req.user.role === 'admin') {
            if (['developer', 'admin'].includes(role)) {
                return res.status(403).json({ error: 'Admin can only create doctor or store users' });
            }
            if (!req.user.entity) {
                return res.status(400).json({ error: 'Admin must belong to an entity' });
            }
        }

        if (req.user.role === 'developer' && role === 'admin' && !entity) {
            return res.status(400).json({ error: 'Entity is required when creating admin users' });
        }

        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Determine entity for new user
        let userEntity = null;
        if (req.user.role === 'admin') {
            userEntity = req.user.entity;

            // Check max users limit
            const entityDoc = await EntityRepository.findById(userEntity);
            if (entityDoc) {
                // Count current users in Firestore
                const users = await UserRepository.findAll();
                const currentUsers = users.filter(u => u.entity === userEntity && u.isActive).length;
                if (currentUsers >= entityDoc.maxUsers) {
                    return res.status(400).json({ error: `Maximum user limit (${entityDoc.maxUsers}) reached for this entity` });
                }
            }
        } else if (role !== 'developer') {
            userEntity = entity || null;
            if (userEntity) {
                const entityDoc = await EntityRepository.findById(userEntity);
                if (!entityDoc) return res.status(400).json({ error: 'Entity not found' });
                if (!EntityRepository.isValid(entityDoc)) return res.status(400).json({ error: 'Entity is expired or inactive' });
            }
        }

        const user = await UserRepository.create({
            name, email, password, role, phone, accessStart, accessEnd, permissions,
            entity: userEntity,
            isActive: true
        });

        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await UserRepository.findByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await UserRepository.comparePassword(user, password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Fetch entity for validation
        const entityDoc = user.entity ? await EntityRepository.findById(user.entity) : null;

        // Check user + entity validity
        if (!UserRepository.isAccessValid(user, entityDoc)) {
            let message = 'Your account is not active. Contact administrator.';
            if (user.accessEnd && new Date() > user.accessEnd) {
                message = 'Your access has expired. Contact administrator.';
            } else if (entityDoc && !EntityRepository.isValid(entityDoc)) {
                message = 'Your organization\'s subscription has expired. Contact system administrator.';
            }
            return res.status(403).json({ error: 'Access denied', message });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, entity: user.entity },
            config.jwtSecret,
            { expiresIn: config.jwtExpire }
        );
        const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire });

        await UserRepository.update(user.id, {
            refreshToken,
            lastLogin: new Date()
        });

        const loggedInUser = { ...user, entity: entityDoc };
        delete loggedInUser.password;
        delete loggedInUser.refreshToken;
        delete loggedInUser.resetPasswordToken;
        delete loggedInUser.resetPasswordExpires;

        res.json({
            user: loggedInUser,
            token,
            refreshToken
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
        const user = await UserRepository.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const entityDoc = user.entity ? await EntityRepository.findById(user.entity) : null;
        if (!UserRepository.isAccessValid(user, entityDoc)) {
            return res.status(403).json({ error: 'Access expired' });
        }

        const newToken = jwt.sign(
            { id: user.id, role: user.role, entity: user.entity },
            config.jwtSecret,
            { expiresIn: config.jwtExpire }
        );
        const newRefreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire });

        await UserRepository.update(user.id, { refreshToken: newRefreshToken });

        res.json({ token: newToken, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await UserRepository.findByEmail(req.body.email);
        if (!user || !user.isActive) {
            return res.json({ message: 'If this email is registered, a reset token has been generated.' });
        }

        const resetToken = await UserRepository.generateResetToken(user.id);

        // Try sending email
        let emailSent = false;
        try {
            const notificationService = require('../services/notificationService');
            if (config.email.user && config.email.user !== 'your_email@gmail.com') {
                await notificationService.sendEmail(
                    user.email,
                    'Ayurveda ERP — Password Reset',
                    `Your password reset token is: ${resetToken}\n\nThis token expires in 1 hour.\n\nIf you did not request this, please ignore this email.`
                );
                emailSent = true;
            }
        } catch (emailErr) {
            console.log('Email not configured, showing token in response');
        }

        const response = { message: 'Password reset token generated. Valid for 1 hour.' };
        if (!emailSent) {
            response.resetToken = resetToken;
            response.note = 'Email not configured — token shown here for development';
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');

        // Find user by reset token in Firestore
        const user = await UserRepository.findOne({
            resetPasswordToken: hashedToken,
        });

        if (!user || !user.resetPasswordExpires || new Date(user.resetPasswordExpires._seconds * 1000) < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        await UserRepository.update(user.id, {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
            refreshToken: null
        });

        res.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
