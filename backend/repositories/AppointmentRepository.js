const BaseRepository = require('./BaseRepository');

class AppointmentRepository extends BaseRepository {
    constructor() {
        super('appointments');
    }

    async findByPatientNumber(patientNumber) {
        if (!this.collection) throw new Error('Firestore not initialized');
        const snapshot = await this.collection.where('patientNumber', '==', patientNumber).get();
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...this._convertTimestamps(doc.data()) }))
            .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    }

    async findByDateRange(startDate, endDate) {
        if (!this.collection) throw new Error('Firestore not initialized');
        let query = this.collection;
        if (startDate) query = query.where('appointmentDate', '>=', new Date(startDate));
        if (endDate) query = query.where('appointmentDate', '<=', new Date(endDate));
        const snapshot = await query.orderBy('appointmentDate', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

module.exports = new AppointmentRepository();
