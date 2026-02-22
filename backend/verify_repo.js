const { UserRepository } = require('./repositories');
require('./config/firebase');

async function verify() {
    console.log('--- Repository Verification ---');
    try {
        // 1. Try to find the admin user (might not exist yet if server hasn't seeded)
        const email = 'admin@ayurveda.com';
        console.log(`Checking for user: ${email}`);
        let user = await UserRepository.findByEmail(email);

        if (!user) {
            console.log('Admin not found. Testing creation...');
            const bcrypt = require('bcryptjs');
            const pass = await bcrypt.hash('admin123', 10);
            user = await UserRepository.create({
                name: 'System Developer',
                email: email,
                password: pass,
                role: 'developer',
                isActive: true,
                createdAt: new Date()
            });
            console.log('✅ Created User:', user.id);
        } else {
            console.log('✅ Found User:', user.id);
        }

        // 2. Fetch again to confirm fetch works
        const fetched = await UserRepository.findById(user.id);
        console.log('✅ Fetched User:', fetched.email);

        // 3. Clean up (Optional, but let's keep it for internal verification)
        console.log('--- Verification SUCCESS ---');
    } catch (err) {
        console.error('❌ Verification FAILED:', err.message);
    }
    process.exit();
}

verify();
