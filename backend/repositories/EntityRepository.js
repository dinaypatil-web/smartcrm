const BaseRepository = require('./BaseRepository');

class EntityRepository extends BaseRepository {
    constructor() {
        super('entities');
    }

    async findByCode(entityCode) {
        return this.findOne({ entityCode });
    }

    isValid(entity) {
        const now = new Date();
        if (!entity.isActive) return false;
        if (entity.validFrom && now < entity.validFrom) return false;
        if (entity.validTo && now > entity.validTo) return false;
        return true;
    }
}

module.exports = new EntityRepository();
