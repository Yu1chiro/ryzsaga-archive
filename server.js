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
    driveUrl: "https://drive.google.com/uc?export=download&id=COMING_SOON",
    // driveUrl: "https://drive.google.com/uc?export=download&id=1ILrow21HipX_YGHzAnk6lchWH9PUdeby",
    category: "Genba"
  },
  {
    id: 5,
    title: "Buku Modul SSW Pengolahan Makanan",
    description: "Free Download",
    thumbnail: "https://ucarecdn.com/241e8a5b-ef54-4a2f-9715-d325dc26192a/makanan.png",
    driveUrl: "https://drive.google.com/uc?export=download&id=COMING_SOON",
    // driveUrl: "https://drive.google.com/uc?export=download&id=1A66wwXnJXikaDk43ftz5k6qVviStql_w",
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
// Route untuk verifikasi gambar dengan Gemini API
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

    // console.log('Memproses gambar untuk file:', file.title);

    // 🔥 Menggunakan Gemini API untuk analisis gambar
    const GEMINI_API_KEY = 'AIzaSyA2-TrJpGriUVGV9aP3Ft7OURJ2bDe0_n8'; // Ganti dengan API key Anda
    
    // Hapus prefix data:image/...;base64, dari imageData
    const base64Image = imageData.replace(/^data:image\/[^;]+;base64,/, '');
    
    // Deteksi MIME type dari imageData
    const mimeTypeMatch = imageData.match(/^data:image\/([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? `image/${mimeTypeMatch[1]}` : 'image/jpeg';

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text: `Analisis gambar ini dan cari teks yang mengandung salah satu dari kata-kata berikut:
              
              Nama/Username: "ryz saga", "ryzsaga", "ryz_saga", "@ryz", "@ryzsaga", "saga ryz", "sagarz", "ryzaga"
              
              Kata kunci pesan: "pesan", "message", "messages", "direct message", "dm", "chat"
              
              Berikan respons dalam format JSON dengan struktur berikut:
              {
                "hasRyzSaga": true/false,
                "hasPesan": true/false,
                "detectedText": "teks yang ditemukan",
                "detectedVariants": ["varian yang terdeteksi"]
              }
              
              Jika tidak ada teks yang terdeteksi, berikan hasRyzSaga: false dan hasPesan: false.`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(geminiPayload)
    });

    const geminiResult = await response.json();
    // console.log('Gemini Result:', geminiResult);

    if (geminiResult.candidates && geminiResult.candidates.length > 0) {
      const text = geminiResult.candidates[0].content.parts[0].text;
      // console.log('Teks respons dari Gemini:', text);
      
      let analysisResult;
      try {
        // Coba parse JSON dari respons Gemini
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: analisis manual jika Gemini tidak memberikan JSON
          const normalizedText = text.toLowerCase()
            .replace(/[^\w\s@]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const textVariants = [
            'ryz saga', 'ryzsaga', 'ryz_saga', '@ryz', '@ryzsaga', 
            'saga ryz', 'sagarz', 'ryzaga'
          ];
          
          const pesanVariants = [
            'pesan', 'message', 'messages', 'direct message', 'dm', 'chat'
          ];
          
          const hasRyzSaga = textVariants.some(variant => 
            normalizedText.includes(variant)
          );
          
          const hasPesan = pesanVariants.some(variant => 
            normalizedText.includes(variant)
          );
          
          analysisResult = {
            hasRyzSaga,
            hasPesan,
            detectedText: text,
            detectedVariants: textVariants.filter(v => normalizedText.includes(v))
          };
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        // Fallback ke analisis sederhana
        const normalizedText = text.toLowerCase();
        const hasRyzSaga = normalizedText.includes('ryz') || normalizedText.includes('saga');
        const hasPesan = normalizedText.includes('pesan') || normalizedText.includes('message');
        
        analysisResult = {
          hasRyzSaga,
          hasPesan,
          detectedText: text,
          detectedVariants: []
        };
      }

      console.log('Analysis result:', analysisResult);

      // 🎯 Kondisi verifikasi
      if (analysisResult.hasRyzSaga && (analysisResult.hasPesan || analysisResult.hasRyzSaga)) {
        res.json({
          success: true,
          message: 'Wah makasi ya sudh support akun ini! Ganbattene! 🎉',
          downloadUrl: file.driveUrl,
          fileName: file.title,
          detectedText: analysisResult.detectedText,
          detectedVariants: analysisResult.detectedVariants || []
        });
      } else {
        // 🔧 Berikan feedback yang lebih informatif
        let feedbackMessage = 'Oops! ';
        
        if (!analysisResult.hasRyzSaga) {
          feedbackMessage += 'Kayanya kamu belum follow deh, follow dlu ya! ';
        }
        
        if (!analysisResult.hasPesan) {
          feedbackMessage += 'pastikan gambarnya jelas ya ';
        }
        
        feedbackMessage += 'kalo sudah follow tapi gabisa download langsung dm ya!';

        res.json({
          success: false,
          message: feedbackMessage,
          detectedText: analysisResult.detectedText,
          debug: {
            hasRyzSaga: analysisResult.hasRyzSaga,
            hasPesan: analysisResult.hasPesan,
            geminiResponse: text.substring(0, 200) // Limited untuk debug
          }
        });
      }

    } else {
      // console.error('Gemini Error:', geminiResult);
      
      // 🔧 Error handling yang lebih spesifik
      let errorMessage = 'Gagal memproses gambar dengan Gemini. ';
      
      if (geminiResult.error) {
        if (geminiResult.error.message.includes('API key')) {
          errorMessage += 'API key tidak valid.';
        } else if (geminiResult.error.message.includes('quota')) {
          errorMessage += 'Kuota API habis.';
        } else if (geminiResult.error.message.includes('image')) {
          errorMessage += 'Format gambar tidak didukung.';
        } else {
          errorMessage += geminiResult.error.message;
        }
      } else {
        errorMessage += 'Pastikan gambar jelas dan berformat yang didukung (JPG, PNG).';
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: geminiResult.error?.code || 'UNKNOWN_ERROR'
      });
    }

  } catch (error) {
    console.error('Error processing image:', error);
    
    // 🔧 Error handling yang lebih user-friendly
    let userMessage = 'Terjadi kesalahan saat memproses gambar. ';
    
    if (error.message.includes('fetch')) {
      userMessage += 'Koneksi ke server Gemini gagal.';
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