const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const auth = require('../middleware/authMiddleware');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, age, gender, phone, bloodGroup, address, medicalHistory } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ message: 'Name, email and password are required' });

        if (await User.findOne({ email }))
            return res.status(400).json({ message: 'Email already registered' });

        const userRole = role === 'patient' ? 'patient' : 'doctor';
        const user = await User.create({ name, email, password, role: userRole, age, gender, phone, bloodGroup, address, medicalHistory });

        if (userRole === 'patient') {
            const patientProfile = await Patient.create({
                name, age: age || 0, gender: gender || 'Other',
                phone, bloodGroup, address, medicalHistory, email,
                doctor: null, selfRegistered: true, userId: user._id,
            });
            user.patientProfile = patientProfile._id;
            await user.save();
        }

        const token = signToken(user._id);
        res.status(201).json({
            token,
            user: { id: user._id, uniqueId: user.uniqueId, name: user.name, email: user.email, role: user.role, patientProfile: user.patientProfile }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ message: 'Invalid email or password' });

        const token = signToken(user._id);
        res.json({
            token,
            user: { id: user._id, uniqueId: user.uniqueId, name: user.name, email: user.email, role: user.role, patientProfile: user.patientProfile }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
});

module.exports = router;