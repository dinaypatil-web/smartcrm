const { AuditLogRepository } = require('../repositories');

const audit = (action, entityType) => {
    return async (req, res, next) => {
        const originalSend = res.json.bind(res);

        res.json = function (body) {
            // Only log successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                AuditLogRepository.create({
                    action,
                    entityType,
                    entityId: body?.id || body?.data?.id || body?._id, // Support both Firestore and potential legacy responses
                    user: req.user?.id || req.user?._id,
                    userName: req.user?.name,
                    details: {
                        method: req.method,
                        path: req.originalUrl,
                        body: sanitizeBody(req.body)
                    },
                    previousValue: req.previousValue,
                    newValue: req.newValue,
                    ipAddress: req.ip
                }).catch(err => console.error('Audit log error:', err));
            }

            return originalSend(body);
        };

        next();
    };
};

function sanitizeBody(body) {
    if (!body) return {};
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
}

module.exports = audit;
