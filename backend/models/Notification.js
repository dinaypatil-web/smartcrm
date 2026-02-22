const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['LOW_STOCK', 'EXPIRY_ALERT', 'PRODUCTION_SHORTAGE', 'ACCESS_EXPIRY', 'SYSTEM'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },
    relatedEntity: {
        type: { type: String },
        id: { type: mongoose.Schema.Types.ObjectId }
    },
    channels: {
        email: { sent: Boolean, sentAt: Date },
        sms: { sent: Boolean, sentAt: Date },
        whatsapp: { sent: Boolean, sentAt: Date }
    },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isRead: { type: Boolean, default: false },
    readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: Date }]
}, { timestamps: true });

notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
