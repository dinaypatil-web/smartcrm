const { ItemRepository, InventoryLedgerRepository, NotificationRepository } = require('../repositories');

/**
 * Update stock for an item and create ledger entry using Firestore Transaction for atomicity
 */
async function updateStock(itemId, quantity, transactionType, referenceId, referenceType, userId, batchNumber = null, rate = 0, notes = '', expiryDate = null) {
    if (!itemId || typeof itemId !== 'string') {
        throw new Error(`Invalid item ID: ${itemId}`);
    }

    const { getDb } = require('../config/firebase');
    const db = getDb();
    let updatedItem = null;

    await db.runTransaction(async (transaction) => {
        const itemRef = db.collection('items').doc(itemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists) throw new Error(`Item not found: ${itemId}`);
        const item = itemDoc.data();
        item.id = itemDoc.id;

        const previousStock = item.currentStock || 0;
        let newStock = previousStock + quantity;

        if (newStock < 0 && (transactionType === 'Sale' || transactionType === 'Production_Out')) {
            throw new Error(`Insufficient stock for ${item.itemName}. Available: ${previousStock}, Required: ${Math.abs(quantity)}`);
        }

        // FEFO Logic: If deduction and no batchNumber, try to find the best batch
        let finalBatchNumber = batchNumber;
        let finalExpiryDate = expiryDate;

        if (quantity < 0 && !batchNumber && (transactionType === 'Sale' || transactionType === 'Production_Out')) {
            // Find most recent batches with stock
            const ledgerSnapshot = await transaction.get(
                db.collection('inventory_ledger')
                    .where('item', '==', itemId)
                    .orderBy('expiryDate', 'asc') // First Expiring
            );

            const batchStock = {};
            ledgerSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const b = data.batchNumber;
                if (b) {
                    batchStock[b] = (batchStock[b] || 0) + data.quantity;
                    // Keep track of earliest expiry for this batch
                    if (!batchesInfo[b] || (data.expiryDate && (!batchesInfo[b].expiryDate || data.expiryDate < batchesInfo[b].expiryDate))) {
                        batchesInfo[b] = { expiryDate: data.expiryDate };
                    }
                }
            });

            // Find first batch with positive stock
            const availableBatches = Object.keys(batchStock)
                .filter(b => batchStock[b] > 0)
                .sort((a, b) => {
                    const expiryA = batchesInfo[a]?.expiryDate || '9999';
                    const expiryB = batchesInfo[b]?.expiryDate || '9999';
                    return expiryA.localeCompare(expiryB);
                });

            if (availableBatches.length > 0) {
                finalBatchNumber = availableBatches[0];
                finalExpiryDate = batchesInfo[finalBatchNumber].expiryDate || null;
            }
        }

        // Apply item update
        transaction.update(itemRef, {
            currentStock: newStock,
            updatedAt: new Date()
        });

        // Create ledger entry
        const ledgerRef = db.collection('inventory_ledger').doc();
        transaction.set(ledgerRef, {
            item: itemId,
            itemCode: item.itemCode,
            barcodeNumber: item.barcodeNumber,
            transactionType,
            quantity,
            balanceAfter: newStock,
            referenceId,
            referenceType,
            batchNumber: finalBatchNumber,
            expiryDate: finalExpiryDate,
            rate,
            notes,
            createdBy: userId,
            createdAt: new Date()
        });

        updatedItem = { ...item, currentStock: newStock };
    });

    // Check low stock alert
    if (updatedItem.currentStock <= (updatedItem.lowStockLevel || 0) && updatedItem.currentStock >= 0) {
        await createLowStockAlert(updatedItem, updatedItem.currentStock);
    }

    return updatedItem;
}

// Local helper for FEFO info tracking
const batchesInfo = {};

/**
 * Bulk update stock for multiple items (used in purchase/sale)
 */
async function bulkUpdateStock(items, transactionType, referenceId, referenceType, userId) {
    const results = [];
    for (const entry of items) {
        const itemBody = entry.item && typeof entry.item === 'object' ? entry.item.id || entry.item._id : entry.item;
        const quantity = transactionType === 'Sale' || transactionType === 'Production_Out'
            ? -Math.abs(entry.quantity)
            : Math.abs(entry.quantity);

        const result = await updateStock(
            itemBody,
            quantity,
            transactionType,
            referenceId,
            referenceType,
            userId,
            entry.batchNumber,
            entry.landedPrice || entry.unitPrice || 0,
            entry.notes,
            entry.expiryDate
        );
        results.push(result);
    }
    return results;
}

/**
 * Get stock summary for monthly report
 */
async function getMonthlyStockSummary(itemId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const allLedgers = await InventoryLedgerRepository.findAll();
    const itemLedgers = allLedgers.filter(l => l.item === itemId);

    // Get opening stock (balance at start of month)
    const sortedBefore = itemLedgers
        .filter(l => new Date(l.createdAt) < startDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const openingStock = sortedBefore.length > 0 ? sortedBefore[0].balanceAfter : 0;

    // Get all transactions for the month
    const ledgerEntries = itemLedgers.filter(l => {
        const d = new Date(l.createdAt);
        return d >= startDate && d <= endDate;
    });

    const summary = {
        openingStock,
        purchases: 0,
        sales: 0,
        rawMaterialConsumption: 0,
        production: 0,
        adjustments: 0,
        closingStock: 0
    };

    ledgerEntries.forEach(entry => {
        switch (entry.transactionType) {
            case 'Purchase': summary.purchases += entry.quantity; break;
            case 'Sale': summary.sales += Math.abs(entry.quantity); break;
            case 'Production_Out': summary.rawMaterialConsumption += Math.abs(entry.quantity); break;
            case 'Production_In': summary.production += entry.quantity; break;
            case 'Adjustment': summary.adjustments += entry.quantity; break;
        }
    });

    summary.closingStock = openingStock + summary.purchases - summary.sales
        - summary.rawMaterialConsumption + summary.production + summary.adjustments;

    return summary;
}

/**
 * Create low stock alert notification
 */
async function createLowStockAlert(item, currentStock) {
    const allNotifications = await NotificationRepository.findAll();
    const existing = allNotifications.find(n =>
        n.type === 'LOW_STOCK' &&
        n.relatedEntity?.id === item.id &&
        (new Date() - new Date(n.createdAt)) < (24 * 60 * 60 * 1000)
    );

    if (existing) return; // Don't create duplicate alerts

    await NotificationRepository.create({
        type: 'LOW_STOCK',
        title: `Low Stock: ${item.itemName}`,
        message: `${item.itemName} (${item.itemCode}) stock is at ${currentStock} ${item.unitOfMeasure || 'units'}. Low stock level: ${item.lowStockLevel}`,
        severity: currentStock === 0 ? 'critical' : 'warning',
        relatedEntity: { type: 'Item', id: item.id },
        createdAt: new Date()
    });
}

/**
 * Revert stock changes for a transaction (used on deletion)
 */
async function revertBulkUpdateStock(items, transactionType, referenceId, referenceType, userId) {
    console.log(`[InventoryService] revertBulkUpdateStock: type=${transactionType}, refId=${referenceId}, itemsCount=${items?.length}`);
    const results = [];
    if (!items || !Array.isArray(items)) {
        console.warn(`[InventoryService] No items to revert for ${transactionType} ${referenceId}`);
        return results;
    }

    for (const entry of items) {
        // Robust ID extraction
        let itemBody = entry.item;
        if (entry.item && typeof entry.item === 'object') {
            itemBody = entry.item.id || entry.item._id || entry.item.item;
        }

        if (!itemBody) {
            console.error(`[InventoryService] Could not find item ID in entry:`, JSON.stringify(entry));
            continue; // or throw? Let's skip and log to avoid total failure if one item is corrupt
        }

        // Flip the logic of bulkUpdateStock
        // If it was Sale (deduction), we ADD back (positive)
        // If it was Purchase (addition), we DEDUCT (negative)
        const quantity = transactionType === 'Sale' || transactionType === 'Production_Out'
            ? Math.abs(entry.quantity)
            : -Math.abs(entry.quantity);

        const result = await updateStock(
            itemBody,
            quantity,
            transactionType + '_Reversed',
            referenceId,
            referenceType,
            userId,
            entry.batchNumber,
            entry.landedPrice || entry.unitPrice || 0,
            `Reversal of ${transactionType} ${referenceId}`,
            entry.expiryDate
        );
        results.push(result);
    }
    return results;
}

module.exports = { updateStock, bulkUpdateStock, revertBulkUpdateStock, getMonthlyStockSummary };
