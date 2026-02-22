const { getDb } = require('../config/firebase');

async function clearCollections() {
    const db = getDb();
    if (!db) {
        console.error('Failed to connect to Firestore');
        process.exit(1);
    }

    const collections = ['audit_logs', 'inventory_ledger'];

    console.log('--- Database Clearing Started ---');

    for (const colName of collections) {
        console.log(`Clearing collection: ${colName}...`);
        try {
            const snapshot = await db.collection(colName).get();
            if (snapshot.empty) {
                console.log(`   --> ${colName} is already empty.`);
                continue;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`   --> Successfully cleared ${snapshot.size} documents from ${colName}.`);
        } catch (err) {
            console.error(`   ❌ Error clearing ${colName}:`, err.message);
        }
    }

    console.log('--- Database Clearing Finished ---');
    process.exit(0);
}

clearCollections();
