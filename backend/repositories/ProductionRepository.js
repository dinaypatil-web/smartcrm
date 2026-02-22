const BaseRepository = require('./BaseRepository');

class ProductionRepository extends BaseRepository {
    constructor() {
        super('productions');
    }

    async findByBatchNumber(batchNumber) {
        return this.findOne({ batchNumber });
    }
}

module.exports = new ProductionRepository();
