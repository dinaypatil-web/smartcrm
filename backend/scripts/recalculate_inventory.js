const { getDb } = require('../config/firebase');

async function recalculateStock() {
    const db = getDb();
    if (!db) {
        console.error('Failed to connect to Firestore');
        process.exit(1);
    }

    console.log('--- Inventory Recalculation Started ---');
    const itemsSnapshot = await db.collection('items').get();
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Found ${items.length} items to process.`);

    for (const item of items) {
        process.stdout.write(`Processing: ${item.itemName} (${item.itemCode})... `);

        try {
            // Get all ledger entries for this item
            const ledgerSnapshot = await db.collection('inventory_ledger')
                .where('item', '==', item.id)
                .get();

            let totalCalculatedStock = 0;
            let totalOpeningStock = 0;

            ledgerSnapshot.forEach(doc => {
                const data = doc.data();
                const qty = Number(data.quantity) || 0;
                totalCalculatedStock += qty;

                if (data.transactionType === 'Opening') {
                    totalOpeningStock += qty;
                }
            });

            const stockMismatch = totalCalculatedStock !== (item.currentStock || 0);
            const openingMismatch = totalOpeningStock !== (item.openingStock || 0);

            if (stockMismatch || openingMismatch) {
                console.log(`MISMATCH!`);
                console.log(`   Stock: Ledger ${totalCalculatedStock} vs Current ${item.currentStock || 0}`);
                console.log(`   Opening: Ledger ${totalOpeningStock} vs Current ${item.openingStock || 0}`);

                await db.collection('items').doc(item.id).update({
                    currentStock: totalCalculatedStock,
                    openingStock: totalOpeningStock
                });
                console.log(`   --> Updated ${item.itemName} fields.`);
            } else {
                console.log('OK');
            }
        } catch (err) {
            console.error(`\nError processing ${item.itemName}:`, err.message);
        }
    }

    console.log('--- Inventory Recalculation Finished ---');
    process.exit(0);
}

recalculateStock();
