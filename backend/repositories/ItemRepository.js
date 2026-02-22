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
}

module.exports = new ItemRepository();
