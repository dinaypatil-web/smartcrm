const rolePermissions = {
    developer: {
        routes: ['*'],
        actions: ['*']
    },
    admin: {
        routes: ['dashboard', 'items', 'purchases', 'sales', 'inventory', 'production', 'reports', 'users', 'notifications', 'entities', 'profile'],
        actions: ['read', 'create', 'update', 'delete', 'approve', 'variableDiscount']
    },
    doctor: {
        routes: ['dashboard', 'prescriptions', 'profile'],
        actions: ['read', 'create', 'update']
    },
    store: {
        routes: ['dashboard', 'items', 'purchases', 'sales', 'inventory', 'pos', 'notifications', 'profile'],
        actions: ['read', 'create', 'update']
    },
    attendant: {
        routes: ['dashboard', 'appointments', 'profile'],
        actions: ['read', 'create', 'update']
    }
};

const rbac = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role;

        // Developer has access to everything
        if (userRole === 'developer') {
            return next();
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `Role '${userRole}' is not authorized for this action`
            });
        }

        next();
    };
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role === 'developer') return next();

        const perms = rolePermissions[req.user.role];
        if (perms.actions.includes('*') || perms.actions.includes(permission)) {
            return next();
        }

        // Check user-specific permissions
        if (permission === 'variableDiscount' && req.user.permissions?.variableDiscount) {
            return next();
        }
        if (permission === 'productionEntry' && req.user.permissions?.productionEntry) {
            return next();
        }

        return res.status(403).json({
            error: 'Permission denied',
            message: `You do not have '${permission}' permission`
        });
    };
};

// Middleware to ensure user operates within their own entity
const sameEntity = () => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role === 'developer') return next();

        // If the request targets an entity-scoped resource, verify it
        if (req.params.entityId && req.user.entity) {
            if (req.params.entityId !== req.user.entity.toString()) {
                return res.status(403).json({ error: 'Access denied — different entity' });
            }
        }

        next();
    };
};

module.exports = { rbac, checkPermission, rolePermissions, sameEntity };
