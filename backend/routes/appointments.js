const express = require('express');
const { AppointmentRepository, UserRepository, PrescriptionRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// Generate unique Patient Number
async function generatePatientNumber(patientName) {
    const all = await AppointmentRepository.findAll();
    // Unique patients by name/phone would be better, but for now we'll use a count-based prefix
    // In a real app, we'd search for an existing patient record first.
    const count = all.length;
    const prefix = patientName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `PAT-${prefix}${timestamp}${String(count + 1).padStart(3, '0')}`;
}

// GET /api/appointments
router.get('/', auth, rbac('developer', 'admin', 'doctor', 'attendant'), async (req, res) => {
    try {
        const { startDate, endDate, patientName, patientNumber, status, page = 1, limit = 20 } = req.query;
        let appointments = await AppointmentRepository.findAll();

        if (startDate || endDate) {
            appointments = appointments.filter(a => {
                const d = new Date(a.appointmentDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        if (patientName) {
            const s = patientName.toLowerCase();
            appointments = appointments.filter(a => a.patientName?.toLowerCase().includes(s));
        }

        if (patientNumber) {
            appointments = appointments.filter(a => a.patientNumber === patientNumber);
        }

        if (status) {
            appointments = appointments.filter(a => a.status === status);
        }

        appointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

        const total = appointments.length;
        const paged = appointments.slice((page - 1) * limit, page * limit);

        res.json({ appointments: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/appointments/history/:patientNumber
router.get('/history/:patientNumber', auth, rbac('developer', 'admin', 'doctor', 'attendant'), async (req, res) => {
    try {
        const appointments = await AppointmentRepository.findByPatientNumber(req.params.patientNumber);

        // Fetch all once and fix destructuring TypeError
        const prescriptions = await PrescriptionRepository.findAll();

        const history = appointments.map((appt) => {
            const prescription = prescriptions.find(p => p.appointmentId === appt.id);
            return {
                ...appt,
                diagnosis: prescription?.diagnosis || 'No diagnosis recorded',
                medicines: prescription?.medicines || []
            };
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/appointments
router.post('/', auth, rbac('developer', 'admin', 'attendant'), async (req, res) => {
    try {
        let { patientNumber, patientName } = req.body;

        // If it's a new patient, generate a number
        if (!patientNumber) {
            patientNumber = await generatePatientNumber(patientName);
        }

        const appointment = await AppointmentRepository.create({
            ...req.body,
            patientNumber,
            status: 'pending',
            createdBy: req.user.id,
            createdAt: new Date()
        });
        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/appointments/:id
router.put('/:id', auth, rbac('developer', 'admin', 'attendant'), async (req, res) => {
    try {
        const updated = await AppointmentRepository.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
