const mongoose = require('mongoose');

async function test() {
    const uri = 'mongodb://127.0.0.1:63262/ayurveda_erp';
    console.log(`Testing connection to: ${uri}`);
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
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
