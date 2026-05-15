const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    name:           { type: String, required: true, trim: true },
    age:            { type: Number, required: true },
    gender:         { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phone:          { type: String, trim: true },
    email:          { type: String, trim: true, lowercase: true },
    bloodGroup:     { type: String, trim: true },
    address:        { type: String, trim: true },
    medicalHistory: { type: String, trim: true },

    // null if self-registered patient, doctor _id if added by doctor
    doctor:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Self-registered
    selfRegistered: { type: Boolean, default: false },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Doctors granted access by this patient
    grantedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // AI summary
    aiPatientSummary: { type: String, default: '' },
    lastSummaryAt:    { type: Date },

    activeAlerts: [{
        type:      { type: String },
        message:   { type: String },
        source:    { type: String },
        createdAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);