const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null if patient uploaded
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderRole: { type: String, enum: ['doctor', 'patient'], default: 'patient' },
    title:        { type: String, required: true, trim: true },
    fileUrl:      { type: String, required: true },
    fileName:     { type: String, required: true },
    fileSize:     { type: Number },
    rawText:      { type: String, default: '' },

    // AI outputs
    aiSummary:    { type: String, default: '' },
    criticalFlags: [{
        type:    { type: String, enum: ['critical', 'warning', 'info'] },
        message: { type: String },
    }],
    nextSteps:    { type: String, default: '' },
    agentStatus:  { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    agentError:   { type: String, default: '' },

    reportDate:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);