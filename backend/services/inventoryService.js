const { ItemRepository, InventoryLedgerRepository, NotificationRepository } = require('../repositories');

/**
 * Update stock for an item and create ledger entry
 */
async function updateStock(itemId, quantity, transactionType, referenceId, referenceType, userId, batchNumber = null, rate = 0, notes = '') {
    if (!itemId || typeof itemId !== 'string') {
        console.error(`[InventoryService] INVALID itemId: ${itemId} (type: ${typeof itemId})`);
        throw new Error(`Invalid item ID: ${itemId}`);
    }

    console.log(`[InventoryService] updateStock: itemId=${itemId}, quantity=${quantity}, type=${transactionType}, refId=${referenceId}`);
    const item = await ItemRepository.findById(itemId);
    if (!item) {
        console.error(`[InventoryService] Item NOT FOUND in database: ${itemId}`);
        throw new Error(`Item not found in database: ${itemId}`);
    }

    const previousStock = item.currentStock || 0;
    const newStock = previousStock + quantity; // positive = add, negative = deduct

    if (newStock < 0 && (transactionType === 'Sale' || transactionType === 'Production_Out')) {
        throw new Error(`Insufficient stock for ${item.itemName}. Available: ${previousStock}, Required: ${Math.abs(quantity)}`);
    }

    await ItemRepository.update(itemId, { currentStock: newStock });

    // Create ledger entry
    await InventoryLedgerRepository.create({
        item: itemId,
        itemCode: item.itemCode,
        barcodeNumber: item.barcodeNumber,
        transactionType,
        quantity,
        balanceAfter: newStock,
        referenceId,
        referenceType,
        batchNumber,
        rate,
        notes,
        createdBy: userId,
        createdAt: new Date()
    });

    // Check low stock alert
    if (newStock <= (item.lowStockLevel || 0) && newStock >= 0) {
        await createLowStockAlert(item, newStock);
    }

    return { ...item, currentStock: newStock };
}

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
            entry.notes
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
            `Reversal of ${transactionType} ${referenceId}`
        );
        results.push(result);
    }
    return results;
}

module.exports = { updateStock, bulkUpdateStock, revertBulkUpdateStock, getMonthlyStockSummary };
