const express = require('express');
const path = require('path');

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

    // 🔥 Menggunakan OCR.space API dengan parameter yang benar
    const apiKey = 'K85870810288957'; // API key gratis
    
    const params = new URLSearchParams();
    params.append('base64Image', imageData);
    params.append('apikey', apiKey);
    params.append('language', 'eng'); // 🔧 Ganti ke 'eng' (English) - lebih reliable
    params.append('isOverlayRequired', 'false');
    params.append('detectOrientation', 'true'); // 🔧 Enable untuk rotasi gambar
    params.append('scale', 'true');
    params.append('isTable', 'false');
    params.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    const ocrResult = await response.json();
    console.log('OCR Result:', ocrResult); // 🔧 Debug log

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      const text = ocrResult.ParsedResults[0].ParsedText || '';
      console.log('Teks yang ditemukan:', text);
      
      // 🔍 Normalisasi teks untuk deteksi yang lebih robust
      const normalizedText = text.toLowerCase()
        .replace(/[^\w\s@]/g, ' ') // Hapus karakter khusus kecuali @ dan alphanumeric
        .replace(/\s+/g, ' ')      // Ganti multiple spaces dengan single space
        .trim();
      
      console.log('Normalized text:', normalizedText);

      // 🔧 Logic verifikasi yang lebih flexible
      const textVariants = [
        'ryz saga',
        'ryzsaga', 
        'ryz_saga',
        '@ryz',
        '@ryzsaga',
        'saga ryz',
        'sagarz',
        'ryzaga'
      ];

      const pesanVariants = [
        'pesan',
        'message',
        'messages',
        'direct message',
        'dm',
        'chat'
      ];

      // Cek apakah ada varian nama yang terdeteksi
      const hasRyzSaga = textVariants.some(variant => 
        normalizedText.includes(variant)
      );

      // Cek apakah ada indikasi pesan/chat
      const hasPesan = pesanVariants.some(variant => 
        normalizedText.includes(variant)
      );

      // Cek case-sensitive untuk nama yang tepat (opsional)
      const hasExactName = text.includes('RYZ SAGA') || 
                          text.includes('Ryz Saga') || 
                          text.includes('RyzSaga');

      console.log('Detection results:', {
        hasRyzSaga,
        hasPesan,
        hasExactName,
        detectedVariants: textVariants.filter(v => normalizedText.includes(v))
      });

      // 🎯 Kondisi verifikasi yang lebih lenient
      if (hasRyzSaga && (hasPesan || hasExactName)) {
        res.json({
          success: true,
          message: 'Wah makasi ya sudh support akun ini! Ganbattene! 🎉',
          downloadUrl: file.driveUrl,
          fileName: file.title,
          detectedText: text,
          detectedVariants: textVariants.filter(v => normalizedText.includes(v))
        });
      } else {
        // 🔧 Berikan feedback yang lebih informatif
        let feedbackMessage = 'Oops! ';
        
        if (!hasRyzSaga) {
          feedbackMessage += 'Username @ryzsaga tidak terdeteksi. ';
        }
        
        if (!hasPesan && !hasExactName) {
          feedbackMessage += 'Screenshot chat/pesan tidak terdeteksi. ';
        }
        
        feedbackMessage += 'Pastikan screenshot menampilkan chat dengan @ryzsaga dengan jelas!';

        res.json({
          success: false,
          message: feedbackMessage,
          detectedText: text,
          debug: {
            hasRyzSaga,
            hasPesan,
            hasExactName,
            normalizedText: normalizedText.substring(0, 200) // Limited untuk debug
          }
        });
      }

    } else {
      console.error('OCR Error:', ocrResult);
      
      // 🔧 Error handling yang lebih spesifik
      let errorMessage = 'Gagal memproses gambar. ';
      
      if (ocrResult.ErrorMessage) {
        if (ocrResult.ErrorMessage.includes('language')) {
          errorMessage += 'Bahasa tidak didukung.';
        } else if (ocrResult.ErrorMessage.includes('image')) {
          errorMessage += 'Format gambar tidak valid atau terlalu besar.';
        } else {
          errorMessage += ocrResult.ErrorMessage;
        }
      } else {
        errorMessage += 'Pastikan gambar jelas dan berformat yang didukung (JPG, PNG).';
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: ocrResult.ErrorMessage || 'UNKNOWN_ERROR'
      });
    }

  } catch (error) {
    console.error('Error processing image:', error);
    
    // 🔧 Error handling yang lebih user-friendly
    let userMessage = 'Terjadi kesalahan saat memproses gambar. ';
    
    if (error.message.includes('fetch')) {
      userMessage += 'Koneksi ke server OCR gagal.';
    } else if (error.message.includes('JSON')) {
      userMessage += 'Response server tidak valid.';
    } else {
      userMessage += 'Silakan coba lagi.';
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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