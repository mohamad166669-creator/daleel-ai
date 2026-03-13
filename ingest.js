const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');
const officeParser = require('officeparser');

const DOCS_DIR = path.join(__dirname, '.docs', 'مواد تربية غير منهجية');
const CHUNKS_FILE = path.join(__dirname, 'chunks.json');

function extractPdfText(filePath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => resolve("")); // Resolve empty instead of crash
        pdfParser.on("pdfParser_dataReady", pdfData => {
            resolve(pdfParser.getRawTextContent().replace(/\\r\\n|\\r|\\n/g, " "));
        });
        pdfParser.loadPDF(filePath);
    });
}

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    try {
        if (ext === '.pdf') {
            return await extractPdfText(filePath);
        } else if (ext === '.pptx' || ext === '.docx') {
            return await officeParser.parseOfficeAsync(filePath);
        } else if (ext === '.txt') {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message || err);
    }
    return '';
}

function chunkText(text, maxChars = 2000) {
    const chunks = [];
    // Split by punctuation for natural boundaries
    const sentences = text.split(/(?<=[.?!؟])\\s+|\\n+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
        const cleaned = sentence.trim();
        if (!cleaned) continue;
        
        if (currentChunk.length + cleaned.length > maxChars) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = cleaned + ' ';
        } else {
            currentChunk += cleaned + ' ';
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
}

async function main() {
    console.log("Starting ingestion...");
    if (!fs.existsSync(DOCS_DIR)) {
        console.error("Docs directory not found! Path:", DOCS_DIR);
        return;
    }

    const files = fs.readdirSync(DOCS_DIR);
    let allChunks = [];
    let idCounter = 1;
    
    for (const file of files) {
        const filePath = path.join(DOCS_DIR, file);
        if (fs.statSync(filePath).isDirectory()) continue;
        
        const ext = path.extname(file).toLowerCase();
        if (!['.pdf', '.pptx', '.doc', '.docx', '.txt'].includes(ext)) {
            continue;
        }

        console.log(`Extracting text from: ${file}...`);
        const text = await extractText(filePath);
        if (!text || text.trim().length === 0) continue;

        const fileChunks = chunkText(text);
        for (const chunk of fileChunks) {
            allChunks.push({
                id: idCounter++,
                source: file,
                text: chunk
            });
        }
    }

    console.log(`Saving ${allChunks.length} text chunks to chunks.json...`);
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(allChunks));
    console.log("Ingestion completed successfully!");
}

main();
