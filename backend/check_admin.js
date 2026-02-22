const { UserRepository } = require('./repositories');
require('./config/firebase');

async function checkAdmin() {
    console.log('--- Admin Profile Check ---');
    try {
        const email = 'admin@ayurveda.com';
        const user = await UserRepository.findByEmail(email);
        if (user) {
            console.log('User found:', JSON.stringify(user, null, 2));
        } else {
            console.log('Admin user NOT found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit();
}

checkAdmin();
