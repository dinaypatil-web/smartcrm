const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');

const app = express();

// Middleware
app.use(helmet());

// Debug logging for all requests - MUST BE NEAR THE TOP
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers));
    next();
});

// Permissive CORS for debugging
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
}));
app.options('*', cors());

app.get('/', (req, res) => res.send('Ayurveda ERP Backend is LIVE!'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/production', require('./routes/production'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/barcode', require('./routes/barcode'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all for undefined routes
app.use((req, res, next) => {
    console.log(`🚫 Route NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Auto-seed admin user on first run
async function seedAdmin() {
    try {
        const { UserRepository } = require('./repositories');
        const existing = await UserRepository.findByEmail('admin@ayurveda.com');
        if (!existing) {
            const adminData = {
                name: 'System Developer',
                email: 'admin@ayurveda.com',
                password: 'admin123',
                role: 'developer',
                phone: '9999999999',
                permissions: { variableDiscount: true, productionEntry: true, reportAccess: true },
                isActive: true,
                createdAt: new Date()
            };

            await UserRepository.create(adminData);
            console.log('✅ Admin user seeded: admin@ayurveda.com / admin123');
        }
    } catch (err) {
        console.log('⚠️  Seed skipped:', err.message);
    }
}

// Start server
async function start() {
    // MongoDB connection removed - now fully using Firestore
    await seedAdmin();
    const PORT = config.port;
    app.listen(PORT, () => {
        console.log(`🚀 Ayurveda ERP Server running on port ${PORT}`);
    });
}

start();

module.exports = app;

