const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 300000;

// ─────────────────────────────────────────────────────────────
// Ollama text call (no vision needed)
// ─────────────────────────────────────────────────────────────
const callOllama = async (prompt) => {
    const body = {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 2048, top_p: 0.9 }
    };
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, body, { timeout: OLLAMA_TIMEOUT });
    if (!response.data?.response) throw new Error('Empty response from Ollama');
    return response.data.response.trim();
};

const checkOllama = async () => {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = response.data?.models?.map(m => m.name) || [];
    const found = models.some(m => m.startsWith(OLLAMA_MODEL.split(':')[0]));
    if (!found) throw new Error(`Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`);
    console.log(`✅ Ollama ready. Model: ${OLLAMA_MODEL}`);
};

// ─────────────────────────────────────────────────────────────
// ASCII85 decoder (used by ReportLab-generated PDFs)
// ─────────────────────────────────────────────────────────────
function decodeASCII85(str) {
    str = str.replace(/\s/g, '').replace(/~>$/, '');
    const result = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === 'z') { result.push(0, 0, 0, 0); i++; continue; }
        const chunk = str.slice(i, i + 5);
        i += 5;
        let val = 0;
        for (let j = 0; j < chunk.length; j++) val = val * 85 + (chunk.charCodeAt(j) - 33);
        const missing = 5 - chunk.length;
        for (let j = 0; j < missing; j++) val = val * 85 + 84;
        const bytes = [(val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF];
        result.push(...bytes.slice(0, 4 - missing));
    }
    return Buffer.from(result);
}

// ─────────────────────────────────────────────────────────────
// Extract text from BT/ET blocks in a decoded PDF content stream
// ─────────────────────────────────────────────────────────────
function extractTextFromStream(content) {
    const texts = [];
    const btEt = /BT([\s\S]{1,8000}?)ET/g;
    let bm;
    while ((bm = btEt.exec(content)) !== null) {
        const block = bm[1];
        // Parenthesis strings: (text)Tj or (text)TJ
        const paren = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[jJ]/g;
        let pm;
        while ((pm = paren.exec(block)) !== null) {
            const t = pm[1]
                .replace(/\\n/g, ' ').replace(/\\r/g, '')
                .replace(/\\\(/g, '(').replace(/\\\)/g, ')')
                .replace(/\\\\/g, '\\').trim();
            if (t.length > 0) texts.push(t);
        }
        // Array strings: [(text)(text)]TJ
        const arr = /\[((?:[^[\]]*|\([^)]*\))*)\]\s*TJ/g;
        let am;
        while ((am = arr.exec(block)) !== null) {
            const inner = am[1];
            const parts = inner.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
            parts.forEach(p => {
                const t = p.slice(1, -1)
                    .replace(/\\n/g, ' ').replace(/\\r/g, '')
                    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
                if (t.length > 0) texts.push(t);
            });
        }
    }
    return texts.join(' ').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────
// AGENT STEP 1: Extract text from PDF (pure Node.js, no deps)
// Handles: FlateDecode, ASCII85+FlateDecode, uncompressed
// ─────────────────────────────────────────────────────────────
const extractTextFromPDF = async (filePath) => {
    console.log('📖 [Agent Step 1] Extracting text from PDF...');

    const buf = fs.readFileSync(filePath);
    const allText = [];

    // Get filter types from PDF header section
    const headerStr = buf.slice(0, 5000).toString('ascii');
    const filters = [];
    const filterMatches = headerStr.match(/\/Filter\s*(?:\[([^\]]+)\]|(\S+))/g) || [];
    filterMatches.forEach(f => filters.push(f));

    // Walk through all streams
    let pos = 0;
    while (pos < buf.length) {
        const streamIdx = buf.indexOf(Buffer.from('stream'), pos);
        if (streamIdx === -1) break;

        let start = streamIdx + 6;
        if (buf[start] === 13) start++;
        if (buf[start] === 10) start++;

        const endIdx = buf.indexOf(Buffer.from('endstream'), start);
        if (endIdx === -1) break;

        const streamBuf = buf.slice(start, endIdx);

        // Try all decode strategies
        const strategies = [
            // Strategy 1: ASCII85 + FlateDecode (ReportLab)
            () => {
                const ascii = streamBuf.toString('ascii');
                const decoded = decodeASCII85(ascii);
                return zlib.inflateSync(decoded).toString('utf8');
            },
            // Strategy 2: FlateDecode only
            () => zlib.inflateSync(streamBuf).toString('utf8'),
            // Strategy 3: Raw uncompressed
            () => streamBuf.toString('utf8'),
        ];

        for (const strategy of strategies) {
            try {
                const content = strategy();
                if (content.includes('BT') && content.includes('ET')) {
                    const text = extractTextFromStream(content);
                    if (text.length > 20) {
                        allText.push(text);
                        break;
                    }
                }
            } catch (_) {}
        }

        pos = endIdx + 9;
    }

    const fullText = allText.join('\n').replace(/\s+/g, ' ').trim();

    if (fullText.length > 50) {
        console.log(`  ✅ Extracted ${fullText.length} characters`);
        return fullText;
    }

    // Last resort: any readable ASCII text from the whole file
    console.log('  ⚠️  Stream extraction failed, trying raw text scan...');
    const rawStr = buf.toString('latin1');
    const readable = rawStr.match(/[\x20-\x7E]{4,}/g) || [];
    const rawText = readable
        .filter(s => /[a-zA-Z]{3,}/.test(s) && !/^[\/\\\.\-\_0-9R]+$/.test(s))
        .join(' ').replace(/\s+/g, ' ').trim();

    if (rawText.length > 50) {
        console.log(`  ✅ Raw scan extracted ${rawText.length} characters`);
        return rawText;
    }

    throw new Error('Could not extract text from this PDF. It may be a scanned image — please use a digital PDF.');
};

// ─────────────────────────────────────────────────────────────
// AGENT STEP 2: Generate structured medical summary
// ─────────────────────────────────────────────────────────────
const generateSummary = async (rawText, patientInfo) => {
    console.log('📋 [Agent Step 2] Generating structured summary...');
    const prompt = `You are a clinical AI assistant. Analyze this medical report and create a structured summary.

Patient: ${patientInfo.name}, Age: ${patientInfo.age}, Gender: ${patientInfo.gender}
${patientInfo.medicalHistory ? `Known History: ${patientInfo.medicalHistory}` : ''}

Medical Report:
${rawText.substring(0, 10000)}

Generate a structured clinical summary with these sections in markdown:

## 1. Primary Diagnoses / Conditions
## 2. Current Medications
## 3. Abnormal Lab / Vital Values  
## 4. Procedures / Treatments
## 5. Recommendations & Follow-up

Be precise. Only include information found in the report.`;

    const summary = await callOllama(prompt);
    console.log('  ✅ Summary generated');
    return summary;
};

// ─────────────────────────────────────────────────────────────
// AGENT STEP 3: Flag critical findings
// ─────────────────────────────────────────────────────────────
const flagCriticalFindings = async (summary) => {
    console.log('🚨 [Agent Step 3] Flagging critical findings...');
    const prompt = `Analyze this medical summary and return a JSON array of clinical alerts.
Each alert: {"type": "critical"|"warning"|"info", "message": "brief description under 80 chars"}
Return ONLY valid JSON array. If none, return [].

Summary:
${summary.substring(0, 4000)}`;

    try {
        const raw = await callOllama(prompt);
        const jsonMatch = raw.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) return [];
        const flags = JSON.parse(jsonMatch[0]);
        console.log(`  ✅ Found ${flags.length} flag(s)`);
        return Array.isArray(flags) ? flags.slice(0, 10) : [];
    } catch (err) {
        console.warn('  ⚠️  Could not parse flags:', err.message);
        return [];
    }
};

// ─────────────────────────────────────────────────────────────
// AGENT STEP 4: Generate next steps
// ─────────────────────────────────────────────────────────────
const generateNextSteps = async (summary, patientHistory) => {
    console.log('🔮 [Agent Step 4] Generating next steps...');
    const prompt = `Based on this medical report summary, provide 3-5 specific actionable clinical next steps for the treating physician. Format as numbered markdown list.

Summary:
${summary.substring(0, 4000)}
${patientHistory ? `\nPatient History:\n${patientHistory.substring(0, 2000)}` : ''}`;

    const nextSteps = await callOllama(prompt);
    console.log('  ✅ Next steps generated');
    return nextSteps;
};

// ─────────────────────────────────────────────────────────────
// AGENT STEP 5: Update patient memory
// ─────────────────────────────────────────────────────────────
const updatePatientMemory = async (patient, allReports) => {
    console.log('🧠 [Agent Step 5] Updating patient memory...');
    const reportHistory = allReports
        .filter(r => r.aiSummary)
        .map((r, i) => `[Report ${i + 1} — ${new Date(r.reportDate).toLocaleDateString()} — "${r.title}"]\n${r.aiSummary}`)
        .join('\n\n---\n\n');

    if (!reportHistory) return '';

    const prompt = `Create a comprehensive medical profile by synthesizing all reports for this patient.

Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
${patient.medicalHistory ? `Pre-existing: ${patient.medicalHistory}` : ''}

All Reports:
${reportHistory.substring(0, 12000)}

Write a patient profile with these sections in markdown:
## Patient Overview
## Medical History Timeline
## Active Medications
## Ongoing Concerns
## Risk Assessment`;

    const memory = await callOllama(prompt);
    console.log('  ✅ Patient memory updated');
    return memory;
};

// ─────────────────────────────────────────────────────────────
// MAIN PIPELINE
// ─────────────────────────────────────────────────────────────
const runAgentPipeline = async (reportId, filePath, patient) => {
    const Report = require('../models/Report');
    const Patient = require('../models/Patient');

    console.log(`\n🤖 ===== AI Agent Pipeline Started =====`);
    console.log(`   Report: ${reportId} | Patient: ${patient.name}`);

    try {
        await checkOllama();

        const rawText = await extractTextFromPDF(filePath);
        await Report.findByIdAndUpdate(reportId, { rawText });

        const aiSummary = await generateSummary(rawText, patient);
        await Report.findByIdAndUpdate(reportId, { aiSummary });

        const criticalFlags = await flagCriticalFindings(aiSummary);
        await Report.findByIdAndUpdate(reportId, { criticalFlags });

        const criticals = criticalFlags.filter(f => f.type === 'critical');
        if (criticals.length > 0) {
            await Patient.findByIdAndUpdate(patient._id, {
                $push: { activeAlerts: { $each: criticals.map(f => ({ ...f, source: reportId.toString(), createdAt: new Date() })) } }
            });
        }

        const nextSteps = await generateNextSteps(aiSummary, patient.aiPatientSummary);
        await Report.findByIdAndUpdate(reportId, { nextSteps, agentStatus: 'done' });

        const allReports = await Report.find({ patient: patient._id, agentStatus: 'done' }).sort({ reportDate: 1 });
        const aiPatientSummary = await updatePatientMemory(patient, allReports);
        await Patient.findByIdAndUpdate(patient._id, { aiPatientSummary, lastSummaryAt: new Date() });

        console.log(`✅ ===== Agent Pipeline Complete =====\n`);
    } catch (err) {
        console.error(`❌ Agent Pipeline Failed: ${err.message}`);
        await Report.findByIdAndUpdate(reportId, { agentStatus: 'failed', agentError: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────────────────────
const chatWithPatientHistory = async (patient, reports, userMessage) => {
    const reportContext = reports
        .map((r, i) => `[Report ${i + 1}: "${r.title}" — ${new Date(r.reportDate).toLocaleDateString()}]\n${r.aiSummary || r.rawText || ''}`)
        .join('\n\n---\n\n');

    const prompt = `You are a clinical AI assistant. Answer questions about this patient's medical history accurately.

Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
${patient.medicalHistory ? `Known History: ${patient.medicalHistory}` : ''}
${patient.aiPatientSummary ? `\nPatient Summary:\n${patient.aiPatientSummary.substring(0, 2000)}` : ''}

Medical Reports:
${reportContext.substring(0, 10000)}

Question: ${userMessage}

Answer based only on the provided medical records.`;

    return await callOllama(prompt);
};

module.exports = { runAgentPipeline, chatWithPatientHistory, checkOllama };
