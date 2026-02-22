const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { UserRepository, EntityRepository } = require('../repositories');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await UserRepository.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Load entity if user belongs to one
        let entityDoc = null;
        if (user.entity) {
            entityDoc = await EntityRepository.findById(user.entity);
        }

        if (!UserRepository.isAccessValid(user, entityDoc)) {
            if (entityDoc && !EntityRepository.isValid(entityDoc)) {
                return res.status(403).json({
                    error: 'Organization subscription expired. Contact system administrator.'
                });
            }
            return res.status(403).json({
                error: 'Access expired or not yet active. Contact administrator.'
            });
        }

        req.user = user;
        req.entity = entityDoc;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};

module.exports = auth;
