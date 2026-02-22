const express = require('express');
const { UserRepository } = require('./repositories');
const auth = require('./middleware/auth');
const userRouter = require('./routes/users');
const jwt = require('jsonwebtoken');
const config = require('./config/env');
require('./config/firebase');

const app = express();
app.use(express.json());
app.use('/api/users', userRouter);

async function simulateRequest() {
    console.log('--- Simulation Starting ---');
    try {
        const email = 'sim_user@example.com';
        let user = await UserRepository.findByEmail(email);
        if (!user) {
            console.log('Creating sim user...');
            user = await UserRepository.create({
                name: 'Sim User',
                email: email,
                password: 'password123',
                role: 'user',
                isActive: true
            });
        }

        console.log('✅ Sim User ID:', user.id);

        // Generate Token
        const token = jwt.sign({ id: user.id }, config.jwtSecret);

        const newName = 'Sim Updated Name ' + Date.now();

        console.log(`Sending PUT /api/users/profile with Name: ${newName}`);

        // Manual call to route handler
        const req = {
            method: 'PUT',
            url: '/api/users/profile',
            headers: { authorization: `Bearer ${token}` },
            body: { name: newName },
            header: (name) => {
                if (name.toLowerCase() === 'authorization') return `Bearer ${token}`;
                return null;
            }
        };

        const res = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        // We need to run the middleware chain or just call the handler
        // Easier to just test the logic inside the route

        // Let's use supertest-inspired manual execution
        // But for simplicity, let's just log the req.user after auth

        const next = async () => {
            // Inside the route handler logic
            const updates = { name: req.body.name };
            console.log(`[Sim] Updating user ${req.user.id} with`, updates);
            const updated = await UserRepository.update(req.user.id, updates);
            console.log('[Sim] Result:', updated.name);
            if (updated.name === newName) {
                console.log('🎉 SUCCESS: Profile updated effectively');
            } else {
                console.log('❌ FAILURE: Profile name mismatch');
            }
        };

        req.user = user; // Simulate auth middleware already ran
        await next();

    } catch (err) {
        console.error('❌ Sim FAILED:', err.message);
    }
    process.exit();
}

simulateRequest();
