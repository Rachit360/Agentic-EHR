const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    uniqueId:       { type: String, unique: true },   // DOC-0001 or PAT-0001
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true },
    password:       { type: String, required: true, minlength: 6 },
    role:           { type: String, enum: ['doctor', 'patient'], default: 'doctor' },

    // Patient-specific
    age:            { type: Number },
    gender:         { type: String, enum: ['Male', 'Female', 'Other'] },
    phone:          { type: String, trim: true },
    bloodGroup:     { type: String, trim: true },
    address:        { type: String, trim: true },
    medicalHistory: { type: String, trim: true },

    // Patient's linked Patient profile
    patientProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },

    // Doctors this patient has granted access to (patient side)
    grantedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Patients who granted access to this doctor (doctor side)
    accessiblePatients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
}, { timestamps: true });

// Auto-generate uniqueId before save
userSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    const prefix = this.role === 'doctor' ? 'DOC' : 'PAT';
    const count = await mongoose.model('User').countDocuments({ role: this.role });
    this.uniqueId = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    next();
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);