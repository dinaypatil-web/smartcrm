const mongoose = require('mongoose');

const bomItemSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    itemCode: String,
    quantity: { type: Number, required: true, min: 0 },
    unitOfMeasure: String
});

const productionSchema = new mongoose.Schema({
    batchId: { type: String, required: true, unique: true },
    finishedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    productName: String,
    productBarcode: String,
    quantityProduced: { type: Number, required: true, min: 1 },
    rawMaterials: [bomItemSchema],
    productionDate: { type: Date, default: Date.now },
    expiryDate: Date,
    manufacturingDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Planned'
    },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

productionSchema.index({ batchId: 1 });
productionSchema.index({ finishedProduct: 1 });
productionSchema.index({ productionDate: -1 });

module.exports = mongoose.model('Production', productionSchema);
