const express = require('express');
const { PrescriptionRepository, UserRepository, ItemRepository } = require('../repositories');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// Generate prescription number
async function generatePrescriptionNumber() {
    const all = await PrescriptionRepository.findAll();
    const count = all.length;
    const date = new Date();
    const prefix = `RX${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

// GET /api/prescriptions
router.get('/', auth, rbac('developer', 'admin', 'doctor'), async (req, res) => {
    try {
        const { startDate, endDate, patient, doctorId, page = 1, limit = 20 } = req.query;
        let prescriptions = await PrescriptionRepository.findAll();

        // Doctors can only see their own prescriptions
        if (req.user.role === 'doctor') {
            prescriptions = prescriptions.filter(p => p.doctor === req.user.id);
        } else if (doctorId) {
            prescriptions = prescriptions.filter(p => p.doctor === doctorId);
        }

        if (startDate || endDate) {
            prescriptions = prescriptions.filter(p => {
                const d = new Date(p.prescriptionDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }
        if (patient) {
            const s = patient.toLowerCase();
            prescriptions = prescriptions.filter(p => p.patient?.name?.toLowerCase().includes(s));
        }

        prescriptions.sort((a, b) => new Date(b.prescriptionDate) - new Date(a.prescriptionDate));

        const total = prescriptions.length;
        const paged = prescriptions.slice((page - 1) * limit, page * limit);

        // Populate doctor name
        for (let p of paged) {
            if (p.doctor) {
                const doc = await UserRepository.findById(p.doctor);
                p.doctor = doc ? { name: doc.name } : null;
            }
        }

        res.json({ prescriptions: paged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/prescriptions/:id
router.get('/:id', auth, rbac('developer', 'admin', 'doctor', 'store'), async (req, res) => {
    try {
        const prescription = await PrescriptionRepository.findById(req.params.id);
        if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

        if (prescription.doctor) {
            const doc = await UserRepository.findById(prescription.doctor);
            prescription.doctor = doc ? { name: doc.name } : null;
        }

        if (prescription.medicines) {
            for (let m of prescription.medicines) {
                if (m.itemRef) {
                    m.itemRef = await ItemRepository.findById(m.itemRef);
                }
            }
        }

        res.json(prescription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/prescriptions
router.post('/', auth, rbac('developer', 'doctor'), async (req, res) => {
    try {
        const prescriptionNumber = await generatePrescriptionNumber();
        const prescription = await PrescriptionRepository.create({
            ...req.body,
            prescriptionNumber,
            doctor: req.user.id,
            prescriptionDate: new Date()
        });

        // Mark appointment as completed if linked
        if (req.body.appointmentId) {
            await AppointmentRepository.update(req.body.appointmentId, { status: 'completed' });
        }

        res.status(201).json(prescription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/prescriptions/:id
router.put('/:id', auth, rbac('developer', 'doctor'), async (req, res) => {
    try {
        const prescription = await PrescriptionRepository.findById(req.params.id);
        if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

        if (req.user.role === 'doctor' && prescription.doctor !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own prescriptions' });
        }

        const updated = await PrescriptionRepository.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
