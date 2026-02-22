const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
    constructor() {
        super('users');
    }

    async create(data) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(data.password, salt);
        return super.create({ ...data, password: hashedPassword });
    }

    async findByEmail(email) {
        return this.findOne({ email });
    }

    async comparePassword(user, candidatePassword) {
        return bcrypt.compare(candidatePassword, user.password);
    }

    isAccessValid(user, entityDoc) {
        const now = new Date();
        if (user.accessStart && now < user.accessStart) return false;
        if (user.accessEnd && now > user.accessEnd) return false;
        if (!user.isActive) return false;

        if (entityDoc) {
            if (!entityDoc.isActive) return false;
            if (entityDoc.validFrom && now < entityDoc.validFrom) return false;
            if (entityDoc.validTo && now > entityDoc.validTo) return false;
        }

        return true;
    }

    async generateResetToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        await this.update(userId, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
        });
        return token;
    }
}

module.exports = new UserRepository();
