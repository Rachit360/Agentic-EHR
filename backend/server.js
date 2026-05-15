require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync(path.join(__dirname, 'uploads')))
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/reports',  require('./routes/reports'));
app.use('/api/portal',   require('./routes/portal'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT || 5000, () =>
            console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`)
        );
    })
    .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });