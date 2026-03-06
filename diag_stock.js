const firebase = require('./backend/config/firebase');
const { ItemRepository, InventoryLedgerRepository } = require('./backend/repositories');

async function checkStock() {
    const db = firebase.getDb();
    if (!db) {
        console.error('Firestore not initialized');
        return;
    }

    console.log('Fetching items and ledger...');
    const items = await ItemRepository.findAll();
    const allLedger = await InventoryLedgerRepository.findAll();

    console.log(`Checking ${items.length} items and ${allLedger.length} ledger entries...`);

    let totalDiscrepancies = 0;
    let batchIssues = 0;

    for (const item of items) {
        const itemLedger = allLedger.filter(l => l.item === item.id);

        // 1. Check Global Stock Consistency
        const calculatedStock = itemLedger.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);

        if (Math.abs(item.currentStock - calculatedStock) > 0.001) {
            totalDiscrepancies++;
            console.log(`❌ STOCK DESYNC for [${item.itemCode}] ${item.itemName}:`);
            console.log(`   Document: ${item.currentStock}, Ledger Sum: ${calculatedStock}, Diff: ${item.currentStock - calculatedStock}`);
        }

        // 2. Check Batch-wise Consistency
        const batches = {};
        itemLedger.forEach(entry => {
            const b = entry.batchNumber || 'NO_BATCH';
            batches[b] = (batches[b] || 0) + (Number(entry.quantity) || 0);
        });

        const negativeBatches = Object.entries(batches).filter(([b, qty]) => qty < 0);
        if (negativeBatches.length > 0) {
            batchIssues++;
            console.log(`⚠️  NEGATIVE BATCHES for [${item.itemCode}] ${item.itemName}:`);
            negativeBatches.forEach(([b, qty]) => {
                console.log(`   Batch: ${b}, Qty: ${qty}`);
            });
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Total items checked: ${items.length}`);
    console.log(`Items with stock desync (Global vs Ledger): ${totalDiscrepancies}`);
    console.log(`Items with negative batches: ${batchIssues}`);

    process.exit(0);
}

checkStock().catch(err => {
    console.error(err);
    process.exit(1);
});
