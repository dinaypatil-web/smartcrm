const mongoose = require('mongoose');
const config = require('./config/env');

async function test() {
    console.log(`Testing connection to: ${config.mongodbUri}`);
    try {
        await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2000 });
        console.log('✅ Connection SUCCESSFUL');

        const db = mongoose.connection.db;
        const result = await db.listCollections().toArray();
        console.log('Collections:', result.map(c => c.name));

        for (const col of result) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`  - ${col.name}: ${count} docs`);
        }
    } catch (err) {
        console.log('❌ Connection FAILED');
        console.log('Error:', err.message);
    }
    process.exit();
}

test();
