import { CustomerData, ReplacementRecord, WorkOrderTarget, CustomerMasterItem, GangguanAppRecord, GametRecord, GametWorkOrderTarget, UserAccount } from '../types';

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'USR-001',
    username: 'admin',
    password: 'admin123',
    namaLengkap: 'Administrator SIMETRI',
    role: 'Admin',
    unitKerja: 'PLN Kantor UP3 Semarang',
    statusActive: true,
    createdAt: '2026-01-01 08:00'
  },
  {
    id: 'USR-002',
    username: 'yantek',
    password: 'yantek123',
    namaLengkap: 'Petugas Yantek Posko Utama',
    role: 'Yantek',
    unitKerja: 'Posko Yantek ULP Semarang Tengah',
    statusActive: true,
    createdAt: '2026-01-02 09:15'
  },
  {
    id: 'USR-003',
    username: 'billman',
    password: 'billman123',
    namaLengkap: 'Petugas Cater Billman',
    role: 'Billman',
    unitKerja: 'Tim Pembaca Meter ULP Semarang',
    statusActive: true,
    createdAt: '2026-01-02 10:00'
  },
  {
    id: 'USR-004',
    username: 'yanbung',
    password: 'yanbung123',
    namaLengkap: 'Petugas Pelayanan Penyambungan (P2TL)',
    role: 'Yanbung',
    unitKerja: 'Tim P2TL Yanbung Posko Alpha',
    statusActive: true,
    createdAt: '2026-01-03 11:30'
  },
  {
    id: 'USR-005',
    username: 'gamet',
    password: 'gamet123',
    namaLengkap: 'Petugas Ganti Meter (Gamet)',
    role: 'Gamet',
    unitKerja: 'Tim Ganti KWh Meter Pra-Pasca',
    statusActive: true,
    createdAt: '2026-01-03 14:20'
  }
];

export const INITIAL_CUSTOMER_DATABASE: CustomerMasterItem[] = [
  {
    id: 'CUST-001',
    idpel: '538900778899',
    nama: 'Ahmad Subagyo',
    alamat: 'Jl. Pemuda No. 45, Semarang Tengah',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'SMG-012',
    titikTumpu: 'Tiang P1-04',
    merkMeter: 'Fuji Dharma',
    nomorMeter: '0189230412'
  },
  {
    id: 'CUST-002',
    idpel: '538900334455',
    nama: 'CV Mandiri Jaya',
    alamat: 'Kawasan Industri Terboyo Blok B12, Semarang',
    tarif: 'B1',
    daya: '3500 VA',
    gardu: 'TRB-088',
    titikTumpu: 'Tiang B2-18',
    merkMeter: 'Itron Smart',
    nomorMeter: '14209823411'
  },
  {
    id: 'CUST-003',
    idpel: '538900112244',
    nama: 'H. Suryadi',
    alamat: 'Jl. Pandanaran No. 12, Semarang',
    tarif: 'R1',
    daya: '1300 VA',
    gardu: 'PDN-005',
    titikTumpu: 'Tiang A1-02',
    merkMeter: 'Hexing',
    nomorMeter: '22890192834'
  },
  {
    id: 'CUST-004',
    idpel: '538100123456',
    nama: 'Budi Santoso',
    alamat: 'Jl. Merdeka No. 45, RT 03/RW 05, Bintaro',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'BG-042',
    titikTumpu: 'Tiang B2-14',
    merkMeter: 'Sanxing',
    nomorMeter: '14109823412'
  },
  {
    id: 'CUST-005',
    idpel: '538100789012',
    nama: 'PT Sejahtera Abadi',
    alamat: 'Jl. Raya Ciputat No. 102, Kebayoran Lama',
    tarif: 'B1',
    daya: '5500 VA',
    gardu: 'BG-118',
    titikTumpu: 'Tiang C1-05',
    merkMeter: 'Glomet',
    nomorMeter: '22876543210'
  }
];

export const INITIAL_WORK_ORDERS: WorkOrderTarget[] = [
  {
    id: 'WO-2026-001',
    idpel: '538100123456',
    namaPelanggan: 'Budi Santoso',
    alamatPelanggan: 'Jl. Merdeka No. 45, RT 03/RW 05, Kel. Bintaro, Jakarta Selatan',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'BG-042',
    titikTumpu: 'Tiang B2-14',
    merkMeterLama: 'Itron',
    nomorMeterLama: '14109823412',
    jenisPelanggaran: 'P2TL_KATEGORI_II',
    assignedTim: 'Tim Penormalan Alpha 01',
    status: 'SELESAI',
    catatanSupervisor: 'P2TL Hasil Temuan Penertiban Lapangan. Lakukan penggantian KWh meter secepatnya.',
    uploadedAt: '2026-07-27 08:00'
  },
  {
    id: 'WO-2026-002',
    idpel: '538100789012',
    namaPelanggan: 'PT Sejahtera Abadi (Toko Elektronik)',
    alamatPelanggan: 'Jl. Raya Ciputat No. 102, Kebayoran Lama, Jakarta Selatan',
    tarif: 'B1',
    daya: '5500 VA',
    gardu: 'BG-118',
    titikTumpu: 'Tiang C1-05',
    merkMeterLama: 'Hexing',
    nomorMeterLama: '22876543210',
    jenisPelanggaran: 'PROGRAM_PENGGANTIAN_RUSAK',
    assignedTim: 'Tim Penormalan Bravo 02',
    status: 'SELESAI',
    catatanSupervisor: 'Laporan Meter Buram / Rusak dari pelanggan. Penggantian unit baru.',
    uploadedAt: '2026-07-28 09:15'
  },
  {
    id: 'WO-2026-003',
    idpel: '538200345678',
    namaPelanggan: 'Siti Rahmawati',
    alamatPelanggan: 'Komp. PLN Blok C3 No. 12, Kel. Pondok Pinang, Kebayoran Lama',
    tarif: 'R1',
    daya: '1300 VA',
    gardu: 'KY-008',
    titikTumpu: 'Tiang A3-22',
    merkMeterLama: 'Sanxing',
    nomorMeterLama: '01928374651',
    jenisPelanggaran: 'P2TL_KATEGORI_I',
    assignedTim: 'Tim Penormalan Alpha 01',
    status: 'BELUM_DIGANTI',
    catatanSupervisor: 'Penertiban P2TL Kat I. Pembatasan daya melebihi kontrak. Harap ganti meter dan catat stan cabut.',
    uploadedAt: '2026-07-29 10:00'
  },
  {
    id: 'WO-2026-004',
    idpel: '538200901234',
    namaPelanggan: 'Haji Ahmad Dahlan',
    alamatPelanggan: 'Jl. Radio Dalam Raya No. 88, Gandaria Utara, Kebayoran Baru',
    tarif: 'R2',
    daya: '3500 VA',
    gardu: 'KY-055',
    titikTumpu: 'Tiang D4-01',
    merkMeterLama: 'Fuji',
    nomorMeterLama: '33445566778',
    jenisPelanggaran: 'PROGRAM_PERIODIK_TUA',
    assignedTim: 'Tim Penormalan Charlie 03',
    status: 'BELUM_DIGANTI',
    catatanSupervisor: 'Penggantian meter tua (re-aging tahun 2012). Mohon catat stan cabut dan nomor kwh baru.',
    uploadedAt: '2026-07-30 07:30'
  },
  {
    id: 'WO-2026-005',
    idpel: '538300567890',
    namaPelanggan: 'Warung Makan Sederhana (H. Umar)',
    alamatPelanggan: 'Jl. Sultan Hasanuddin No. 14, Melawai, Kebayoran Baru',
    tarif: 'B1',
    daya: '2200 VA',
    gardu: 'BM-012',
    titikTumpu: 'Tiang B1-09',
    merkMeterLama: 'Smart',
    nomorMeterLama: '44556677889',
    jenisPelanggaran: 'P2TL_KATEGORI_III',
    assignedTim: 'Tim Penormalan Bravo 02',
    status: 'BELUM_DIGANTI',
    catatanSupervisor: 'BA P2TL No. 049/2026. Lakukan penggantian KWh meter, foto stan cabut, dan input nomor meter baru.',
    uploadedAt: '2026-07-30 08:00'
  }
];

export const MOCK_CUSTOMERS: CustomerData[] = [
  {
    idpel: '538100123456',
    nama: 'Budi Santoso',
    alamat: 'Jl. Merdeka No. 45, RT 03/RW 05, Kel. Bintaro, Pesanggrahan, Jakarta Selatan',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'BG-042',
    merkMeterLama: 'Itron',
    nomorMeterLama: '14109823412'
  },
  {
    idpel: '538100789012',
    nama: 'PT Sejahtera Abadi (Toko Elektronik)',
    alamat: 'Jl. Raya Ciputat No. 102, Kebayoran Lama, Jakarta Selatan',
    tarif: 'B1',
    daya: '5500 VA',
    gardu: 'BG-118',
    merkMeterLama: 'Hexing',
    nomorMeterLama: '22876543210'
  },
  {
    idpel: '538200345678',
    nama: 'Siti Rahmawati',
    alamat: 'Komp. PLN Blok C3 No. 12, Kel. Pondok Pinang, Kebayoran Lama',
    tarif: 'R1',
    daya: '1300 VA',
    gardu: 'KY-008',
    merkMeterLama: 'Sanxing',
    nomorMeterLama: '01928374651'
  },
  {
    idpel: '538200901234',
    nama: 'Haji Ahmad Dahlan',
    alamat: 'Jl. Radio Dalam Raya No. 88, Gandaria Utara, Kebayoran Baru',
    tarif: 'R2',
    daya: '3500 VA',
    gardu: 'KY-055',
    merkMeterLama: 'Fuji',
    nomorMeterLama: '33445566778'
  },
  {
    idpel: '538300567890',
    nama: 'Warung Makan Sederhana (H. Umar)',
    alamat: 'Jl. Sultan Hasanuddin No. 14, Melawai, Kebayoran Baru',
    tarif: 'B1',
    daya: '2200 VA',
    gardu: 'BM-012',
    merkMeterLama: 'Smart',
    nomorMeterLama: '44556677889'
  }
];

export const INITIAL_RECORDS: ReplacementRecord[] = [
  {
    id: 'REC-2026-001',
    noBeritaAcara: 'BA-P2TL/53810/2026/07/001',
    idpel: '538100123456',
    namaPelanggan: 'Budi Santoso',
    alamatPelanggan: 'Jl. Merdeka No. 45, RT 03/RW 05, Kel. Bintaro, Jakarta Selatan',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'BG-042',
    titikTumpu: 'Tiang B2-14',
    stanCabut: '04812.5',
    stanCabutWbp: '0000.0',
    merkMeterLama: 'Itron',
    nomorMeterLama: '14109823412',
    nomorMeterBaru: '32190847201',
    merkMeterBaru: 'Itron Smart KWh',
    stanAwalBaru: '00000.0',
    tanggalGanti: '2026-07-28',
    waktuGanti: '10:30',
    namaPetugas: 'Rian Febrianto & Tim',
    timP2TL: 'Tim Penormalan Alpha 01',
    jenisPelanggaran: 'P2TL_KATEGORI_II',
    catatanPetugas: 'Ditemukan segel tera rusak dan penyimpangan pengawatan pada terminal meter lama. Dilakukan pencabutan dan penggantian unit baru.',
    photos: [
      {
        id: 'p1',
        label: 'STAN_CABUT_LAMA',
        title: 'Foto Stan Cabut Meter Lama',
        dataUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
        timestamp: '2026-07-28 10:25:12',
        location: { latitude: -6.2615, longitude: 106.7812, address: 'Jl. Merdeka No. 45, Bintaro' }
      },
      {
        id: 'p2',
        label: 'METER_BARU',
        title: 'Foto KWh Meter Baru Terpasang',
        dataUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        timestamp: '2026-07-28 10:45:00',
        location: { latitude: -6.2615, longitude: 106.7812, address: 'Jl. Merdeka No. 45, Bintaro' }
      },
      {
        id: 'p3',
        label: 'SEGEL_DAN_BA',
        title: 'Foto Segel Baru & Berita Acara Ditandatangani',
        dataUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
        timestamp: '2026-07-28 11:00:15'
      }
    ],
    verificationStatus: 'VERIFIED',
    aiVerification: {
      verified: true,
      confidenceScore: 0.96,
      detectedStanCabut: '04812.5',
      detectedNomorMeterBaru: '32190847201',
      photoQuality: 'Sangat Baik',
      notes: 'Dokumentasi lengkap. Nomor seri meter baru dan angka stan cabut terverifikasi 100% cocok dengan foto fisik.',
      warnings: [],
      verifiedAt: '2026-07-28 11:05:00'
    },
    createdAt: '2026-07-28T10:30:00.000Z',
    updatedAt: '2026-07-28T11:05:00.000Z'
  },
  {
    id: 'REC-2026-002',
    noBeritaAcara: 'BA-P2TL/53810/2026/07/002',
    idpel: '538100789012',
    namaPelanggan: 'PT Sejahtera Abadi (Toko Elektronik)',
    alamatPelanggan: 'Jl. Raya Ciputat No. 102, Kebayoran Lama, Jakarta Selatan',
    tarif: 'B1',
    daya: '5500 VA',
    gardu: 'BG-118',
    stanCabut: '12940.0',
    merkMeterLama: 'Hexing',
    nomorMeterLama: '22876543210',
    nomorMeterBaru: '44019283711',
    merkMeterBaru: 'Hexing Digital Smart',
    stanAwalBaru: '00000.0',
    tanggalGanti: '2026-07-29',
    waktuGanti: '14:15',
    namaPetugas: 'Dedi Kurniawan',
    timP2TL: 'Tim P2TL Bravo 02',
    jenisPelanggaran: 'PROGRAM_PENGGANTIAN_RUSAK',
    catatanPetugas: 'Layar LCD KWh meter lama buram dan berembun tidak terlihat angka stan. Dilakukan pembongkaran dan pencatatan stan terkhir.',
    photos: [
      {
        id: 'p4',
        label: 'STAN_CABUT_LAMA',
        title: 'Foto Meter Lama Buram',
        dataUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
        timestamp: '2026-07-29 14:10:00'
      },
      {
        id: 'p5',
        label: 'METER_BARU',
        title: 'Foto KWh Meter Baru Hexing',
        dataUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        timestamp: '2026-07-29 14:30:00'
      }
    ],
    verificationStatus: 'PENDING',
    aiVerification: {
      verified: true,
      confidenceScore: 0.88,
      detectedStanCabut: '12940.0',
      detectedNomorMeterBaru: '44019283711',
      photoQuality: 'Cukup Baik',
      notes: 'Foto meter lama agak redup namun angka dapat diidentifikasi.',
      warnings: ['Disarankan menambah foto kondisi terminal meter lama.'],
      verifiedAt: '2026-07-29 14:35:00'
    },
    createdAt: '2026-07-29T14:15:00.000Z',
    updatedAt: '2026-07-29T14:35:00.000Z'
  }
];

export const INITIAL_GANGGUAN_RECORDS: GangguanAppRecord[] = [
  {
    id: 'GAPP-2026-001',
    noLaporan: 'YNT-20260728-081',
    noGangguan: 'GGN-881920',
    idpel: '538900778899',
    namaPelanggan: 'Ahmad Subagyo',
    alamatPelanggan: 'Jl. Pemuda No. 45, Semarang Tengah',
    nomorTelepon: '081234567890',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'SMG-012',
    titikTumpu: 'Tiang P1-04',
    merkMeter: 'Fuji Dharma',
    nomorMeter: '0189230412',
    sumberLaporan: 'YANTEK',
    jenisGangguan: 'METER_MACET',
    deskripsiGangguan: 'Meteran tidak berputar saat beban listrik menyala, angka stan berhenti di 45820.',
    tanggalLapor: '2026-07-28 09:30',
    tanggalBypass: '2026-07-28',
    sisaToken: '12.5 kWh',
    status: 'BELUM_DIPROSES',
    petugasPelapor: 'Yantek Posko Central 02',
    assignedTim: 'Tim Penormalan Alpha 01',
    fotoBA: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    fotoKwh: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    aiAnalysisBA: {
      verified: true,
      confidence: 0.95,
      summary: 'BA Terverifikasi Valid oleh AI: Format BA Gangguan APP lengkap dengan ttd saksi.'
    },
    aiAnalysisKwh: {
      verified: true,
      confidence: 0.92,
      detectedNomorMeter: '0189230412',
      detectedStan: '45820',
      summary: 'Hasil AI KWh: Nomor Seri 0189230412 Terdeteksi 100% Cocok dengan Master Database.'
    }
  },
  {
    id: 'GAPP-2026-002',
    noLaporan: 'BLM-20260729-104',
    noGangguan: 'GGN-992014',
    idpel: '538900334455',
    namaPelanggan: 'CV Mandiri Jaya',
    alamatPelanggan: 'Kawasan Industri Terboyo Blok B12',
    nomorTelepon: '085711223344',
    tarif: 'B1',
    daya: '3500 VA',
    gardu: 'TRB-088',
    titikTumpu: 'Tiang B2-18',
    merkMeter: 'Itron Smart',
    nomorMeter: '14209823411',
    sumberLaporan: 'BILLMAN',
    jenisGangguan: 'DISPLAY_ERROR',
    deskripsiGangguan: 'Display LCD KWh meter prabayar berkedip ERROR dan keluar tulisan PERIKSA.',
    tanggalLapor: '2026-07-29 11:15',
    tanggalBypass: '2026-07-29',
    sisaToken: '0.0 kWh',
    status: 'DALAM_PENANGANAN',
    petugasPelapor: 'Billman Rayon Timur (Sdr. Hendra)',
    assignedTim: 'Tim Penormalan Bravo 02',
    catatanPenanganan: 'Petugas sedang meluncur ke lokasi untuk cek pembumian dan segel meter.',
    fotoBA: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    fotoKwh: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80'
  }
];

export const INITIAL_GAMET_WORK_ORDERS: GametWorkOrderTarget[] = [
  {
    id: 'WO-GMT-2026-001',
    idpel: '538900881122',
    namaPelanggan: 'Drs. Supriyanto',
    alamatPelanggan: 'Jl. Diponegoro No. 88, Semarang',
    nomorTelepon: '081298765432',
    tarif: 'R1',
    daya: '1300 VA',
    gardu: 'DPN-014',
    titikTumpu: 'Tiang D1-02',
    merkMeterLama: 'Fuji Dharma',
    nomorMeterLama: '0189230491',
    jenisPenggantian: 'PASCABAYAR_KE_PRABAYAR',
    assignedTim: 'Tim Gamet Rayon Pusat',
    status: 'SELESAI',
    catatanSupervisor: 'Permintaan migrasi pascabayar ke prabayar',
    uploadedAt: '2026-07-28 08:00',
    lamaGangguanHari: 30,
    pemakaianRupiahPerBulan: 300000,
    jenisGangguanApp: 'METER_MACET'
  },
  {
    id: 'WO-GMT-2026-002',
    idpel: '538900992233',
    namaPelanggan: 'Ibu Hj. Maryam',
    alamatPelanggan: 'Jl. Gajah Mada No. 102',
    nomorTelepon: '081377889900',
    tarif: 'R1M',
    daya: '900 VA',
    gardu: 'GJM-008',
    titikTumpu: 'Tiang G2-05',
    merkMeterLama: 'Metbelosa',
    nomorMeterLama: '8810293841',
    jenisPenggantian: 'REAGING_METER_TUA',
    assignedTim: 'Tim Gamet Re-Aging 02',
    status: 'SELESAI',
    catatanSupervisor: 'Program reaging meter tua (>15 thn)',
    uploadedAt: '2026-07-28 09:00',
    lamaGangguanHari: 60,
    pemakaianRupiahPerBulan: 250000,
    jenisGangguanApp: 'METER_BURAM'
  },
  {
    id: 'WO-GMT-2026-003',
    idpel: '538900112244',
    namaPelanggan: 'H. Suryadi',
    alamatPelanggan: 'Jl. Pandanaran No. 12, Semarang',
    nomorTelepon: '081566778899',
    tarif: 'R1',
    daya: '1300 VA',
    gardu: 'PDN-005',
    titikTumpu: 'Tiang A1-02',
    merkMeterLama: 'Hexing',
    nomorMeterLama: '22890192834',
    jenisPenggantian: 'PENGGANTIAN_RUSAK_REGULAR',
    assignedTim: 'Tim Gamet Posko 01',
    status: 'BELUM_DIGANTI',
    catatanSupervisor: 'Target WO Penggantian Meter Rusak Regular Gamet. Prioritas Tinggi.',
    uploadedAt: '2026-07-30 10:00',
    lamaGangguanHari: 45,
    pemakaianRupiahPerBulan: 450000,
    jenisGangguanApp: 'KEYPAD_ANGKA_RUSAK_ERROR'
  }
];

export const INITIAL_GAMET_RECORDS: GametRecord[] = [
  {
    id: 'GMT-2026-001',
    noBeritaAcara: 'BA-GAMET/2026/07/001',
    idpel: '538900881122',
    namaPelanggan: 'Drs. Supriyanto',
    alamatPelanggan: 'Jl. Diponegoro No. 88, Semarang',
    tarif: 'R1',
    daya: '1300 VA',
    jenisPenggantian: 'PASCABAYAR_KE_PRABAYAR',
    stanCabutLama: '28450.0',
    merkMeterLama: 'Fuji Dharma',
    nomorMeterLama: '0189230491',
    merkMeterBaru: 'Itron Prabayar Smart',
    nomorMeterBaru: '14209823401',
    stanAwalBaru: '00000.0',
    tokenPerdana: '1829-4019-2830-1920-4821',
    tanggalGanti: '2026-07-28',
    namaPetugas: 'Bambang Triyono',
    timGamet: 'Tim Gamet Rayon Pusat',
    status: 'SELESAI',
    catatan: 'Program migrasi Pascabayar ke Prabayar permintaan pelanggan. Token perdana Rp 50.000 terpasang.',
    fotoMeterLama: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    fotoMeterBaru: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-07-28T10:00:00.000Z'
  },
  {
    id: 'GMT-2026-002',
    noBeritaAcara: 'BA-GAMET/2026/07/002',
    idpel: '538900992233',
    namaPelanggan: 'Ibu Hj. Maryam',
    alamatPelanggan: 'Jl. Gajah Mada No. 102',
    tarif: 'R1M',
    daya: '900 VA',
    jenisPenggantian: 'REAGING_METER_TUA',
    stanCabutLama: '41029.5',
    merkMeterLama: 'Metbelosa',
    nomorMeterLama: '8810293841',
    merkMeterBaru: 'Hexing Smart KWh',
    nomorMeterBaru: '22981029381',
    stanAwalBaru: '00000.0',
    tanggalGanti: '2026-07-29',
    namaPetugas: 'Rian Hidayat',
    timGamet: 'Tim Gamet Re-Aging 02',
    status: 'SELESAI',
    catatan: 'Meter piringan tua usia > 15 tahun diganti meter elektronik modern.',
    fotoMeterLama: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    fotoMeterBaru: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-07-29T11:30:00.000Z'
  }
];

export const KEDAPATAN_MATERIAL_OPTIONS = [
  'P1 (MCB + Segel)',
  'P2 (Meter + Segel)',
  'P3 (MCB + Meter + Segel)',
  'P4',
  'K2 (Meter + Segel)'
] as const;

export const JENIS_PELANGGARAN_MAP: Record<string, { title: string; color: string; bg: string }> = {
  'P1 (MCB + Segel)': { title: 'P1 (MCB + Segel)', color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
  'P2 (Meter + Segel)': { title: 'P2 (Meter + Segel)', color: 'text-red-800', bg: 'bg-red-50 border-red-200' },
  'P3 (MCB + Meter + Segel)': { title: 'P3 (MCB + Meter + Segel)', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200' },
  'P4': { title: 'P4', color: 'text-rose-900', bg: 'bg-rose-100 border-rose-300' },
  'K2 (Meter + Segel)': { title: 'K2 (Meter + Segel)', color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },

  // Compatibility mapping for existing initial/legacy records
  'P2TL_KATEGORI_I': { title: 'P1 (MCB + Segel)', color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
  'P2TL_KATEGORI_II': { title: 'P2 (Meter + Segel)', color: 'text-red-800', bg: 'bg-red-50 border-red-200' },
  'P2TL_KATEGORI_III': { title: 'P3 (MCB + Meter + Segel)', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200' },
  'P2TL_KATEGORI_IV': { title: 'P4', color: 'text-rose-900', bg: 'bg-rose-100 border-rose-300' },
  'PROGRAM_PENGGANTIAN_RUSAK': { title: 'K2 (Meter + Segel)', color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
  'PROGRAM_PERIODIK_TUA': { title: 'K2 (Meter + Segel)', color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' }
};
