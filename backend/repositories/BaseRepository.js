const firebase = require('../config/firebase');

class BaseRepository {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    get collection() {
        const db = firebase.getDb();
        if (!db) return null;
        return db.collection(this.collectionName);
    }

    async create(data) {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');
        const docRef = await collection.add({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return { id: docRef.id, _id: docRef.id, ...data };
    }

    async findById(id) {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');
        const doc = await collection.doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, _id: doc.id, ...doc.data() };
    }

    async findAll() {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');
        const snapshot = await collection.get();
        return snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));
    }

    async findOne(query) {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');
        let ref = collection;
        for (const [key, value] of Object.entries(query)) {
            ref = ref.where(key, '==', value);
        }
        const snapshot = await ref.limit(1).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, _id: doc.id, ...doc.data() };
    }

    async update(id, data) {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');

        // Remove _id from data to prevent Firestore update errors
        const updateData = { ...data };
        delete updateData._id;
        delete updateData.id;

        console.log(`[BaseRepo] Updating ${this.collectionName}/${id}`, updateData);
        const docRef = collection.doc(id);
        try {
            await docRef.update({
                ...updateData,
                updatedAt: new Date(),
            });
            console.log(`[BaseRepo] Update success for ${id}`);
            return this.findById(id);
        } catch (error) {
            console.error(`[BaseRepo] Update FAILED for ${id}:`, error.message);
            throw error;
        }
    }

    async delete(id) {
        const collection = this.collection;
        if (!collection) throw new Error('Firestore not initialized');
        await collection.doc(id).delete();
        return true;
    }
}

module.exports = BaseRepository;
