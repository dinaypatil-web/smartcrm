const BaseRepository = require('./BaseRepository');

class ItemRepository extends BaseRepository {
    constructor() {
        super('items');
    }

    async findByCode(itemCode) {
        return this.findOne({ itemCode });
    }

    async findByCategory(category) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('category', '==', category).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async incrementStock(itemId, amount) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const admin = require('firebase-admin');
        await this.collection.doc(itemId).update({
            currentStock: admin.firestore.FieldValue.increment(amount),
            updatedAt: new Date()
        });
        return true;
    }
}

module.exports = new ItemRepository();
