const mongoose = require('mongoose');
const admin = require('firebase-admin');
const config = require('../config/env');
const db = require('../config/firebase');

// Import all models
const User = require('../models/User');
const Entity = require('../models/Entity');
const Item = require('../models/Item');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Notification = require('../models/Notification');
const InventoryLedger = require('../models/InventoryLedger');
const Prescription = require('../models/Prescription');
const Production = require('../models/Production');
const AuditLog = require('../models/AuditLog');

const models = [
    { model: User, collection: 'users' },
    { model: Entity, collection: 'entities' },
    { model: Item, collection: 'items' },
    { model: Purchase, collection: 'purchases' },
    { model: Sale, collection: 'sales' },
    { model: Notification, collection: 'notifications' },
    { model: InventoryLedger, collection: 'inventory_ledger' },
    { model: Prescription, collection: 'prescriptions' },
    { model: Production, collection: 'productions' },
    { model: AuditLog, collection: 'audit_logs' }
];

async function migrate() {
    try {
        // Connect to MongoDB
        console.log(`Connecting to MongoDB at ${config.mongodbUri}...`);
        await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected to MongoDB');

        if (!db) {
            console.error('❌ Firestore not initialized');
            throw new Error('Firestore not initialized. Check credentials.');
        }
        console.log('✅ Firestore instance ready');

        for (const { model, collection } of models) {
            console.log(`--- Migrating collection: [${collection}] ---`);
            const docs = await model.find({}).lean();
            console.log(`Found ${docs.length} documents in ${collection}`);

            const batch = db.batch();
            let count = 0;

            for (const doc of docs) {
                const id = doc._id.toString();
                const data = { ...doc };
                delete data._id;
                delete data.__v;

                // Convert any other ObjectIds to strings recursively
                const sanitize = (obj) => {
                    for (let key in obj) {
                        if (obj[key] && typeof obj[key] === 'object') {
                            if (obj[key] instanceof mongoose.Types.ObjectId) {
                                obj[key] = obj[key].toString();
                            } else if (obj[key] instanceof Date) {
                                // Keep dates as dates (Firestore handles this)
                            } else {
                                sanitize(obj[key]);
                            }
                        }
                    }
                };
                sanitize(data);

                const docRef = db.collection(collection).doc(id);
                batch.set(docRef, data);
                count++;

                // Firestore batch limit is 500
                if (count % 500 === 0) {
                    await batch.commit();
                    console.log(`  Committed ${count} docs to ${collection}`);
                }
            }

            if (count % 500 !== 0) {
                await batch.commit();
            }
            console.log(`✅ Finished migrating ${collection}`);
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
