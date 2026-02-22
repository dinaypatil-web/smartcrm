const admin = require('firebase-admin');
const config = require('./config/env');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            clientEmail: config.firebase.clientEmail,
            privateKey: config.firebase.privateKey,
        }),
    });
}
const db = admin.firestore();

async function check() {
    const collections = ['users', 'items', 'entities'];
    for (const name of collections) {
        const snapshot = await db.collection(name).limit(5).get();
        console.log(`Collection: ${name}, Count in sample: ${snapshot.size}`);
        snapshot.forEach(doc => {
            console.log(`  - ${doc.id}: ${JSON.stringify(doc.data()).substring(0, 100)}...`);
        });
    }
    process.exit();
}

check();
