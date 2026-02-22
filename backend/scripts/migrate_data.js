const mongoose = require('mongoose');
const admin = require('firebase-admin');
const config = require('../config/env');
const bcrypt = require('bcryptjs');

// 1. Initialize Firebase Admin
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

// 2. Import Mongoose Models
const AuditLog = require('../models/AuditLog');
const Entity = require('../models/Entity');
const InventoryLedger = require('../models/InventoryLedger');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const Prescription = require('../models/Prescription');
const Production = require('../models/Production');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const User = require('../models/User');

const collections = [
    { model: User, name: 'users' },
    { model: Entity, name: 'entities' },
    { model: Item, name: 'items' },
    { model: Purchase, name: 'purchases' },
    { model: Sale, name: 'sales' },
    { model: InventoryLedger, name: 'inventory_ledgers' },
    { model: Production, name: 'production' },
    { model: Prescription, name: 'prescriptions' },
    { model: AuditLog, name: 'audit_logs' },
    { model: Notification, name: 'notifications' }
];

// Helper to transform Mongoose object to plain object for Firestore
function transformDoc(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const newObj = {};

    for (const [key, value] of Object.entries(obj)) {
        if (key === '_id') {
            newObj.id = value.toString();
        } else if (key === '__v') {
            continue; // Skip Mongoose version key
        } else if (value instanceof mongoose.Types.ObjectId) {
            newObj[key] = value.toString();
        } else if (value instanceof Date) {
            newObj[key] = admin.firestore.Timestamp.fromDate(value);
        } else if (Array.isArray(value)) {
            newObj[key] = value.map(item => (typeof item === 'object' && item !== null) ? transformDoc(item) : item);
        } else if (typeof value === 'object' && value !== null) {
            newObj[key] = transformDoc(value);
        } else {
            newObj[key] = value;
        }
    }
    return newObj;
}

async function migrate() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri);
        console.log('✅ Connected to MongoDB');

        for (const { model, name } of collections) {
            console.log(`\n📦 Migrating collection: ${name}...`);
            const docs = await model.find({});
            console.log(`   Found ${docs.length} documents.`);

            if (docs.length === 0) continue;

            const batch = db.batch();
            let count = 0;

            for (const doc of docs) {
                const data = transformDoc(doc);
                const docRef = db.collection(name).doc(data.id);
                batch.set(docRef, data);
                count++;

                // Firestore batch limit is 500
                if (count % 500 === 0) {
                    await batch.commit();
                    console.log(`   Committed ${count} documents...`);
                }
            }

            if (count % 500 !== 0) {
                await batch.commit();
            }
            console.log(`✅ Successfully migrated ${count} documents to '${name}'.`);
        }

        console.log('\n🎉 Data migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

migrate();
