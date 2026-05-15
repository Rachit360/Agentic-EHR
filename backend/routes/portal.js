const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { chatWithPatientHistory } = require('../services/aiAgentService');

router.use(auth);

const patientOnly = (req, res, next) => {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patients only' });
    next();
};

// GET /api/portal/profile
router.get('/profile', patientOnly, async (req, res) => {
    try {
        const patient = await Patient.findById(req.user.patientProfile)
            .populate('grantedDoctors', 'name uniqueId email');
        if (!patient) return res.status(404).json({ message: 'Profile not found' });
        const reports = await Report.find({ patient: patient._id }).sort({ createdAt: -1 });
        res.json({ patient, reports });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/portal/profile
router.put('/profile', patientOnly, async (req, res) => {
    try {
        const allowed = ['age', 'gender', 'phone', 'bloodGroup', 'address', 'medicalHistory', 'name'];
        const updates = {};
        allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
        const patient = await Patient.findByIdAndUpdate(req.user.patientProfile, updates, { new: true });
        // Also update user name if changed
        if (updates.name) await User.findByIdAndUpdate(req.user._id, { name: updates.name });
        res.json(patient);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/portal/grant-access — patient grants a doctor access by doctor's uniqueId
router.post('/grant-access', patientOnly, async (req, res) => {
    try {
        const { doctorUniqueId } = req.body;
        if (!doctorUniqueId) return res.status(400).json({ message: 'Doctor ID required' });

        const doctor = await User.findOne({ uniqueId: doctorUniqueId.toUpperCase(), role: 'doctor' });
        if (!doctor) return res.status(404).json({ message: `Doctor "${doctorUniqueId}" not found` });

        const patient = await Patient.findById(req.user.patientProfile);
        if (!patient) return res.status(404).json({ message: 'Profile not found' });

        // Check not already granted
        if (patient.grantedDoctors.includes(doctor._id))
            return res.status(400).json({ message: 'Access already granted to this doctor' });

        patient.grantedDoctors.push(doctor._id);
        await patient.save();

        // Add patient to doctor's accessible list
        await User.findByIdAndUpdate(doctor._id, {
            $addToSet: { accessiblePatients: patient._id }
        });

        res.json({ message: `Access granted to Dr. ${doctor.name}`, doctor: { name: doctor.name, uniqueId: doctor.uniqueId } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/portal/revoke-access/:doctorId
router.delete('/revoke-access/:doctorId', patientOnly, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.user.patientProfile,
            { $pull: { grantedDoctors: req.params.doctorId } },
            { new: true }
        ).populate('grantedDoctors', 'name uniqueId email');

        await User.findByIdAndUpdate(req.params.doctorId, {
            $pull: { accessiblePatients: req.user.patientProfile }
        });

        res.json({ message: 'Access revoked', patient });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/portal/chat
router.post('/chat', patientOnly, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Message required' });

        const patient = await Patient.findById(req.user.patientProfile);
        const reports = await Report.find({ patient: patient._id, agentStatus: 'done' }).sort({ reportDate: 1 });
        const reply = await chatWithPatientHistory(patient, reports, message);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/portal/account — patient deletes own account
router.delete('/account', patientOnly, async (req, res) => {
    try {
        const patient = await Patient.findById(req.user.patientProfile);

        // Delete all report files
        if (patient) {
            const reports = await Report.find({ patient: patient._id });
            for (const r of reports) {
                const filePath = path.join(__dirname, '../uploads', path.basename(r.fileUrl));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            await Report.deleteMany({ patient: patient._id });
            // Remove from doctors' accessible lists
            await User.updateMany(
                { accessiblePatients: patient._id },
                { $pull: { accessiblePatients: patient._id } }
            );
            await Patient.findByIdAndDelete(patient._id);
        }

        await User.findByIdAndDelete(req.user._id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;