const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    itemCode: String,
    barcodeNumber: String,
    hsnCode: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['fixed', 'variable'], default: 'fixed' },
    gstPercentage: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    batchNumber: String
});

const saleSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    customer: {
        name: { type: String, default: 'Walk-in Customer' },
        phone: String,
        gstin: String,
        address: String
    },
    saleDate: { type: Date, default: Date.now },
    items: [saleItemSchema],
    grossTotal: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    totalGST: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Bank Transfer'],
        default: 'Cash'
    },
    prescriptionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    notes: String,
    isReturn: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

saleSchema.index({ saleDate: -1 });
saleSchema.index({ invoiceNumber: 1 });
saleSchema.index({ 'customer.phone': 1 });
saleSchema.index({ 'items.barcodeNumber': 1 });

module.exports = mongoose.model('Sale', saleSchema);
