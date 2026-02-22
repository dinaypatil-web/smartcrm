const { getDb } = require('../config/firebase');

async function rebuildInventory() {
    const db = getDb();
    if (!db) {
        console.error('Failed to connect to Firestore');
        process.exit(1);
    }

    console.log('--- Inventory Rebuild Started ---');

    // 1. Fetch all items to keep track of current stock locally
    const itemsSnapshot = await db.collection('items').get();
    const itemStockMap = {};
    itemsSnapshot.forEach(doc => {
        itemStockMap[doc.id] = {
            currentStock: 0,
            itemCode: doc.data().itemCode,
            barcodeNumber: doc.data().barcodeNumber
        };
    });

    console.log(`Initialized ${Object.keys(itemStockMap).length} items.`);

    // 2. Fetch all Purchases and Sales
    const purchasesSnapshot = await db.collection('purchases').get();
    const salesSnapshot = await db.collection('sales').get();

    const transactions = [];

    purchasesSnapshot.forEach(doc => {
        const data = doc.data();
        transactions.push({
            id: doc.id,
            type: 'Purchase',
            date: data.purchaseDate ? (data.purchaseDate.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate)) : new Date(),
            items: data.items,
            createdBy: data.createdBy
        });
    });

    salesSnapshot.forEach(doc => {
        const data = doc.data();
        transactions.push({
            id: doc.id,
            type: 'Sale',
            date: data.saleDate ? (data.saleDate.toDate ? data.saleDate.toDate() : new Date(data.saleDate)) : new Date(),
            items: data.items,
            createdBy: data.createdBy
        });
    });

    // 3. Sort transactions by date
    transactions.sort((a, b) => a.date - b.date);

    console.log(`Processing ${transactions.length} transactions chronologically...`);

    const ledgerCollection = db.collection('inventory_ledger');

    for (const trx of transactions) {
        console.log(`Processing ${trx.type}: ${trx.id} (${trx.date.toISOString()})`);

        for (const lineItem of trx.items) {
            const itemId = lineItem.item;
            if (!itemId || !itemStockMap[itemId]) {
                console.warn(`   ⚠️ Item ${itemId} not found. Skipping line item.`);
                continue;
            }

            const qty = Number(lineItem.quantity) || 0;
            const signedQty = trx.type === 'Purchase' ? qty : -qty;

            itemStockMap[itemId].currentStock += signedQty;

            await ledgerCollection.add({
                item: itemId,
                itemCode: itemStockMap[itemId].itemCode,
                barcodeNumber: itemStockMap[itemId].barcodeNumber,
                transactionType: trx.type,
                quantity: signedQty,
                balanceAfter: itemStockMap[itemId].currentStock,
                referenceId: trx.id,
                referenceType: trx.type,
                batchNumber: lineItem.batchNumber || null,
                notes: `System rebuild from ${trx.type}`,
                createdBy: trx.createdBy || null,
                createdAt: trx.date, // Use transaction date for ledger order
                updatedAt: new Date()
            });
        }
    }

    // 4. Update items with finalized currentStock
    console.log('Updating Item Stock Levels...');
    const itemCollection = db.collection('items');
    for (const itemId in itemStockMap) {
        await itemCollection.doc(itemId).update({
            currentStock: itemStockMap[itemId].currentStock
        });
    }

    console.log('--- Inventory Rebuild Finished ---');
    process.exit(0);
}

rebuildInventory();
