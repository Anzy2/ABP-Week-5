const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ─── Database JSON ──────────────────────────────────────── */
const DB_FILE = path.join(__dirname, 'data', 'mahasiswa.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) { return []; }
}

function writeDB(data) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Seed awal
if (!fs.existsSync(DB_FILE)) {
  writeDB([
    { id: uuidv4(), nim:'2300001', nama:'Ahmad Fauzi', email:'ahmad@student.ac.id', nohp:'081234567890', prodi:'Teknik Informatika', angkatan:'2023', ipk:'3.75', status:'Aktif', alamat:'Jl. Merdeka No.1, Purwokerto', createdAt: new Date().toISOString() },
    { id: uuidv4(), nim:'2300002', nama:'Budi Santoso', email:'budi@student.ac.id', nohp:'082345678901', prodi:'Sistem Informasi', angkatan:'2023', ipk:'3.50', status:'Aktif', alamat:'Jl. Sudirman No.5, Purwokerto', createdAt: new Date().toISOString() },
    { id: uuidv4(), nim:'2200015', nama:'Citra Dewi', email:'citra@student.ac.id', nohp:'083456789012', prodi:'Manajemen Informatika', angkatan:'2022', ipk:'3.90', status:'Aktif', alamat:'Jl. Diponegoro No.10, Banyumas', createdAt: new Date().toISOString() },
  ]);
}

/* ─── Serve HTML ─────────────────────────────────────────── */
app.get('/', (req, res) => {
  // Coba beberapa kemungkinan nama file
  const candidates = ['index.html', 'Laprak5.html', 'laprak5.html', 'Index.html'];
  for (const name of candidates) {
    const filePath = path.join(__dirname, name);
    if (fs.existsSync(filePath)) {
      console.log('Serving:', filePath);
      return res.sendFile(filePath);
    }
  }
  // Kalau tidak ada, beri tahu nama file yang ada
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
  res.send(`
    <h2>File HTML tidak ditemukan!</h2>
    <p>File HTML di folder ini: <strong>${files.join(', ') || 'tidak ada'}</strong></p>
    <p>Pastikan file bernama <code>index.html</code> ada di folder yang sama dengan server.js</p>
    <p>Folder saat ini: <code>${__dirname}</code></p>
  `);
});

/* ─── API: GET all ───────────────────────────────────────── */
app.get('/api/mahasiswa', (req, res) => {
  let data = readDB();
  if (req.query.prodi)    data = data.filter(m => m.prodi === req.query.prodi);
  if (req.query.status)   data = data.filter(m => m.status === req.query.status);
  if (req.query.angkatan) data = data.filter(m => m.angkatan === req.query.angkatan);
  res.json({ status: 'success', total: data.length, data });
});

/* ─── API: GET one ───────────────────────────────────────── */
app.get('/api/mahasiswa/:id', (req, res) => {
  const mhs = readDB().find(m => m.id === req.params.id);
  if (!mhs) return res.status(404).json({ status: 'error', message: 'Tidak ditemukan' });
  res.json({ status: 'success', data: mhs });
});

/* ─── API: POST ──────────────────────────────────────────── */
app.post('/api/mahasiswa', (req, res) => {
  const data = readDB();
  if (data.find(m => m.nim === req.body.nim?.trim())) {
    return res.status(400).json({ status: 'error', message: 'NIM sudah terdaftar' });
  }
  const newMhs = {
    id: uuidv4(),
    nim: req.body.nim?.trim(),
    nama: req.body.nama?.trim(),
    email: req.body.email?.trim(),
    nohp: req.body.nohp?.trim() || '',
    prodi: req.body.prodi,
    angkatan: req.body.angkatan,
    ipk: req.body.ipk || '',
    status: req.body.status,
    alamat: req.body.alamat?.trim() || '',
    createdAt: new Date().toISOString(),
  };
  data.push(newMhs);
  writeDB(data);
  res.status(201).json({ status: 'success', data: newMhs });
});

/* ─── API: PUT ───────────────────────────────────────────── */
app.put('/api/mahasiswa/:id', (req, res) => {
  const data = readDB();
  const idx = data.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ status: 'error', message: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeDB(data);
  res.json({ status: 'success', data: data[idx] });
});

/* ─── API: DELETE ────────────────────────────────────────── */
app.delete('/api/mahasiswa/:id', (req, res) => {
  let data = readDB();
  const mhs = data.find(m => m.id === req.params.id);
  if (!mhs) return res.status(404).json({ status: 'error', message: 'Tidak ditemukan' });
  data = data.filter(m => m.id !== req.params.id);
  writeDB(data);
  res.json({ status: 'success', message: `Data ${mhs.nama} dihapus` });
});

/* ─── API: Statistik ─────────────────────────────────────── */
app.get('/api/statistik', (req, res) => {
  const data = readDB();
  const byProdi = {}, byAngkatan = {}, byStatus = {};
  data.forEach(m => {
    byProdi[m.prodi]       = (byProdi[m.prodi] || 0) + 1;
    byAngkatan[m.angkatan] = (byAngkatan[m.angkatan] || 0) + 1;
    byStatus[m.status]     = (byStatus[m.status] || 0) + 1;
  });
  res.json({ status: 'success', data: { total: data.length, byProdi, byAngkatan, byStatus } });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server jalan di: http://localhost:${PORT}`);
  console.log(`📁 Folder: ${__dirname}`);
  const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
  console.log(`📄 File HTML ditemukan: ${htmlFiles.join(', ') || 'TIDAK ADA!'}\n`);
});
