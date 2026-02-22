const { PurchaseRepository } = require('./repositories');
const firebase = require('./config/firebase');

async function testUpdate() {
    console.log('--- Purchase Update Diagnostic ---');
    try {
        const all = await PurchaseRepository.findAll();
        if (all.length === 0) {
            console.log('No purchases found to update.');
            process.exit(0);
        }

        const purchase = all[0];
        console.log(`Updating Purchase: ${purchase.purchaseNumber} (ID: ${purchase.id})`);

        // Simulate a minor change
        const updateData = {
            ...purchase,
            notes: (purchase.notes || '') + ' (Updated via Diagnostic)'
        };
        delete updateData.id;
        delete updateData._id;

        console.log('Step 1: Reverting stock...');
        const { revertBulkUpdateStock } = require('./services/inventoryService');
        await revertBulkUpdateStock(purchase.items, 'Purchase', purchase.id, 'Purchase', 'diagnostic-user');
        console.log('✅ Stock Reverted');

        console.log('Step 2: Updating Purchase record...');
        const updated = await PurchaseRepository.update(purchase.id, updateData);
        console.log('✅ Purchase Updated');

        console.log('Step 3: Applying new stock...');
        const { bulkUpdateStock } = require('./services/inventoryService');
        await bulkUpdateStock(updated.items, 'Purchase', updated.id, 'Purchase', 'diagnostic-user');
        console.log('✅ New Stock Applied');

        console.log('--- Diagnostic SUCCESS ---');
    } catch (err) {
        console.error('❌ Diagnostic FAILED:', err.message);
        console.error(err.stack);
    }
    process.exit();
}

testUpdate();
