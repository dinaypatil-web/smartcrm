const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['PRICE_EDIT', 'DISCOUNT_OVERRIDE', 'STOCK_ADJUSTMENT', 'USER_ACCESS_CHANGE',
            'ITEM_CREATE', 'ITEM_UPDATE', 'ITEM_DELETE', 'SALE_CREATE', 'SALE_VOID',
            'PURCHASE_CREATE', 'PRODUCTION_CREATE', 'PRODUCTION_APPROVE', 'LOGIN', 'LOGOUT']
    },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    details: { type: mongoose.Schema.Types.Mixed },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ipAddress: String
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
