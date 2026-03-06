const BaseRepository = require('./BaseRepository');

class InventoryLedgerRepository extends BaseRepository {
    constructor() {
        super('inventory_ledger');
    }

    async findByItem(itemId) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('item', '==', itemId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new InventoryLedgerRepository();
