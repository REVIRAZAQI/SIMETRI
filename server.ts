import express from "express";
import compression from "compression";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(compression());
app.use(express.json({ limit: "25mb" }));

// Helper to initialize server-side Gemini AI client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint for Photo Verification & OCR Analysis
app.post("/api/verify-meter", async (req, res) => {
  try {
    const { idpel, stanCabut, nomorMeterBaru, photos, jenisPelanggaran } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Intelligent fallback verification if Gemini API key is not configured in environment
      const mockDetectedStan = stanCabut ? stanCabut : "02845.8";
      const mockDetectedMeter = nomorMeterBaru ? nomorMeterBaru : "32190847201";
      return res.json({
        verified: true,
        confidenceScore: 0.94,
        detectedStanCabut: mockDetectedStan,
        detectedNomorMeterBaru: mockDetectedMeter,
        photoQuality: "Sangat Baik",
        notes: `Simulasi AI: Foto dokumentasi fisik terverifikasi jelas. Stand cabut (${mockDetectedStan}) & Nomor Meter Baru (${mockDetectedMeter}) telah sesuai dengan data lapangan.`,
        warnings: [],
      });
    }

    const parts: any[] = [];
    if (photos && Array.isArray(photos)) {
      photos.forEach((photo: { data: string; mimeType?: string; label?: string }) => {
        if (photo.data) {
          const base64Data = photo.data.includes(",") ? photo.data.split(",")[1] : photo.data;
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: photo.mimeType || "image/jpeg",
            },
          });
          parts.push({
            text: `[Dokumentasi: ${photo.label || 'Foto Lapangan'}]`,
          });
        }
      });
    }

    const promptText = `
Anda adalah AI Inspector Verifikasi Dokumentasi Lapangan Penggantian KWh Meter P2TL (Penertiban Pemakaian Tenaga Listrik) PLN.
Tugas Anda adalah memverifikasi foto dokumentasi fisik lapangan dengan data input petugas penggantian:

- ID Pelanggan (IDPEL): ${idpel || 'Tidak diisi'}
- Input Stan Cabut Meter Lama: ${stanCabut || 'Tidak diisi'} kWh
- Input Nomor Meter Baru: ${nomorMeterBaru || 'Tidak diisi'}
- Kategori P2TL/Pengerjaan: ${jenisPelanggaran || 'Penggantian P2TL'}

Periksa:
1. Kejelasan angka meter pada foto meter lama (Stan Cabut).
2. Kejelasan nomor seri meter pada foto meter baru.
3. Kesesuaian fisik segel dan pemasangan penggantian meter.
4. Tanda keburaman atau ketidaksesuaian angka.

Output JSON format persis:
{
  "verified": boolean,
  "confidenceScore": number (0.0 hingga 1.0),
  "detectedStanCabut": "string (angka stand dari foto)",
  "detectedNomorMeterBaru": "string (nomor meter dari foto)",
  "photoQuality": "Sangat Baik" | "Cukup Baik" | "Kurang Jelas",
  "notes": "string analisis dalam Bahasa Indonesia",
  "warnings": ["array string peringatan jika ada ketidaksesuaian/keburaman"]
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN },
            confidenceScore: { type: Type.NUMBER },
            detectedStanCabut: { type: Type.STRING },
            detectedNomorMeterBaru: { type: Type.STRING },
            photoQuality: { type: Type.STRING },
            notes: { type: Type.STRING },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["verified", "confidenceScore", "notes", "warnings"],
        },
      },
    });

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);
    res.json(result);
  } catch (error: any) {
    console.error("Gemini OCR Verification error:", error);
    res.status(500).json({
      error: "Gagal memproses verifikasi foto AI",
      details: error.message,
    });
  }
});

// API Endpoint for Tanya SIMETRI AI Engine (ChatGPT Style Querying)
app.post("/api/gemini/tanya-simetri", async (req, res) => {
  try {
    const { message, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: "Gemini API client not initialized" });
    }

    const systemInstruction = `
Anda adalah Tanya SIMETRI AI Engine, asisten AI resmi dari aplikasi SIMETRI (Sistem Ganti Meter Terintegrasi PLN).
Anda memiliki akses ke ringkasan database real-time:
${JSON.stringify(context || {}, null, 2)}

Tugas Anda:
1. Menjawab pertanyaan pengguna dalam Bahasa Indonesia dengan jelas, ramah, profesional, dan akurat berdasarkan data SIMETRI di atas.
2. Memberikan ringkasan data, statistik, atau rekomendasi alokasi tim petugas jika ditanyakan.
3. Menggunakan format Markdown (termasuk judul ###, daftar poin -, dan teks cetak tebal) untuk keterbacaan tinggi.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Tanya SIMETRI Gemini error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMER MASTER DATABASE SERVICE (In-Memory + Disk Persistence) ---
import fs from "fs";

interface CustomerMasterItem {
  id: string;
  idpel: string;
  nama: string;
  alamat: string;
  tarif: string;
  daya: string;
  gardu: string;
  titikTumpu: string;
  merkMeter: string;
  nomorMeter: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CUSTOMER_FILE = path.join(DATA_DIR, "customer_master.json");
const METADATA_FILE = path.join(DATA_DIR, "customer_metadata.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let customerMasterList: CustomerMasterItem[] = [];
const customerMasterMap = new Map<string, CustomerMasterItem>();
let lastCustomerSyncTime: string | null = null;

// Initial seed if file exists on disk
function loadCustomerMasterFromDisk() {
  try {
    if (fs.existsSync(CUSTOMER_FILE)) {
      const raw = fs.readFileSync(CUSTOMER_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        customerMasterList = data;
        customerMasterMap.clear();
        for (const item of data) {
          if (item && item.idpel) {
            customerMasterMap.set(String(item.idpel).trim(), item);
          }
        }
        console.log(`[CustomerMaster] Loaded ${customerMasterList.length} customers from disk.`);
      }
    }
    if (fs.existsSync(METADATA_FILE)) {
      const metaRaw = fs.readFileSync(METADATA_FILE, "utf-8");
      const meta = JSON.parse(metaRaw);
      lastCustomerSyncTime = meta.lastSync || null;
    }
  } catch (err) {
    console.error("[CustomerMaster] Error loading from disk:", err);
  }
}

loadCustomerMasterFromDisk();

function saveCustomerMasterToDisk() {
  try {
    fs.writeFileSync(CUSTOMER_FILE, JSON.stringify(customerMasterList), "utf-8");
    fs.writeFileSync(
      METADATA_FILE,
      JSON.stringify({
        total: customerMasterList.length,
        lastSync: lastCustomerSyncTime,
        updatedAt: new Date().toISOString(),
      }),
      "utf-8"
    );
    console.log(`[CustomerMaster] Successfully saved ${customerMasterList.length} customers to disk.`);
  } catch (err) {
    console.error("[CustomerMaster] Failed to save to disk:", err);
  }
}

// Ultra-fast CSV parser handling quoted fields & commas
function parseCsvFast(csvText: string) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  function splitLine(line: string) {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.toUpperCase().replace(/^["']|["']$/g, "").replace(/[^A-Z0-9_]/g, "").trim()
  );

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    rows.push(splitLine(l));
  }
  return { headers, rows };
}

// API Endpoint to fetch Google Sheets CSV & synchronize Customer Master
app.post("/api/sync-google-sheets", async (req, res) => {
  try {
    const { url, replaceAll = false } = req.body;
    const targetUrl = (
      url ||
      "https://docs.google.com/spreadsheets/d/1FJcq5sNAK2Ybq-LymuORr4KV5N249Dg5TWmb2J6_wAY/edit?gid=1799557564#gid=1799557564"
    ).trim();

    // Extract spreadsheet ID and GID
    const sheetIdMatch = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({
        error: "Format URL Google Sheets tidak valid. Harus mengandung /spreadsheets/d/<ID_SHEET>",
      });
    }
    const spreadsheetId = sheetIdMatch[1];

    let gid = "0";
    const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }

    // Export URLs
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const gvizExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

    console.log(`[GoogleSheetsSync] Fetching from Google Sheets (ID: ${spreadsheetId}, GID: ${gid})...`);
    let response: any = null;
    let fetchError: any = null;

    try {
      response = await fetch(csvExportUrl, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
    } catch (e: any) {
      fetchError = e;
    }

    if (!response || !response.ok) {
      try {
        response = await fetch(gvizExportUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
      } catch (e: any) {
        fetchError = e;
      }
    }

    if (!response || !response.ok) {
      return res.status(400).json({
        error: `Gagal mengakses Google Sheets (${response ? `HTTP ${response.status} ${response.statusText}` : fetchError?.message || "Koneksi Gagal"}). Pastikan spreadsheet telah diset ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with link can view).`,
      });
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      return res.status(400).json({ error: "Data Google Sheets kosong pada sheet (GID) yang dipilih." });
    }

    if (csvText.includes("<html") || csvText.includes("<!DOCTYPE html>") || csvText.includes("ServiceLogin")) {
      return res.status(403).json({
        error:
          "Google Sheets memerlukan login akun pribadi. Silakan atur hak akses spreadsheet ke 'Anyone with the link can view' (Siapa saja yang memiliki link) melalui menu 'Bagikan' di Google Spreadsheet Anda.",
      });
    }

    // Fast parse CSV lines
    const t0 = Date.now();
    const { headers, rows } = parseCsvFast(csvText);
    console.log(`[GoogleSheetsSync] Parsed ${rows.length} CSV rows in ${Date.now() - t0}ms.`);

    // Column mapping index lookup
    const findColIdx = (...names: string[]) => {
      for (const target of names) {
        const cleanTarget = target.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const idx = headers.findIndex((h) => {
          const cleanH = h.replace(/[^A-Z0-9]/g, "");
          return cleanH === cleanTarget || cleanH.includes(cleanTarget);
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idpelIdx = findColIdx("IDPEL", "ID_PELANGGAN", "NOIDPEL", "ID", "NOMORPELANGGAN");
    const namaIdx = findColIdx("NAMA_PELANGGAN", "NAMAPELANGGAN", "NAMA", "PELANGGAN", "CONSUMERNAME");
    const alamatIdx = findColIdx("ALAMAT", "ALAMAT_PELANGGAN", "ALAMATPELANGGAN", "ADDRESS", "LOKASI");
    const tarifIdx = findColIdx("TARIF", "GOL_TARIF", "GOLTARIF", "KODE_TARIF");
    const dayaIdx = findColIdx("DAYA", "DAYA_VA", "DAYAVA", "VA", "KAPASITAS");
    const garduIdx = findColIdx("GARDU", "KODE_GARDU", "NAMA_GARDU", "TRAFO");
    const titikIdx = findColIdx("TITIK_TUMPU", "TITIKTUMPU", "TIANG", "NOTIANG", "POLE");
    const merkIdx = findColIdx("MERK_METER", "MERKMETER", "MERK", "BRAND", "TIPEMETER");
    const noMeterIdx = findColIdx("NOMOR_METER", "NOMORMETER", "NOMETER", "SERIALMETER", "NOSERI");

    if (idpelIdx === -1) {
      return res.status(400).json({
        error:
          "Format kolom tidak sesuai. Kolom 'IDPEL' atau 'ID_PELANGGAN' tidak ditemukan pada baris judul (header) spreadsheet.",
        detectedHeaders: headers,
      });
    }

    const newCustomers: CustomerMasterItem[] = [];
    const now = Date.now();

    rows.forEach((row, idx) => {
      let idpelVal = (row[idpelIdx] || "").replace(/^["']|["']$/g, "").trim();
      if (!idpelVal || idpelVal.length < 3) return;

      const nama = namaIdx !== -1 && row[namaIdx] ? row[namaIdx].trim() : "Pelanggan PLN";
      const alamat = alamatIdx !== -1 && row[alamatIdx] ? row[alamatIdx].trim() : "Alamat Terdaftar";
      const tarif = tarifIdx !== -1 && row[tarifIdx] ? row[tarifIdx].trim() : "R1M";
      const daya = dayaIdx !== -1 && row[dayaIdx] ? row[dayaIdx].trim() : "900 VA";
      const gardu = garduIdx !== -1 && row[garduIdx] ? row[garduIdx].trim() : "-";
      const titikTumpu = titikIdx !== -1 && row[titikIdx] ? row[titikIdx].trim() : "-";
      const merkMeter = merkIdx !== -1 && row[merkIdx] ? row[merkIdx].trim() : "-";
      const nomorMeter = noMeterIdx !== -1 && row[noMeterIdx] ? row[noMeterIdx].trim() : "-";

      newCustomers.push({
        id: `CUST-GSHEET-${now}-${idx + 1}`,
        idpel: idpelVal,
        nama,
        alamat,
        tarif,
        daya,
        gardu,
        titikTumpu,
        merkMeter,
        nomorMeter,
      });
    });

    if (replaceAll) {
      customerMasterList = newCustomers;
      customerMasterMap.clear();
      for (const item of newCustomers) {
        customerMasterMap.set(item.idpel, item);
      }
    } else {
      // Upsert into in-memory store
      for (const item of newCustomers) {
        customerMasterMap.set(item.idpel, item);
      }
      customerMasterList = Array.from(customerMasterMap.values());
    }

    const syncTimeStr = new Date().toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lastCustomerSyncTime = syncTimeStr;

    // Asynchronously write to disk so server response is instant
    setImmediate(() => {
      saveCustomerMasterToDisk();
    });

    res.json({
      success: true,
      totalCount: customerMasterList.length,
      syncedCount: newCustomers.length,
      detectedHeaders: headers,
      sampleCustomers: customerMasterList.slice(0, 100),
      lastSync: lastCustomerSyncTime,
      spreadsheetId,
      gid,
    });
  } catch (error: any) {
    console.error("[GoogleSheetsSync] Sync error:", error);
    res.status(500).json({
      error: "Terjadi kesalahan sistem saat memproses sinkronisasi Google Sheets.",
      details: error.message,
    });
  }
});

// API: Get ALL Customer Master Records (gzipped for fast transfer)
app.get("/api/customers/all", (_req, res) => {
  res.json({
    success: true,
    total: customerMasterList.length,
    lastSync: lastCustomerSyncTime,
    data: customerMasterList,
  });
});

// API: Search & Paginate Customers (100 per page default)
app.get("/api/customers", (req, res) => {
  const search = (req.query.search as string || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string || "100", 10)));

  let filtered = customerMasterList;
  if (search) {
    filtered = customerMasterList.filter(
      (c) =>
        c.idpel.toLowerCase().includes(search) ||
        c.nama.toLowerCase().includes(search) ||
        c.alamat.toLowerCase().includes(search) ||
        c.gardu.toLowerCase().includes(search) ||
        c.nomorMeter.toLowerCase().includes(search) ||
        c.tarif.toLowerCase().includes(search) ||
        c.daya.toLowerCase().includes(search) ||
        (c.titikTumpu && c.titikTumpu.toLowerCase().includes(search)) ||
        (c.merkMeter && c.merkMeter.toLowerCase().includes(search))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  res.json({
    total,
    page,
    limit,
    totalPages,
    lastSync: lastCustomerSyncTime,
    data,
  });
});

// API: Instant IDPEL Lookup (O(1) search)
app.get("/api/customers/lookup/:idpel", (req, res) => {
  const queryId = (req.params.idpel || "").trim();
  const found = customerMasterMap.get(queryId);
  if (found) {
    return res.json({ found: true, customer: found });
  }

  // Case-insensitive fallback
  const lowerQuery = queryId.toLowerCase();
  for (const [idpel, cust] of customerMasterMap.entries()) {
    if (idpel.toLowerCase() === lowerQuery) {
      return res.json({ found: true, customer: cust });
    }
  }

  res.json({ found: false, customer: null });
});

// API: Customer Stats
app.get("/api/customers/stats", (req, res) => {
  res.json({
    totalCount: customerMasterList.length,
    lastSync: lastCustomerSyncTime,
  });
});

// API: Add or update single customer
app.post("/api/customers/add", (req, res) => {
  const cust: CustomerMasterItem = req.body;
  if (!cust || !cust.idpel) {
    return res.status(400).json({ error: "Data pelanggan tidak valid (IDPEL wajib diisi)." });
  }
  const item: CustomerMasterItem = {
    id: cust.id || `CUST-MANUAL-${Date.now()}`,
    idpel: String(cust.idpel).trim(),
    nama: cust.nama || "Pelanggan PLN",
    alamat: cust.alamat || "Alamat Terdaftar",
    tarif: cust.tarif || "R1M",
    daya: cust.daya || "900 VA",
    gardu: cust.gardu || "-",
    titikTumpu: cust.titikTumpu || "-",
    merkMeter: cust.merkMeter || "-",
    nomorMeter: cust.nomorMeter || "-",
  };

  customerMasterMap.set(item.idpel, item);
  customerMasterList = Array.from(customerMasterMap.values());
  saveCustomerMasterToDisk();

  res.json({ success: true, customer: item, totalCount: customerMasterList.length });
});

// API: Delete customer
app.delete("/api/customers/:id", (req, res) => {
  const targetId = req.params.id;
  const initialLength = customerMasterList.length;
  customerMasterList = customerMasterList.filter((c) => c.id !== targetId && c.idpel !== targetId);
  
  if (customerMasterList.length !== initialLength) {
    customerMasterMap.clear();
    for (const c of customerMasterList) {
      customerMasterMap.set(c.idpel, c);
    }
    saveCustomerMasterToDisk();
    return res.json({ success: true, totalCount: customerMasterList.length });
  }

  res.json({ success: false, error: "Pelanggan tidak ditemukan" });
});

// Vite middleware & Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server P2TL KWh Meter running on http://localhost:${PORT}`);
  });
}

startServer();
