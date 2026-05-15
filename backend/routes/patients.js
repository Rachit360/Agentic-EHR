const router = require('express').Router();
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { chatWithPatientHistory } = require('../services/aiAgentService');
const path = require('path');
const fs = require('fs');

router.use(auth);

const doctorOnly = (req, res, next) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctors only' });
    next();
};

// GET /api/patients — doctor's own patients + patients who granted access
router.get('/', doctorOnly, async (req, res) => {
    try {
        const { search } = req.query;

        // Own patients (doctor added them)
        const ownQuery = { doctor: req.user._id };
        if (search) ownQuery.name = { $regex: search, $options: 'i' };
        const ownPatients = await Patient.find(ownQuery).sort({ createdAt: -1 });

        // Patients who granted access
        const grantedIds = req.user.accessiblePatients || [];
        const grantedQuery = { _id: { $in: grantedIds } };
        if (search) grantedQuery.name = { $regex: search, $options: 'i' };
        const grantedPatients = await Patient.find(grantedQuery).sort({ createdAt: -1 });

        res.json({ ownPatients, grantedPatients });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/patients
router.post('/', doctorOnly, async (req, res) => {
    try {
        const { name, age, gender, phone, email, bloodGroup, address, medicalHistory } = req.body;
        if (!name || !age || !gender)
            return res.status(400).json({ message: 'Name, age, and gender are required' });

        const patient = await Patient.create({
            name, age, gender, phone, email, bloodGroup, address, medicalHistory,
            doctor: req.user._id
        });
        res.status(201).json(patient);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/patients/:id
router.get('/:id', doctorOnly, async (req, res) => {
    try {
        const patient = await Patient.findOne({
            _id: req.params.id,
            $or: [{ doctor: req.user._id }, { grantedDoctors: req.user._id }]
        });
        if (!patient) return res.status(404).json({ message: 'Patient not found or access denied' });

        const reports = await Report.find({ patient: patient._id }).sort({ reportDate: -1 });
        res.json({ patient, reports });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/patients/:id
router.put('/:id', doctorOnly, async (req, res) => {
    try {
        const patient = await Patient.findOneAndUpdate(
            { _id: req.params.id, doctor: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        res.json(patient);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/patients/:id
router.delete('/:id', doctorOnly, async (req, res) => {
    try {
        const patient = await Patient.findOneAndDelete({ _id: req.params.id, doctor: req.user._id });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const reports = await Report.find({ patient: patient._id });
        for (const r of reports) {
            const fp = path.join(__dirname, '../uploads', path.basename(r.fileUrl));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await Report.deleteMany({ patient: patient._id });
        res.json({ message: 'Patient deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/patients/:id/chat
router.post('/:id/chat', doctorOnly, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Message required' });

        const patient = await Patient.findOne({
            _id: req.params.id,
            $or: [{ doctor: req.user._id }, { grantedDoctors: req.user._id }]
        });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const reports = await Report.find({ patient: patient._id, agentStatus: 'done' }).sort({ reportDate: 1 });
        const reply = await chatWithPatientHistory(patient, reports, message);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/patients/account — doctor deletes own account
router.delete('/account/me', doctorOnly, async (req, res) => {
    try {
        // Remove doctor from all patients' grantedDoctors
        await Patient.updateMany(
            { grantedDoctors: req.user._id },
            { $pull: { grantedDoctors: req.user._id } }
        );
        // Delete own patients and their reports
        const ownPatients = await Patient.find({ doctor: req.user._id });
        for (const p of ownPatients) {
            const reports = await Report.find({ patient: p._id });
            for (const r of reports) {
                const fp = path.join(__dirname, '../uploads', path.basename(r.fileUrl));
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
            await Report.deleteMany({ patient: p._id });
            await Patient.findByIdAndDelete(p._id);
        }
        await User.findByIdAndDelete(req.user._id);
        res.json({ message: 'Account deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;