const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const auth = require('../middleware/authMiddleware');
const { runAgentPipeline } = require('../services/aiAgentService');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}_${file.originalname}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    }
});

router.use(auth);

// GET /api/reports
router.get('/', async (req, res) => {
    try {
        const { search, patientId } = req.query;
        let query = {};

        if (req.user.role === 'doctor') {
            // Doctor sees reports from patients who granted access OR patients they added
            const accessiblePatients = req.user.accessiblePatients || [];
            const ownPatients = await Patient.find({ doctor: req.user._id }).select('_id');
            const ownPatientIds = ownPatients.map(p => p._id);
            const allPatientIds = [...new Set([...accessiblePatients.map(String), ...ownPatientIds.map(String)])];
            query.patient = { $in: allPatientIds };
            if (patientId) query.patient = patientId;
        } else {
            query.patient = req.user.patientProfile;
        }

        if (search) query.title = { $regex: search, $options: 'i' };

        const reports = await Report.find(query)
            .populate('patient', 'name age gender')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/reports/upload
router.post('/upload', upload.single('report'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        let patientId, patient;

        if (req.user.role === 'patient') {
            patientId = req.user.patientProfile;
            if (!patientId) return res.status(400).json({ message: 'Patient profile not found' });
            patient = await Patient.findById(patientId);
        } else {
            patientId = req.body.patientId;
            if (!patientId) return res.status(400).json({ message: 'patientId is required' });
            patient = await Patient.findOne({
                _id: patientId,
                $or: [{ doctor: req.user._id }, { grantedDoctors: req.user._id }]
            });
            if (!patient) return res.status(404).json({ message: 'Patient not found or access denied' });
        }

        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        const report = await Report.create({
            patient: patientId,
            doctor: req.user.role === 'doctor' ? req.user._id : null,
            uploadedBy: req.user._id,
            uploaderRole: req.user.role,
            title: req.body.title || req.file.originalname,
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            agentStatus: 'processing',
        });

        runAgentPipeline(report._id, req.file.path, patient).catch(console.error);

        res.status(201).json({ message: 'Uploaded. AI analysis in progress...', report });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('patient', 'name age gender bloodGroup');
        if (!report) return res.status(404).json({ message: 'Report not found' });

        if (req.user.role === 'patient') {
            if (report.patient._id.toString() !== req.user.patientProfile?.toString())
                return res.status(403).json({ message: 'Access denied' });
        }
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        const isDoctor = req.user.role === 'doctor';
        const isOwner = req.user.role === 'patient' && report.patient.toString() === req.user.patientProfile?.toString();
        if (!isDoctor && !isOwner) return res.status(403).json({ message: 'Not authorized' });

        const filePath = path.join(__dirname, '../uploads', path.basename(report.fileUrl));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await report.deleteOne();

        res.json({ message: 'Report deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;