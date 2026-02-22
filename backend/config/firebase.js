const admin = require('firebase-admin');
const config = require('./env');

function initializeFirebase() {
    if (admin.apps.length) return admin.app();

    if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
        console.warn('⚠️  Firebase credentials missing. Firestore will not be initialized.');
        return null;
    }

    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.firebase.projectId,
                clientEmail: config.firebase.clientEmail,
                privateKey: config.firebase.privateKey,
            }),
        });

        // Enable ignoring undefined properties globally
        app.firestore().settings({ ignoreUndefinedProperties: true });

        console.log('✅ Firebase Admin initialized successfully');
        return app;
    } catch (error) {
        console.error('❌ Firebase Admin initialization failed:', error.message);
        return null;
    }
}

// Initial call
initializeFirebase();

// Export a getter for the DB to handle potential initialization timing issues
module.exports = {
    getDb: () => {
        if (!admin.apps.length) {
            console.log('🔄 Firestore not initialized, attempting to initialize...');
            initializeFirebase();
        }
        const db = admin.apps.length ? admin.firestore() : null;
        if (db) {
            console.log('✅ Firestore DB instance retrieved');
        } else {
            console.error('❌ Failed to retrieve Firestore DB instance');
        }
        return db;
    }
};
