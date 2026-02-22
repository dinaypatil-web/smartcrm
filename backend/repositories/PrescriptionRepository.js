const BaseRepository = require('./BaseRepository');

class PrescriptionRepository extends BaseRepository {
    constructor() {
        super('prescriptions');
    }

    async findByPatientName(name) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('patientName', '==', name).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new PrescriptionRepository();
