export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'REVISION_NEEDED';

export type UserRole = 'PETUGAS_LAPANGAN' | 'SUPERVISOR';

export type JenisPelanggaran = 
  | 'P2TL_KATEGORI_I'   // Pelanggaran yang mempengaruhi batas daya
  | 'P2TL_KATEGORI_II'  // Pelanggaran yang mempengaruhi pengukuran energi
  | 'P2TL_KATEGORI_III' // Pelanggaran gabungan Kat I & II
  | 'P2TL_KATEGORI_IV'  // Non-pelanggan (Pemakaian liar)
  | 'PROGRAM_PENGGANTIAN_RUSAK' // Meter Rusak / Buram / Macet
  | 'PROGRAM_PERIODIK_TUA';     // Meter Tua / Re-aging

export interface WorkOrderTarget {
  id: string;
  idpel: string;
  namaPelanggan: string;
  alamatPelanggan: string;
  tarif: string;
  daya: string;
  gardu?: string;
  titikTumpu?: string;
  merkMeterLama?: string;
  nomorMeterLama: string;
  jenisPelanggaran: JenisPelanggaran;
  assignedTim?: string;
  status: 'BELUM_DIGANTI' | 'SELESAI';
  catatanSupervisor?: string;
  uploadedAt: string;
}

export interface MeterPhoto {
  id: string;
  label: 'STAN_CABUT_LAMA' | 'METER_BARU' | 'SEGEL_DAN_BA' | 'DOKUMENTASI_PETUGAS';
  title: string;
  dataUrl: string; // Base64 or Object URL
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface CustomerData {
  idpel: string;
  nama: string;
  alamat: string;
  tarif: string;
  daya: string;
  gardu: string;
  merkMeterLama?: string;
  nomorMeterLama: string;
}

export interface VerificationResult {
  verified: boolean;
  confidenceScore: number;
  detectedStanCabut?: string;
  detectedNomorMeterBaru?: string;
  photoQuality?: string;
  notes: string;
  warnings: string[];
  verifiedAt?: string;
}

export interface ReplacementRecord {
  id: string;
  noBeritaAcara: string;
  workOrderId?: string; // Reference to Supervisor WO
  idpel: string;
  namaPelanggan: string;
  alamatPelanggan: string;
  tarif: string;
  daya: string;
  gardu?: string;
  titikTumpu?: string;
  
  // Data utama sesuai request (diinput Petugas Lapangan)
  stanCabut: string; // Stan Cabut meter lama (kWh)
  stanCabutWbp?: string; // Optional Stan WBP jika 2 tarif
  stanCabutKvarh?: string;
  merkMeterLama?: string;
  nomorMeterLama: string;
  
  nomorMeterBaru: string; // Nomor Meter Baru
  merkMeterBaru: string;  // e.g. Itron, Hexing, Sanxing, Glomet
  stanAwalBaru: string;   // Stan awal meter baru (biasanya 0)
  
  tanggalGanti: string;  // Tanggal Ganti (YYYY-MM-DD or datetime)
  waktuGanti?: string;
  
  // Tim & Dokumentasi
  namaPetugas: string;
  timP2TL: string;
  jenisPelanggaran: JenisPelanggaran;
  
  // Dokumentasi Foto Lapangan
  photos: MeterPhoto[];
  
  // Verifikasi AI / Supervisor
  verificationStatus: VerificationStatus;
  aiVerification?: VerificationResult;
  catatanPetugas?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type AppMainModule = 'tanya-simetri' | 'gangguan' | 'p2tl' | 'gamet' | 'users';

export type SystemRole = 'Admin' | 'Yantek' | 'Billman' | 'Yanbung' | 'Gamet';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  namaLengkap: string;
  role: SystemRole;
  unitKerja?: string;
  statusActive: boolean;
  createdAt: string;
}

export interface CustomerMasterItem {
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
  createdAt?: string;
}

export type JenisGangguanApp = 
  | 'METER_MACET' 
  | 'METER_BURAM' 
  | 'METER_MATI' 
  | 'DISPLAY_ERROR' 
  | 'KEYPAD_ANGKA_RUSAK_ERROR'
  | 'SEGEL_PUTUS' 
  | 'TERMINAL_HANGUS' 
  | 'KWH_ERROR'
  | 'MCB_1PH_RUSAK_TERBAKAR'
  | 'MCB_3PH_RUSAK_TERBAKAR';

export interface GangguanAppRecord {
  id: string;
  noLaporan: string;
  noGangguan: string;
  noBAGangguan?: string;
  tipeMeter?: 'PRABAYAR' | 'PASCABAYAR' | 'MCB';
  idpel: string;
  namaPelanggan: string;
  alamatPelanggan: string;
  nomorTelepon?: string;
  tarif: string;
  daya: string;
  gardu?: string;
  titikTumpu?: string;
  merkMeter?: string;
  nomorMeter?: string;
  sumberLaporan: 'YANTEK' | 'BILLMAN' | 'PETUGAS_LAPANGAN';
  jenisGangguan: JenisGangguanApp;
  deskripsiGangguan: string;
  tanggalLapor: string;
  tanggalBypass?: string;
  sisaToken?: string;
  status: 'BELUM_DIPROSES' | 'DALAM_PENANGANAN' | 'SELESAI';
  petugasPelapor: string;
  assignedTim?: string;
  catatanPenanganan?: string;
  fotoBA?: string;
  fotoKwh?: string;
  fotoStanSisaKwh?: string;
  aiAnalysisBA?: {
    verified: boolean;
    confidence: number;
    summary: string;
  };
  aiAnalysisKwh?: {
    verified: boolean;
    confidence: number;
    detectedNomorMeter?: string;
    detectedStan?: string;
    summary: string;
  };
}

export type GametType = 
  | 'PRABAYAR_KE_PASCABAYAR' 
  | 'PASCABAYAR_KE_PRABAYAR' 
  | 'REAGING_METER_TUA' 
  | 'PENGGANTIAN_RUSAK_REGULAR';

export interface GametWorkOrderTarget {
  id: string;
  idpel: string;
  namaPelanggan: string;
  alamatPelanggan: string;
  nomorTelepon?: string;
  tarif: string;
  daya: string;
  gardu?: string;
  titikTumpu?: string;
  merkMeterLama?: string;
  nomorMeterLama: string;
  jenisPenggantian: GametType;
  assignedTim?: string;
  status: 'BELUM_DIGANTI' | 'SELESAI';
  catatanSupervisor?: string;
  uploadedAt: string;
  lamaGangguanHari?: number;
  pemakaianRupiahPerBulan?: number;
  jenisGangguanApp?: string;
  sumberLaporan?: string;
}

export interface GametRecord {
  id: string;
  noBeritaAcara: string;
  workOrderId?: string;
  idpel: string;
  namaPelanggan: string;
  alamatPelanggan: string;
  tarif: string;
  daya: string;
  gardu?: string;
  titikTumpu?: string;
  jenisPenggantian: GametType;
  stanCabutLama: string;
  sisaPulsaLama?: string;
  merkMeterLama?: string;
  nomorMeterLama: string;
  merkMeterBaru: string;
  nomorMeterBaru: string;
  stanAwalBaru: string;
  tokenPerdana?: string;
  tanggalGanti: string;
  waktuGanti?: string;
  namaPetugas: string;
  timGamet: string;
  status: 'SELESAI' | 'BELUM_DIGANTI';
  catatan?: string;
  nomorTelepon?: string;
  sumberLaporan?: string;
  jenisGangguanApp?: string;
  fotoRumah?: string;
  fotoKtp?: string;
  fotoMeterLama?: string;
  fotoMeterBaru?: string;
  fotoBA?: string;
  aiVerification?: {
    verified: boolean;
    confidenceScore: number;
    detectedNomorMeterBaru?: string;
    detectedStanCabut?: string;
    summary: string;
  };
  createdAt: string;
}

export interface AppFilter {
  searchQuery: string;
  statusFilter: VerificationStatus | 'ALL';
  jenisFilter: string;
  startDate: string;
  endDate: string;
  timFilter: string;
}

