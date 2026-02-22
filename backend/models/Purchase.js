const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    itemCode: String,
    barcodeNumber: String,
    hsnCode: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    grossPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    landedPrice: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    saleDiscount: { type: Number, default: 0 },
    batchNumber: String,
    expiryDate: Date,
    manufacturingDate: Date
});

const purchaseSchema = new mongoose.Schema({
    purchaseNumber: { type: String, required: true, unique: true },
    supplier: {
        name: { type: String, required: true },
        gstin: String,
        address: String,
        phone: String
    },
    purchaseDate: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    subtotal: { type: Number, required: true },
    totalGST: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Credit'],
        default: 'Cash'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Partial', 'Unpaid'],
        default: 'Paid'
    },
    invoiceNumber: String,
    notes: String,
    freight: { type: Number, default: 0 },
    packingForwarding: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ 'supplier.name': 1 });
purchaseSchema.index({ purchaseNumber: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
