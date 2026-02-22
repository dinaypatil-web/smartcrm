const { UserRepository } = require('./repositories');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    console.log('--- Resetting Admin Password ---');
    try {
        const email = 'admin@ayurveda.com';
        const user = await UserRepository.findByEmail(email);
        if (user) {
            console.log('User found, updating password...');
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await UserRepository.update(user.id, { password: hashedPassword });
            console.log('✅ Admin password reset successfully to: admin123');
        } else {
            console.log('Admin user NOT found. Seeding will happen on server start.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit();
}

resetAdmin();
