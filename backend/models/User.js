const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: {
        type: String,
        enum: ['developer', 'admin', 'doctor', 'store'],
        required: true
    },
    entity: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', default: null },
    accessStart: { type: Date, default: Date.now },
    accessEnd: { type: Date },
    permissions: {
        variableDiscount: { type: Boolean, default: false },
        productionEntry: { type: Boolean, default: false },
        reportAccess: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    profileImage: { type: String, default: '' }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAccessValid = function (entityDoc) {
    const now = new Date();
    if (this.accessStart && now < this.accessStart) return false;
    if (this.accessEnd && now > this.accessEnd) return false;
    if (!this.isActive) return false;

    // If user has an entity, check entity validity too
    if (entityDoc) {
        if (!entityDoc.isActive) return false;
        if (entityDoc.validFrom && now < entityDoc.validFrom) return false;
        if (entityDoc.validTo && now > entityDoc.validTo) return false;
    }

    return true;
};

userSchema.methods.generateResetToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
};

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshToken;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
};

userSchema.index({ entity: 1 });
userSchema.index({ resetPasswordToken: 1 });

module.exports = mongoose.model('User', userSchema);
