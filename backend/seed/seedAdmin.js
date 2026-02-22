require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');

async function seedAdmin() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ email: 'admin@ayurveda.com' });
        if (existing) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        const admin = new User({
            name: 'System Developer',
            email: 'admin@ayurveda.com',
            password: 'admin123',
            role: 'developer',
            phone: '9999999999',
            permissions: { variableDiscount: true, productionEntry: true, reportAccess: true },
            isActive: true
        });

        await admin.save();
        console.log('✅ Admin user created: admin@ayurveda.com / admin123');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seedAdmin();
