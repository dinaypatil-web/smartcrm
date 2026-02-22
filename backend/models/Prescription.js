const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
    medicineName: { type: String, required: true },
    itemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
    quantity: Number
});

const prescriptionSchema = new mongoose.Schema({
    prescriptionNumber: { type: String, required: true, unique: true },
    patient: {
        name: { type: String, required: true },
        age: Number,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        phone: String,
        address: String
    },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosis: String,
    medicines: [prescriptionItemSchema],
    prescriptionDate: { type: Date, default: Date.now },
    followUpDate: Date,
    notes: String,
    isDispensed: { type: Boolean, default: false },
    dispensedRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });

prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ doctor: 1, prescriptionDate: -1 });
prescriptionSchema.index({ 'patient.phone': 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
