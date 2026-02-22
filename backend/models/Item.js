const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    itemName: { type: String, required: true, trim: true },
    itemCode: { type: String, required: true, unique: true, trim: true },
    barcodeNumber: { type: String, unique: true, sparse: true, trim: true },
    itemType: {
        type: String,
        enum: ['Raw Material', 'Finished Medicine', 'Both'],
        required: true
    },
    category: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true },
    gstPercentage: { type: Number, default: 0, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    lowStockLevel: { type: Number, default: 10, min: 0 },
    fixedDiscount: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, default: 0, min: 0, max: 100 }
    },
    unitOfMeasure: { type: String, default: 'Nos', trim: true },
    batchEnabled: { type: Boolean, default: false },
    currentStock: { type: Number, default: 0 },
    openingStock: { type: Number, default: 0 },
    openingStockEntries: [{
        quantity: Number,
        landedPrice: Number,
        mrp: Number,
        sellingPrice: Number,
        salesDiscount: Number,
        gstPercentage: Number,
        netPrice: Number,
        netAmount: Number,
        batchNumber: String,
        expiryDate: Date,
        createdAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true },
    manufacturer: { type: String, trim: true },
    description: { type: String, trim: true }
}, { timestamps: true });

// Indexes for fast barcode/item lookup
itemSchema.index({ barcodeNumber: 1 });
itemSchema.index({ itemCode: 1 });
itemSchema.index({ itemName: 'text', category: 'text' });
itemSchema.index({ category: 1 });
itemSchema.index({ itemType: 1 });

module.exports = mongoose.model('Item', itemSchema);
