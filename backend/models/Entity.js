const mongoose = require('mongoose');

const entitySchema = new mongoose.Schema({
    entityName: { type: String, required: true, trim: true },
    entityCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    entityType: {
        type: String,
        enum: ['Clinic', 'Store', 'Manufacturing', 'All'],
        default: 'All'
    },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    gstin: { type: String, trim: true },
    validFrom: { type: Date, required: true, default: Date.now },
    validTo: { type: Date, required: true },
    maxUsers: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true }
}, { timestamps: true });

entitySchema.methods.isValid = function () {
    const now = new Date();
    if (!this.isActive) return false;
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validTo && now > this.validTo) return false;
    return true;
};

entitySchema.index({ entityCode: 1 });
entitySchema.index({ isActive: 1, validTo: 1 });

module.exports = mongoose.model('Entity', entitySchema);
