const BaseRepository = require('./BaseRepository');

class AuditLogRepository extends BaseRepository {
    constructor() {
        super('audit_logs');
    }

    async findByEntity(entityId) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('entity', '==', entityId).orderBy('timestamp', 'desc').limit(100).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new AuditLogRepository();
