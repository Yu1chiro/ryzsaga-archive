const express = require('express');
const Tesseract = require('tesseract.js');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database file PDF - tambahkan file sebanyak yang dibutuhkan
const pdfFiles = [
  {
    id: 1,
    title: "JLPT N5 Practice Test",
    description: "Terdiri 188 Halaman gabungan dari soal dari tahun 2011-2021",
    thumbnail: "https://ucarecdn.com/16c8c88d-16c0-411f-9ab9-95ce066b7abb/n5.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=1L4Uxw8dxHD_En-NHBq3zhiwDFI6V2poW",
    category: "N5"
  },
  {
    id: 2,
    title: "JLPT N4 Practice Test",
    description: "Terdiri 129 Halaman gabungan soal dari tahun 2012-2023",
    thumbnail: "https://ucarecdn.com/3c3fb7d8-7b45-484b-bc4c-a2ca42e8a54f/n4.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=1SzZr-E7VWJvMwLbk0evOtPmsOwkypqOh",
    category: "N4"
  },
  {
    id: 3,
    title: "JLPT N3 Practice Test",
    description: "Coming soon....",
    thumbnail: "https://ucarecdn.com/db0fd29c-b9b5-4281-a690-1892b6190863/n3.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=COMING_SOON",
    category: "N3"
  },
  {
    id: 4,
    title: "Buku Modul Kontruksi",
    description: "Free download",
    thumbnail: "https://ucarecdn.com/cb8f5e9c-fd02-498e-b757-0b71db23578b/genba.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=1ILrow21HipX_YGHzAnk6lchWH9PUdeby",
    category: "Genba"
  },
  {
    id: 5,
    title: "Buku Modul SSW Pengolahan Makanan",
    description: "Free Download",
    thumbnail: "https://ucarecdn.com/241e8a5b-ef54-4a2f-9715-d325dc26192a/makanan.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=1A66wwXnJXikaDk43ftz5k6qVviStql_w",
    category: "Pengolahan Makanan"
  },
  {
    id: 6,
    title: "Kanji Practice Book",
    description: "Buku latihan kanji untuk semua level",
    thumbnail: "https://ucarecdn.com/471aeeb7-5829-46cf-93ce-93d480dad37d/kanji.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=COMING_SOON",
    category: "Kanji"
  }
];

// Route untuk mendapatkan daftar file PDF
app.get('/api/files', (req, res) => {
  res.json({
    success: true,
    files: pdfFiles
  });
});

// Route untuk mendapatkan detail file berdasarkan ID
app.get('/api/files/:id', (req, res) => {
  const fileId = parseInt(req.params.id);
  const file = pdfFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({
      success: false,
      message: 'File tidak ditemukan!'
    });
  }
  
  res.json({
    success: true,
    file: file
  });
});

// Route untuk verifikasi gambar
app.post('/verify-image', async (req, res) => {
  try {
    const { imageData, fileId } = req.body;

    if (!imageData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tidak ada data gambar yang dikirim!' 
      });
    }

    const file = pdfFiles.find(f => f.id === parseInt(fileId));
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File tidak ditemukan!'
      });
    }

    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Format gambar tidak valid!'
      });
    }

    console.log('Memproses gambar untuk file:', file.title);

    // 🔥 Menggunakan OCR.space API (GRATIS!)
    const apiKey = 'K85870810288957'; // API key gratis
    
    const formData = new FormData();
    formData.append('base64Image', imageData);
    formData.append('apikey', apiKey);
    formData.append('language', 'ind'); // Bahasa Indonesia
    formData.append('isOverlayRequired', false);
    formData.append('detectOrientation', false);
    formData.append('scale', true);
    formData.append('isTable', false);
    formData.append('OCREngine', 2); // Engine terbaru

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    const ocrResult = await response.json();

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      const text = ocrResult.ParsedResults[0].ParsedText;
      console.log('Teks yang ditemukan:', text);
      
      const teksHasil = text.toLowerCase();

      // 🔍 Logic verifikasi kamu tetap sama
      const hasRyzSagaCaps = text.includes('RYZ SAGA');
      const hasPesan = teksHasil.includes('pesan');
      const hasRyzSaga = teksHasil.includes('@ryz') || teksHasil.includes('ryz saga') || teksHasil.includes('ryzsaga');

      if (hasPesan && hasRyzSaga && hasRyzSagaCaps) {
        res.json({
          success: true,
          message: 'Wah makasi ya sudh support akun ini! Ganbattene!',
          downloadUrl: file.driveUrl,
          fileName: file.title,
          detectedText: text
        });
      } else {
        res.json({
          success: false,
          message: 'Oops! ternyata kamu belum memfollow atau akun tidak terdeteksi. Yuk follow dahulu!',
          detectedText: text
        });
      }

    } else {
      console.error('OCR Error:', ocrResult);
      res.status(500).json({
        success: false,
        message: 'Gagal memproses gambar: ' + (ocrResult.ErrorMessage || 'Unknown error')
      });
    }

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses gambar: ' + error.message
    });
  }
});

// Route untuk download file (redirect ke Google Drive)
app.get('/download/:id', (req, res) => {
  const fileId = parseInt(req.params.id);
  const file = pdfFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).send('File tidak ditemukan!');
  }
  
  res.redirect(file.driveUrl);
});

// Route utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/verify/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Terjadi kesalahan server.'
  });
});

// Export untuk Vercel
module.exports = app;

// Jalankan server hanya jika tidak di environment Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}