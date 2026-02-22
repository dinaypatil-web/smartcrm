const { MongoClient } = require('mongodb');

async function test() {
    const ports = [63262];
    const hosts = ['127.0.0.1', 'localhost', '::1'];

    for (const host of hosts) {
        for (const port of ports) {
            const uri = `mongodb://${host}:${port}/`;
            console.log(`Connecting to: ${uri}...`);
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            try {
                await client.connect();
                console.log(`✅ SUCCESS on ${uri}`);
                const dbs = await client.db().admin().listDatabases();
                console.log('Databases:', dbs.databases.map(d => d.name));
                await client.close();
                process.exit(0);
            } catch (err) {
                console.log(`❌ FAILED on ${uri}: ${err.message}`);
            }
        }
    }
    process.exit(1);
}

test();
