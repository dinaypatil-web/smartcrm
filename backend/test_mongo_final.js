const { MongoClient } = require('mongodb');

async function test() {
    const uri = 'mongodb://127.0.0.1:63262/ayurveda_erp';
    console.log(`Connecting to: ${uri}...`);
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 15000,
        family: 4
    });
    try {
        await client.connect();
        console.log(`✅ SUCCESS`);
        const dbs = await client.db().admin().listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name));

        const db = client.db('ayurveda_erp');
        const cols = await db.listCollections().toArray();
        console.log('Collections:', cols.map(c => c.name));

        await client.close();
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        if (err.reason) console.log('Reason:', err.reason);
    }
    process.exit(1);
}

test();
