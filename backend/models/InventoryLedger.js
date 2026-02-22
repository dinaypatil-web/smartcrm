const mongoose = require('mongoose');

const inventoryLedgerSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemCode: String,
    barcodeNumber: String,
    transactionType: {
        type: String,
        enum: ['Purchase', 'Sale', 'Production_In', 'Production_Out', 'Adjustment', 'Opening', 'Purchase_Reversed', 'Sale_Reversed', 'Production_In_Reversed', 'Production_Out_Reversed'],
        required: true
    },
    quantity: { type: Number, required: true },       // positive = in, negative = out
    balanceAfter: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceType: { type: String },                  // 'Purchase', 'Sale', 'Production'
    batchNumber: String,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

inventoryLedgerSchema.index({ item: 1, createdAt: -1 });
inventoryLedgerSchema.index({ barcodeNumber: 1 });
inventoryLedgerSchema.index({ transactionType: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLedger', inventoryLedgerSchema);
