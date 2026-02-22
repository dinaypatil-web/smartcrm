const { PurchaseRepository } = require('./repositories');
const firebase = require('./config/firebase');

async function inspect() {
    console.log('--- Inspecting Latest Purchases ---');
    try {
        const all = await PurchaseRepository.findAll();
        console.log(`Total purchases found: ${all.length}`);

        if (all.length > 0) {
            // Sort by date manually if fetch doesnt populate it
            const sorted = all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const latest = sorted[0];
            console.log('Latest Purchase ID:', latest.id);
            console.log('Data Structure:', JSON.stringify(latest, null, 2).substring(0, 1000));

            if (latest.items && latest.items.length > 0) {
                console.log('Sample Item ItemID type:', typeof latest.items[0].item);
                console.log('Sample Item contains unitPrice:', !!latest.items[0].unitPrice);
            }
        }
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
    process.exit();
}

inspect();
