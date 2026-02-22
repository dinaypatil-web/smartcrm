const mongoose = require('mongoose');

async function test() {
    const uri = 'mongodb://127.0.0.1:63262/';
    console.log(`Testing connection to: ${uri}`);
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log('✅ Connection SUCCESSFUL');

        const db = mongoose.connection.db;
        const admin = db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name));

        for (const d of dbs.databases) {
            if (['admin', 'local', 'config'].includes(d.name)) continue;
            console.log(`\nExploring database: ${d.name}`);
            const tempConn = mongoose.createConnection(`${uri}${d.name}`);
            await tempConn.asPromise();
            const cols = await tempConn.db.listCollections().toArray();
            console.log('Collections:', cols.map(c => c.name));
            for (const col of cols) {
                const count = await tempConn.db.collection(col.name).countDocuments();
                console.log(`  - ${col.name}: ${count} docs`);
            }
            await tempConn.close();
        }
    } catch (err) {
        console.log('❌ Connection FAILED');
        console.log('Error:', err.message);
    }
    process.exit();
}

test();
