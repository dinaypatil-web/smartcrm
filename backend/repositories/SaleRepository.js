const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor() {
        super('sales');
    }

    async findByEntity(entityId) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('entity', '==', entityId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new SaleRepository();
