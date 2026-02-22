const BaseRepository = require('./BaseRepository');

class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications');
    }

    async findByUser(userId) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('user', '==', userId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new NotificationRepository();
