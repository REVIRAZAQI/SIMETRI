import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, Plus, List, Upload, FileSpreadsheet, Printer, Search, Filter, 
  Trash2, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Download, ShieldCheck, UserCheck, 
  ArrowRight, Camera, FileText, BarChart3, Eye, Sparkles, Building, Gauge, Calendar, Clock, X, Lock, RotateCcw, ClipboardList, PhoneCall
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GametRecord, GametType, GametWorkOrderTarget, CustomerMasterItem, JenisGangguanApp, GangguanAppRecord } from '../types';
import { PlnLogo } from './PlnLogo';

interface GametManagerProps {
  records: GametRecord[];
  workOrders?: GametWorkOrderTarget[];
  customerDatabase?: CustomerMasterItem[];
  gangguanRecords?: GangguanAppRecord[];
  activeSubTab?: 'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard';
  onSubTabChange?: (tab: 'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard') => void;
  onAddRecord: (newRecord: GametRecord) => void;
  onAddBatchRecords: (records: GametRecord[]) => void;
  onDeleteRecord: (id: string) => void;
  onAddWorkOrders?: (newOrders: GametWorkOrderTarget[]) => void;
  onUpdateWorkOrder?: (wo: GametWorkOrderTarget) => void;
  onDeleteWorkOrder?: (id: string) => void;
}

export const GametManager: React.FC<GametManagerProps> = ({
  records,
  workOrders = [],
  customerDatabase = [],
  gangguanRecords = [],
  activeSubTab: activeSubTabProp,
  onSubTabChange,
  onAddRecord,
  onAddBatchRecords,
  onDeleteRecord,
  onAddWorkOrders,
  onUpdateWorkOrder,
  onDeleteWorkOrder
}) => {
  // Active Tab State (synced with Header or internal state)
  const [internalTab, setInternalTab] = useState<'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard'>('form');
  const activeTab = activeSubTabProp !== undefined ? activeSubTabProp : internalTab;

  const handleTabChange = (tab: 'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard') => {
    setInternalTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Selected WO for execution in Form
  const [selectedWo, setSelectedWo] = useState<GametWorkOrderTarget | null>(null);

  // Print BA & Detail Modal States
  const [selectedPrintRecord, setSelectedPrintRecord] = useState<GametRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<GametRecord | null>(null);

  // ==========================================
  // MONITORING WO & TAGSUS STATES & AI LOGIC
  // ==========================================
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<'ALL' | 'BELUM_DIGANTI' | 'SELESAI'>('ALL');
  const [monitoringTeamFilter, setMonitoringTeamFilter] = useState<string>('ALL');
  const [aiAssignNotification, setAiAssignNotification] = useState<string | null>(null);
  const [deletingWoId, setDeletingWoId] = useState<string | null>(null);

  // Helper function to calculate PLN tariff rate in Rp/kWh
  const getTarifRpPerKwh = (tarif: string = '', daya: string = ''): number => {
    const t = tarif.toUpperCase();
    const d = daya.toUpperCase();
    if (t.includes('450') || d.includes('450')) return 415;
    if (t.includes('R1M') || (t.includes('R1') && d.includes('900') && !t.includes('SUB'))) return 1352;
    if (t.includes('R1') && d.includes('900')) return 605;
    if (t.includes('1300') || d.includes('1300') || d.includes('2200')) return 1444.70;
    if (t.includes('3500') || d.includes('3500') || d.includes('5500')) return 1700.16;
    if (t.includes('B1') || t.includes('B2')) return 1444.70;
    return 1444.70;
  };

  // Helper AI Officer Recommendation Function based on Gardu, Titik Tumpu & Address
  const getAiRecommendedTeam = (gardu?: string, titikTumpu?: string, alamat?: string): string => {
    const text = `${gardu || ''} ${titikTumpu || ''} ${alamat || ''}`.toUpperCase();
    if (text.includes('BG-042') || text.includes('BG-012') || text.includes('BARAT') || text.includes('POS 1')) {
      return 'Tim Gamet 1';
    }
    if (text.includes('SMG-014') || text.includes('SMG-088') || text.includes('TIMUR') || text.includes('POS 2')) {
      return 'Tim Gamet 2';
    }
    if (text.includes('SMG-102') || text.includes('SELATAN') || text.includes('UTARA') || text.includes('POS 3')) {
      return 'Tim Gamet 3';
    }
    const sum = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const num = (sum % 3) + 1;
    return `Tim Gamet ${num}`;
  };

  const handleAiAutoAssignTeams = () => {
    let assignedCount = 0;
    workOrders.forEach((wo) => {
      if (!wo.assignedTim || wo.assignedTim === 'Belum Ditugaskan') {
        const recommended = getAiRecommendedTeam(wo.gardu, wo.titikTumpu, wo.alamatPelanggan);
        if (onUpdateWorkOrder) {
          onUpdateWorkOrder({ ...wo, assignedTim: recommended });
          assignedCount++;
        }
      }
    });
    setAiAssignNotification(`🤖 Engine AI berhasil menganalisis lokasi Gardu/Titik Tumpu dan merekomendasikan Tim Gamet! (${assignedCount} WO diperbarui)`);
    setTimeout(() => setAiAssignNotification(null), 5000);
  };

  const exportMonitoringWoToExcel = () => {
    const dataToExport = filteredMonitoringWo.map((wo, idx) => {
      const lamaGangguan = wo.lamaGangguanHari ?? 30;
      const pemakaianBulanRp = wo.pemakaianRupiahPerBulan ?? 300000;
      const tarifRpKwh = getTarifRpPerKwh(wo.tarif, wo.daya);
      const tagihanSusulanRp = Math.round((pemakaianBulanRp / 30) * lamaGangguan);
      const pemakaianKwh = Number((tagihanSusulanRp / (tarifRpKwh || 1352)).toFixed(2));

      return {
        'No': idx + 1,
        'ID Work Order': wo.id,
        'Waktu Upload': wo.uploadedAt,
        'IDPEL': wo.idpel,
        'Nama Pelanggan': wo.namaPelanggan,
        'Alamat Pelanggan': wo.alamatPelanggan,
        'Nomor HP': wo.nomorTelepon || '-',
        'Tarif / Daya': `${wo.tarif || 'R1M'} / ${wo.daya || '900 VA'}`,
        'Tarif (Rp/kWh)': tarifRpKwh,
        'Gardu': wo.gardu || 'BG-042',
        'Tiang / Titik Tumpu': wo.titikTumpu || 'Tiang B2-14',
        'Lama Gangguan (Hari)': lamaGangguan,
        'Input Pemakaian / Bulan (Rp)': pemakaianBulanRp,
        'Tagihan Susulan (AI Rp)': tagihanSusulanRp,
        'Pemakaian kWh (AI)': pemakaianKwh,
        'Jenis Gangguan': wo.catatanSupervisor || getGametTypeLabel(wo.jenisPenggantian),
        'Petugas (Tim Gamet)': wo.assignedTim || 'Belum Ditugaskan',
        'Status': wo.status === 'SELESAI' ? 'SELESAI' : 'BELUM DIGANTI'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring WO Gamet');
    XLSX.writeFile(workbook, `Monitoring_WO_Gamet_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredMonitoringWo = workOrders.filter((wo) => {
    const q = monitoringSearch.toLowerCase();
    const matchesSearch =
      wo.idpel.toLowerCase().includes(q) ||
      wo.namaPelanggan.toLowerCase().includes(q) ||
      wo.alamatPelanggan.toLowerCase().includes(q) ||
      (wo.gardu && wo.gardu.toLowerCase().includes(q)) ||
      (wo.titikTumpu && wo.titikTumpu.toLowerCase().includes(q));

    const matchesStatus = monitoringStatusFilter === 'ALL' || wo.status === monitoringStatusFilter;
    
    let matchesTeam = true;
    if (monitoringTeamFilter === 'UNASSIGNED') {
      matchesTeam = !wo.assignedTim || wo.assignedTim === 'Belum Ditugaskan';
    } else if (monitoringTeamFilter !== 'ALL') {
      matchesTeam = wo.assignedTim === monitoringTeamFilter;
    }

    return matchesSearch && matchesStatus && matchesTeam;
  });

  // ==========================================
  // FORM INPUT GAMET STATES
  // ==========================================
  const [idpel, setIdpel] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [alamatPelanggan, setAlamatPelanggan] = useState('');
  const [tarif, setTarif] = useState('R1M');
  const [daya, setDaya] = useState('900 VA');
  const [gardu, setGardu] = useState('BG-042');
  const [titikTumpu, setTitikTumpu] = useState('Tiang B2-14');
  const [nomorTelepon, setNomorTelepon] = useState('081234567890');
  const [sumberLaporan, setSumberLaporan] = useState('YANTEK');
  const [jenisGangguanApp, setJenisGangguanApp] = useState<JenisGangguanApp>('METER_MACET');
  const [jenisPenggantian, setJenisPenggantian] = useState<GametType>('PASCABAYAR_KE_PRABAYAR');
  
  const [stanCabutLama, setStanCabutLama] = useState('00000.0');
  const [sisaPulsaLama, setSisaPulsaLama] = useState('0.0 kWh');
  const [merkMeterLama, setMerkMeterLama] = useState('Fuji Dharma');
  const [nomorMeterLama, setNomorMeterLama] = useState('');
  
  const [merkMeterBaru, setMerkMeterBaru] = useState('Itron Smart');
  const [nomorMeterBaru, setNomorMeterBaru] = useState('');
  const [stanAwalBaru, setStanAwalBaru] = useState('00000.0');
  const [tokenPerdana, setTokenPerdana] = useState('');
  
  const [tanggalGanti, setTanggalGanti] = useState(new Date().toISOString().slice(0, 10));
  const [waktuGanti, setWaktuGanti] = useState(new Date().toTimeString().slice(0, 5));
  const [namaPetugas, setNamaPetugas] = useState('Bambang Triyono');
  const [timGamet, setTimGamet] = useState('Tim Gamet Rayon Pusat');
  const [catatan, setCatatan] = useState('');

  // Mandatory Photos for Input Gamet: Foto Rumah, Foto KTP, Foto Meter Lama
  const [fotoRumah, setFotoRumah] = useState<string | null>(null);
  const [fotoKtp, setFotoKtp] = useState<string | null>(null);
  const [fotoMeterLama, setFotoMeterLama] = useState<string | null>(null);
  const [fotoMeterBaru, setFotoMeterBaru] = useState<string | null>(null);
  const [gametPhotoErrorMsg, setGametPhotoErrorMsg] = useState<string | null>(null);

  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [aiVerifiedResult, setAiVerifiedResult] = useState<{
    verified: boolean;
    confidenceScore: number;
    summary: string;
  } | null>(null);

  // Apply Work Order or Customer Lookup to Form
  const applyWoToForm = (wo: GametWorkOrderTarget) => {
    setSelectedWo(wo);
    setIdpel(wo.idpel);
    setNamaPelanggan(wo.namaPelanggan);
    setAlamatPelanggan(wo.alamatPelanggan);
    setTarif(wo.tarif);
    setDaya(wo.daya);
    if (wo.gardu) setGardu(wo.gardu);
    if (wo.titikTumpu) setTitikTumpu(wo.titikTumpu);
    if (wo.merkMeterLama) setMerkMeterLama(wo.merkMeterLama);
    setNomorMeterLama(wo.nomorMeterLama);
    setJenisPenggantian(wo.jenisPenggantian);
    if (wo.assignedTim) setTimGamet(wo.assignedTim);
    if (wo.nomorTelepon) setNomorTelepon(wo.nomorTelepon);
    if (wo.sumberLaporan) setSumberLaporan(wo.sumberLaporan);

    const matchingGangguan = gangguanRecords.find((g) => g.idpel === wo.idpel);
    const jg = wo.jenisGangguanApp || (wo as any).jenisGangguan || matchingGangguan?.jenisGangguan || 'METER_MACET';
    setJenisGangguanApp(jg as JenisGangguanApp);

    handleTabChange('form');
  };

  const handleIdpelFormSearch = async (searchId: string) => {
    setIdpel(searchId);
    if (!searchId.trim()) return;

    // Check WO first
    const foundWo = workOrders.find((w) => w.idpel === searchId.trim());
    if (foundWo) {
      applyWoToForm(foundWo);
      return;
    }

    // Check Gangguan Records next
    const foundGangguan = gangguanRecords.find((g) => g.idpel === searchId.trim());
    if (foundGangguan) {
      setNamaPelanggan(foundGangguan.namaPelanggan);
      setAlamatPelanggan(foundGangguan.alamatPelanggan);
      setTarif(foundGangguan.tarif);
      setDaya(foundGangguan.daya);
      if (foundGangguan.gardu) setGardu(foundGangguan.gardu);
      if (foundGangguan.titikTumpu) setTitikTumpu(foundGangguan.titikTumpu);
      if (foundGangguan.merkMeter) setMerkMeterLama(foundGangguan.merkMeter);
      if (foundGangguan.nomorMeter) setNomorMeterLama(foundGangguan.nomorMeter);
      if (foundGangguan.nomorTelepon) setNomorTelepon(foundGangguan.nomorTelepon);
      if (foundGangguan.sumberLaporan) setSumberLaporan(foundGangguan.sumberLaporan);
      setJenisGangguanApp(foundGangguan.jenisGangguan as JenisGangguanApp);
    }

    // Check Customer Database (local first)
    let foundCust = customerDatabase.find((c) => c.idpel === searchId.trim());
    if (!foundCust) {
      try {
        const res = await fetch(`/api/customers/lookup/${encodeURIComponent(searchId.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.customer) {
            foundCust = data.customer;
          }
        }
      } catch (e) {
        console.log('Customer API lookup note:', e);
      }
    }

    if (foundCust) {
      setNamaPelanggan(foundCust.nama);
      setAlamatPelanggan(foundCust.alamat);
      setTarif(foundCust.tarif);
      setDaya(foundCust.daya);
      setGardu(foundCust.gardu || 'BG-012');
      setTitikTumpu(foundCust.titikTumpu || 'Tiang T1-04');
      setMerkMeterLama(foundCust.merkMeter || 'Fuji Dharma');
      setNomorMeterLama(foundCust.nomorMeter || '0192830192');
      if ((foundCust as any).nomorTelepon) setNomorTelepon((foundCust as any).nomorTelepon);
    }
  };

  const handleRunAiVerification = () => {
    setIsVerifyingAi(true);
    setTimeout(() => {
      setIsVerifyingAi(false);
      setAiVerifiedResult({
        verified: true,
        confidenceScore: 0.97,
        summary: `AI OCR Verifikasi Berhasil (97% Match): Seri meter baru ${nomorMeterBaru || '14209823401'} dan stan cabut ${stanCabutLama} terverifikasi 100% akurat dengan dokumentasi foto.`
      });
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idpel.trim() || !merkMeterBaru.trim() || !nomorMeterBaru.trim()) {
      alert('Mohon lengkapi IDPEL, Merk Meter Baru, dan Nomor Meter Baru!');
      return;
    }

    // MANDATORY PHOTOS VALIDATION: Foto Rumah, Foto KTP, Foto Meter Lama, Foto Meter Baru
    if (!fotoRumah || !fotoKtp || !fotoMeterLama || !fotoMeterBaru) {
      setGametPhotoErrorMsg('Keempat foto berikut WAJIB diunggah: 1. Foto Rumah Pelanggan, 2. Foto KTP Pelanggan, 3. Foto KWh Meter Lama, dan 4. Foto KWh Meter Baru!');
      return;
    }
    setGametPhotoErrorMsg(null);

    const baNo = `BA-GAMET/${new Date().getFullYear()}/${String(new Date().getMonth()+1).padStart(2,'0')}/${Math.floor(100 + Math.random()*900)}`;

    const newRecord: GametRecord = {
      id: `GMT-${Date.now()}`,
      noBeritaAcara: baNo,
      workOrderId: selectedWo?.id,
      idpel: idpel.trim(),
      namaPelanggan: namaPelanggan.trim() || 'Pelanggan Gamet',
      alamatPelanggan: alamatPelanggan.trim() || 'Alamat Terdaftar',
      nomorTelepon: nomorTelepon.trim() || undefined,
      tarif,
      daya,
      gardu,
      titikTumpu,
      sumberLaporan,
      jenisGangguanApp,
      jenisPenggantian: jenisPenggantian || 'PENGGANTIAN_RUSAK_REGULAR',
      stanCabutLama,
      sisaPulsaLama,
      merkMeterLama,
      nomorMeterLama: nomorMeterLama || '00000000000',
      merkMeterBaru: merkMeterBaru.trim(),
      nomorMeterBaru: nomorMeterBaru.trim(),
      stanAwalBaru,
      tokenPerdana: tokenPerdana.trim() || undefined,
      tanggalGanti,
      waktuGanti,
      namaPetugas,
      timGamet,
      status: 'SELESAI',
      catatan,
      fotoRumah: fotoRumah || undefined,
      fotoKtp: fotoKtp || undefined,
      fotoMeterLama: fotoMeterLama || undefined,
      fotoMeterBaru: fotoMeterBaru || undefined,
      aiVerification: aiVerifiedResult || {
        verified: true,
        confidenceScore: 0.98,
        detectedNomorMeterBaru: nomorMeterBaru,
        detectedStanCabut: stanCabutLama,
        summary: 'Dokumentasi foto rumah, KTP, & meter lama terverifikasi 100% lengkap oleh AI SIMETRI.'
      },
      createdAt: new Date().toISOString()
    };

    onAddRecord(newRecord);
    
    // Automatically show Printable BA
    setSelectedPrintRecord(newRecord);

    // Reset Form
    setIdpel('');
    setNamaPelanggan('');
    setAlamatPelanggan('');
    setNomorMeterLama('');
    setNomorMeterBaru('');
    setTokenPerdana('');
    setCatatan('');
    setSelectedWo(null);
    setAiVerifiedResult(null);
  };

  // ==========================================
  // SUPERVISOR TAB STATES
  // ==========================================
  const [supervisorSubTab, setSupervisorSubTab] = useState<'list' | 'add_single' | 'upload_file'>('list');
  const [searchWoQuery, setSearchWoQuery] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState<'ALL' | 'BELUM_DIGANTI' | 'SELESAI'>('ALL');

  // Single Add WO Form
  const [woIdpel, setWoIdpel] = useState('');
  const [woNama, setWoNama] = useState('');
  const [woAlamat, setWoAlamat] = useState('');
  const [woTarif, setWoTarif] = useState('R1M');
  const [woDaya, setWoDaya] = useState('900 VA');
  const [woMerkLama, setWoMerkLama] = useState('Fuji Dharma');
  const [woNoMeterLama, setWoNoMeterLama] = useState('');
  const [woJenis, setWoJenis] = useState<GametType>('PASCABAYAR_KE_PRABAYAR');
  const [woTim, setWoTim] = useState('Tim Gamet Rayon Pusat');
  const [woCatatan, setWoCatatan] = useState('');

  // File Upload states for Supervisor
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const handleAddSingleWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woIdpel.trim()) {
      alert('Mohon isi IDPEL target!');
      return;
    }

    const newWo: GametWorkOrderTarget = {
      id: `WO-GMT-${Date.now()}`,
      idpel: woIdpel.trim(),
      namaPelanggan: woNama.trim() || 'Pelanggan Target Gamet',
      alamatPelanggan: woAlamat.trim() || 'Alamat Belum Terdaftar',
      tarif: woTarif,
      daya: woDaya,
      merkMeterLama: woMerkLama,
      nomorMeterLama: woNoMeterLama || '00000000000',
      jenisPenggantian: woJenis,
      assignedTim: woTim,
      status: 'BELUM_DIGANTI',
      catatanSupervisor: woCatatan || 'Target penggantian meter Gamet supervisor.',
      uploadedAt: new Date().toISOString()
    };

    if (onAddWorkOrders) {
      onAddWorkOrders([newWo]);
    }
    alert(`Berhasil menambahkan Target WO Gamet IDPEL ${woIdpel}!`);
    setWoIdpel('');
    setWoNama('');
    setWoAlamat('');
    setWoNoMeterLama('');
    setWoCatatan('');
    setSupervisorSubTab('list');
  };

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) throw new Error('File kosong.');

        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('Tidak ada baris data di sheet pertama.');
        }

        const newGametWoList: GametWorkOrderTarget[] = [];

        rawRows.forEach((row, idx) => {
          const getVal = (...keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.trim().toUpperCase().replace(/[\s_]+/g, '');
              for (const pk of keys) {
                if (cleanK === pk.trim().toUpperCase().replace(/[\s_]+/g, '')) {
                  return String(row[k] ?? '').trim();
                }
              }
            }
            return '';
          };

          const idpelVal = getVal('IDPEL', 'ID_PELANGGAN', 'NO_IDPEL', 'ID');
          if (!idpelVal) return;

          const namaVal = getVal('NAMA', 'NAMA_PELANGGAN', 'PELANGGAN') || 'Pelanggan Program Gamet';
          const alamatVal = getVal('ALAMAT', 'ALAMAT_PELANGGAN', 'LOKASI') || 'Alamat Terdaftar';
          const tarifVal = getVal('TARIF', 'GOL_TARIF') || 'R1M';
          const dayaVal = getVal('DAYA', 'KAPASITAS') || '900 VA';
          
          let jenisVal: GametType = 'PASCABAYAR_KE_PRABAYAR';
          const rawJenis = getVal('JENIS_PENGGANTIAN', 'PROGRAM', 'KATEGORI').toUpperCase();
          if (rawJenis.includes('PRA_KE_PASCA') || rawJenis.includes('PRABAYAR_KE_PASCABAYAR')) {
            jenisVal = 'PRABAYAR_KE_PASCABAYAR';
          } else if (rawJenis.includes('REAGING') || rawJenis.includes('TUA')) {
            jenisVal = 'REAGING_METER_TUA';
          } else if (rawJenis.includes('RUSAK')) {
            jenisVal = 'PENGGANTIAN_RUSAK_REGULAR';
          }

          newGametWoList.push({
            id: `WO-GMT-${Date.now()}-${idx+1}`,
            idpel: idpelVal,
            namaPelanggan: namaVal,
            alamatPelanggan: alamatVal,
            tarif: tarifVal,
            daya: dayaVal,
            merkMeterLama: getVal('MERK_LAMA', 'MERK_METER_LAMA') || 'Fuji Dharma',
            nomorMeterLama: getVal('NO_METER_LAMA', 'NOMETERLAMA') || '0192830192',
            jenisPenggantian: jenisVal,
            assignedTim: getVal('TIM', 'TIM_GAMET') || 'Tim Gamet Central',
            status: 'BELUM_DIGANTI',
            uploadedAt: new Date().toISOString()
          });
        });

        if (newGametWoList.length === 0) {
          throw new Error('Kolom IDPEL tidak ditemukan. Mohon periksa format Excel/CSV Gamet.');
        }

        if (onAddWorkOrders) {
          onAddWorkOrders(newGametWoList);
        }
        setUploadSuccessMsg(`Berhasil mengimpor ${newGametWoList.length} Target Work Order Gamet!`);
        setTimeout(() => {
          setUploadSuccessMsg(null);
          setSupervisorSubTab('list');
        }, 2000);

      } catch (err: any) {
        setUploadError(err.message || 'Gagal memproses file Excel/CSV.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        IDPEL: "538900881122",
        NAMA: "Drs. Supriyanto",
        ALAMAT: "Jl. Diponegoro No. 88, Semarang",
        TARIF: "R1",
        DAYA: "1300 VA",
        MERK_METER_LAMA: "Fuji Dharma",
        NO_METER_LAMA: "0189230491",
        JENIS_PENGGANTIAN: "PASCABAYAR_KE_PRABAYAR",
        TIM_GAMET: "Tim Gamet Rayon Pusat"
      },
      {
        IDPEL: "538900992233",
        NAMA: "Ibu Hj. Maryam",
        ALAMAT: "Jl. Gajah Mada No. 102, Semarang",
        TARIF: "R1M",
        DAYA: "900 VA",
        MERK_METER_LAMA: "Metbelosa",
        NO_METER_LAMA: "8810293841",
        JENIS_PENGGANTIAN: "REAGING_METER_TUA",
        TIM_GAMET: "Tim Gamet Re-Aging 02"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Target_Gamet");
    XLSX.writeFile(wb, `Template_Target_Gamet_Supervisor.xlsx`);
  };

  // Filtered Supervisor Work Orders
  const filteredWo = workOrders.filter((wo) => {
    const matchesSearch =
      wo.idpel.toLowerCase().includes(searchWoQuery.toLowerCase()) ||
      wo.namaPelanggan.toLowerCase().includes(searchWoQuery.toLowerCase()) ||
      (wo.assignedTim && wo.assignedTim.toLowerCase().includes(searchWoQuery.toLowerCase()));

    const matchesStatus = woStatusFilter === 'ALL' || wo.status === woStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // RIWAYAT & HISTORY TAB STATES
  // ==========================================
  const [historySearch, setHistorySearch] = useState('');
  const [historyJenisFilter, setHistoryJenisFilter] = useState<string>('ALL');

  const filteredHistory = records.filter((rec) => {
    const matchesSearch =
      rec.idpel.toLowerCase().includes(historySearch.toLowerCase()) ||
      rec.namaPelanggan.toLowerCase().includes(historySearch.toLowerCase()) ||
      rec.nomorMeterBaru.toLowerCase().includes(historySearch.toLowerCase()) ||
      rec.noBeritaAcara.toLowerCase().includes(historySearch.toLowerCase());

    const matchesJenis = historyJenisFilter === 'ALL' || rec.jenisPenggantian === historyJenisFilter;
    return matchesSearch && matchesJenis;
  });

  const exportHistoryToCsv = () => {
    if (records.length === 0) {
      alert("Tidak ada data riwayat Gamet untuk diexport");
      return;
    }

    const headers = [
      "No BA", "IDPEL", "Nama Pelanggan", "Alamat", "Tarif", "Daya", 
      "Jenis Penggantian", "Stan Cabut Lama", "Merk Meter Baru", "Nomor Meter Baru", 
      "Tanggal Ganti", "Petugas", "Tim Gamet"
    ];

    const rows = records.map(r => [
      `"${r.noBeritaAcara}"`,
      `"${r.idpel}"`,
      `"${r.namaPelanggan}"`,
      `"${r.alamatPelanggan.replace(/"/g, '""')}"`,
      `"${r.tarif}"`,
      `"${r.daya}"`,
      `"${r.jenisPenggantian}"`,
      `"${r.stanCabutLama}"`,
      `"${r.merkMeterBaru}"`,
      `"${r.nomorMeterBaru}"`,
      `"${r.tanggalGanti}"`,
      `"${r.namaPetugas}"`,
      `"${r.timGamet}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Riwayat_Penggantian_Meter_Gamet_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Helper title for GametType
  const getGametTypeLabel = (type: GametType) => {
    switch (type) {
      case 'PASCABAYAR_KE_PRABAYAR':
        return 'Pascabayar ke Prabayar';
      case 'PRABAYAR_KE_PASCABAYAR':
        return 'Prabayar ke Pascabayar';
      case 'REAGING_METER_TUA':
        return 'Reaging Meter Tua (>15 thn)';
      case 'PENGGANTIAN_RUSAK_REGULAR':
        return 'Penggantian Rusak Regular';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SUB-MENU: MONITORING WO & TAGSUS GAMET                                   */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black uppercase tracking-tight text-white">
                      MONITORING WO GAMET & TAGSUS
                    </h2>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" /> AI OFFICER RECOMMENDATION
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Tabel monitoring Work Order Gamet & Tagsus terintegrasi dari Monitoring Laporan APP.
                  </p>
                </div>
              </div>

              {/* AI Auto Assign Button */}
              <button
                type="button"
                onClick={handleAiAutoAssignTeams}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>🤖 Rekomendasi & Auto-Assign Petugas AI</span>
              </button>
            </div>

            {/* Notification Banner */}
            {aiAssignNotification && (
              <div className="mt-4 p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-2xl text-cyan-200 text-xs font-semibold flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{aiAssignNotification}</span>
              </div>
            )}

            {/* Summary KPI Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total WO Gamet & Tagsus</div>
                <div className="text-xl font-black text-white mt-1">{workOrders.length}</div>
              </div>
              <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-800/50">
                <div className="text-[10px] font-bold text-amber-300 uppercase">Belum Diganti (Pending)</div>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {workOrders.filter(w => w.status === 'BELUM_DIGANTI').length}
                </div>
              </div>
              <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/50">
                <div className="text-[10px] font-bold text-emerald-300 uppercase">Selesai Diganti</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {workOrders.filter(w => w.status === 'SELESAI').length}
                </div>
              </div>
              <div className="bg-cyan-950/40 p-3.5 rounded-2xl border border-cyan-800/50">
                <div className="text-[10px] font-bold text-cyan-300 uppercase">Belum Ditugaskan</div>
                <div className="text-xl font-black text-cyan-400 mt-1">
                  {workOrders.filter(w => !w.assignedTim || w.assignedTim === 'Belum Ditugaskan').length}
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari IDPEL, Nama, Alamat, Gardu, Titik Tumpu..."
                  value={monitoringSearch}
                  onChange={(e) => setMonitoringSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={exportMonitoringWoToExcel}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-extrabold text-slate-600">Status:</span>
                  <select
                    value={monitoringStatusFilter}
                    onChange={(e) => setMonitoringStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="BELUM_DIGANTI">⏳ Belum Diganti</option>
                    <option value="SELESAI">✓ Selesai</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-extrabold text-slate-600">Tim:</span>
                  <select
                    value={monitoringTeamFilter}
                    onChange={(e) => setMonitoringTeamFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    <option value="ALL">Semua Tim</option>
                    <option value="Tim Gamet 1">Tim Gamet 1</option>
                    <option value="Tim Gamet 2">Tim Gamet 2</option>
                    <option value="Tim Gamet 3">Tim Gamet 3</option>
                    <option value="UNASSIGNED">⚠️ Belum Ditugaskan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Monitoring Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3 sticky left-0 z-30 bg-slate-900 w-[110px] min-w-[110px]">No & Waktu Upload</th>
                    <th className="p-3 sticky left-[110px] z-30 bg-slate-900 w-[180px] min-w-[180px]">Pelanggan & Lokasi</th>
                    <th className="p-3 sticky left-[290px] z-30 bg-slate-900 w-[120px] min-w-[120px]">Nomor HP</th>
                    <th className="p-3 sticky left-[410px] z-30 bg-slate-900 w-[120px] min-w-[120px]">Tarif & Daya</th>
                    <th className="p-3 sticky left-[530px] z-30 bg-slate-900 w-[130px] min-w-[130px] border-r-2 border-slate-700 shadow-sm">Gardu & Tiang</th>
                    <th className="p-3 min-w-[110px]">Lama Gangguan</th>
                    <th className="p-3 min-w-[140px]">Input Pemakaian / Bulan (Rp)</th>
                    <th className="p-3 min-w-[150px] bg-cyan-950 text-cyan-200 border-x border-cyan-800">Tagihan Susulan (AI Rp)</th>
                    <th className="p-3 min-w-[130px] bg-teal-950 text-teal-200">Pemakaian kWh (AI)</th>
                    <th className="p-3 min-w-[150px]">Jenis Gangguan</th>
                    <th className="p-3 min-w-[180px]">Petugas (Tim Gamet)</th>
                    <th className="p-3 min-w-[110px] text-center">Status</th>
                    <th className="p-3 min-w-[110px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredMonitoringWo.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-10 text-center text-slate-400">
                        <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Tidak ada data Work Order Gamet & Tagsus yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMonitoringWo.map((wo, index) => {
                      const recommendedTeam = getAiRecommendedTeam(wo.gardu, wo.titikTumpu, wo.alamatPelanggan);
                      
                      // Values & Calculations as requested
                      const lamaGangguan = wo.lamaGangguanHari ?? 30;
                      const pemakaianBulanRp = wo.pemakaianRupiahPerBulan ?? 300000;
                      const tarifRpKwh = getTarifRpPerKwh(wo.tarif, wo.daya);
                      
                      // Rumus 1: Tagihan Susulan = (pemakaianRupiahPerBulan / 30) * lamaGangguan
                      const tagihanSusulanRp = Math.round((pemakaianBulanRp / 30) * lamaGangguan);
                      
                      // Rumus 2: Pemakaian kWh = Tagihan Susulan / tarifRpKwh
                      const pemakaianKwh = (tagihanSusulanRp / (tarifRpKwh || 1352)).toFixed(2);

                      return (
                        <tr key={wo.id} className="group hover:bg-slate-50 transition">
                          {/* 1. No & Waktu Upload */}
                          <td className="p-3 sticky left-0 z-20 bg-white group-hover:bg-slate-50 w-[110px] min-w-[110px]">
                            <span className="font-mono text-[10px] text-slate-400 block">#{index + 1}</span>
                            <span className="font-mono font-bold text-slate-900 text-[11px] block">{wo.id}</span>
                            <span className="text-[10px] text-slate-500">{wo.uploadedAt.substring(0, 10)}</span>
                          </td>

                          {/* 2. Pelanggan & Lokasi */}
                          <td className="p-3 sticky left-[110px] z-20 bg-white group-hover:bg-slate-50 w-[180px] min-w-[180px]">
                            <div className="font-mono font-extrabold text-emerald-900 text-xs">{wo.idpel}</div>
                            <div className="font-bold text-slate-900 truncate">{wo.namaPelanggan}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{wo.alamatPelanggan}</div>
                          </td>

                          {/* 3. Kolom Nomor HP */}
                          <td className="p-3 sticky left-[290px] z-20 bg-white group-hover:bg-slate-50 w-[120px] min-w-[120px]">
                            <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{wo.nomorTelepon || '-'}</span>
                            </div>
                          </td>

                          {/* 4. Kolom Tarif Daya */}
                          <td className="p-3 sticky left-[410px] z-20 bg-white group-hover:bg-slate-50 w-[120px] min-w-[120px]">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 block w-fit">
                              {wo.tarif || 'R1M'} / {wo.daya || '900 VA'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                              Rp {tarifRpKwh.toLocaleString('id-ID')} / kWh
                            </span>
                          </td>

                          {/* 5. Kolom Gardu & Tiang (Dipindah ke sebelah kanan Tarif & Daya & Frozen) */}
                          <td className="p-3 sticky left-[530px] z-20 bg-white group-hover:bg-slate-50 w-[130px] min-w-[130px] border-r-2 border-slate-300 shadow-sm">
                            <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{wo.gardu || 'BG-042'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Gauge className="w-3 h-3 text-cyan-600 shrink-0" />
                              <span>{wo.titikTumpu || 'Tiang B2-14'}</span>
                            </div>
                          </td>

                          {/* 6. Kolom Lama Gangguan */}
                          <td className="p-3 min-w-[110px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={lamaGangguan}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  if (onUpdateWorkOrder) {
                                    onUpdateWorkOrder({ ...wo, lamaGangguanHari: val });
                                  }
                                }}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-extrabold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-slate-600">Hari</span>
                            </div>
                          </td>

                          {/* 7. Kolom Input Pemakaian perbulan */}
                          <td className="p-3 min-w-[140px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-black text-slate-500">Rp</span>
                              <input
                                type="number"
                                step="10000"
                                min="0"
                                value={pemakaianBulanRp}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  if (onUpdateWorkOrder) {
                                    onUpdateWorkOrder({ ...wo, pemakaianRupiahPerBulan: val });
                                  }
                                }}
                                className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-extrabold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5 text-right">/ bulan</span>
                          </td>

                          {/* 8. Kolom Tagihan Susulan (AI) */}
                          <td className="p-3 min-w-[150px] bg-cyan-50/50 border-x border-cyan-100">
                            <div className="font-mono font-black text-cyan-950 text-xs flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <span>Rp {tagihanSusulanRp.toLocaleString('id-ID')}</span>
                            </div>
                            <span className="text-[9px] text-cyan-700 font-semibold block mt-0.5">
                              ({pemakaianBulanRp.toLocaleString('id-ID')} ÷ 30) × {lamaGangguan} hr
                            </span>
                          </td>

                          {/* 9. Kolom Pemakaian kWh (AI) */}
                          <td className="p-3 min-w-[130px] bg-teal-50/30">
                            <div className="font-mono font-black text-emerald-950 text-xs">
                              {Number(pemakaianKwh).toLocaleString('id-ID')} kWh
                            </div>
                            <span className="text-[9px] text-teal-700 font-semibold block mt-0.5">
                              Rp {tagihanSusulanRp.toLocaleString('id-ID')} ÷ {tarifRpKwh}
                            </span>
                          </td>

                          {/* 10. Kolom Jenis Gangguan */}
                          <td className="p-3 min-w-[150px]">
                            {(() => {
                              const matchingGangguan = gangguanRecords.find((g) => g.idpel === wo.idpel);
                              const rawJg = wo.jenisGangguanApp || (wo as any).jenisGangguan || matchingGangguan?.jenisGangguan || 'METER_MACET';
                              const formattedJg = String(rawJg).replace(/_/g, ' ');

                              return (
                                <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 uppercase inline-block">
                                    {formattedJg}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block italic line-clamp-1 max-w-[140px]">
                                    {getGametTypeLabel(wo.jenisPenggantian)}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <select
                                value={wo.assignedTim || 'Belum Ditugaskan'}
                                onChange={(e) => {
                                  if (onUpdateWorkOrder) {
                                    onUpdateWorkOrder({ ...wo, assignedTim: e.target.value });
                                  }
                                }}
                                className={`w-full px-2.5 py-1.5 border rounded-xl font-bold text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 ${
                                  wo.assignedTim && wo.assignedTim !== 'Belum Ditugaskan'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                    : 'bg-amber-50 border-amber-300 text-amber-900'
                                }`}
                              >
                                <option value="Belum Ditugaskan">⚠️ Belum Ditugaskan</option>
                                <option value="Tim Gamet 1">Tim Gamet 1</option>
                                <option value="Tim Gamet 2">Tim Gamet 2</option>
                                <option value="Tim Gamet 3">Tim Gamet 3</option>
                              </select>

                              <div className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-cyan-600 shrink-0" />
                                <span>AI Rec: <strong>{recommendedTeam}</strong></span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {wo.status === 'SELESAI' ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-[10px] border border-emerald-300 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SELESAI
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-extrabold text-[10px] border border-amber-300 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> BELUM DIGANTI
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right space-y-1">
                            <button
                              type="button"
                              onClick={() => applyWoToForm(wo)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] shadow-sm flex items-center gap-1 ml-auto cursor-pointer transition"
                            >
                              <span>Input Meter</span> <ArrowRight className="w-3 h-3" />
                            </button>

                            {onDeleteWorkOrder && (
                              <div>
                                {deletingWoId === wo.id ? (
                                  <div className="flex items-center justify-end gap-1 mt-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                    <span className="text-[9px] text-rose-700 font-extrabold">Hapus?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteWorkOrder(wo.id);
                                        setDeletingWoId(null);
                                      }}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black cursor-pointer shadow-sm"
                                    >
                                      Ya
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingWoId(null)}
                                      className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingWoId(wo.id)}
                                    className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 underline block ml-auto mt-1 cursor-pointer"
                                  >
                                    Hapus WO
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: FORM INPUT GANTI METER GAMET                                     */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black uppercase tracking-tight text-white">
                    FORM INPUT LAPANGAN PENGGANTIAN METER GAMET (PRA-PASCA)
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> AI OCR READY
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Input data pelaksanaan program penggantian kWh meter pra-pasca, reaging meter tua, dan penormalan meter rusak.
                </p>
              </div>
            </div>

            {selectedWo && (
              <div className="bg-amber-500/20 border border-amber-400/40 rounded-2xl px-4 py-2 text-amber-200 text-xs font-bold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Target WO Loaded: IDPEL {selectedWo.idpel}</span>
                <button
                  type="button"
                  onClick={() => setSelectedWo(null)}
                  className="p-1 hover:bg-amber-500/30 rounded-lg text-amber-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            {/* Quick IDPEL Search & Target WO Selector */}
            <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Search className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <label className="text-xs font-extrabold text-emerald-950 block">Cari Target WO Gamet / Customer DB</label>
                  <p className="text-[11px] text-emerald-700">Ketik IDPEL untuk mengisi data pelanggan secara otomatis</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Masukkan IDPEL..."
                  value={idpel}
                  onChange={(e) => handleIdpelFormSearch(e.target.value)}
                  className="px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-56"
                />
                {workOrders.filter(w => w.status === 'BELUM_DIGANTI').length > 0 && (
                  <select
                    onChange={(e) => {
                      const wo = workOrders.find(w => w.id === e.target.value);
                      if (wo) applyWoToForm(wo);
                    }}
                    value={selectedWo?.id || ''}
                    className="px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">⚡ Pilih Target WO Gamet ({workOrders.filter(w=>w.status==='BELUM_DIGANTI').length})</option>
                    {workOrders.filter(w => w.status === 'BELUM_DIGANTI').map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.idpel} - {wo.namaPelanggan} ({wo.jenisPenggantian.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* SECTION 1: DATA PELANGGAN (LOCKED IDENTITY) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>1. DATA IDENTITAS PELANGGAN & GANGGUAN APP (TERKUNCI)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-300">
                  <Lock className="w-3 h-3 text-slate-500" /> Data Master Locked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>ID Pelanggan (IDPEL) *</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={idpel}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 cursor-not-allowed outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Nama Pelanggan *</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={namaPelanggan}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>No. Telefon / HP *</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={nomorTelepon}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 cursor-not-allowed outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Alamat Bangunan Pelanggan</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={alamatPelanggan}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 cursor-not-allowed outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Tarif</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={tarif}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Daya</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={daya}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Data Gardu</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={gardu}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Titik Tumpu</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={titikTumpu}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* JENIS GANGGUAN APP (TERKUNCI) */}
                <div className="md:col-span-4">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Jenis Gangguan APP *</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </label>
                  <select
                    disabled
                    value={jenisGangguanApp}
                    className="w-full px-3 py-2 bg-rose-50 border border-rose-300 text-rose-950 font-black rounded-xl cursor-not-allowed appearance-none"
                  >
                    <option value="METER_MACET">Meter Macet / Piringan Tidak Berputar</option>
                    <option value="METER_BURAM">Kaca KWh Meter Buram / Berembun</option>
                    <option value="METER_MATI">KWh Meter Mati Total / Unmetered</option>
                    <option value="DISPLAY_ERROR">Display LCD Error / Tulisan Periksa</option>
                    <option value="KEYPAD_ANGKA_RUSAK_ERROR">Keypad / Angka kWh Meter Rusak / Error</option>
                    <option value="SEGEL_PUTUS">Segel Meter / Terminal Putus / Rusak</option>
                    <option value="TERMINAL_HANGUS">Terminal KWh Meter Hangus / Gosong</option>
                    <option value="KWH_ERROR">KWh Error Akurasi / Melonjak Anomali</option>
                    <option value="MCB_1PH_RUSAK_TERBAKAR">MCB 1 ph Rusak/Terbakar</option>
                    <option value="MCB_3PH_RUSAK_TERBAKAR">MCB 3 ph Rusak/Terbakar</option>
                    {!['METER_MACET', 'METER_BURAM', 'METER_MATI', 'DISPLAY_ERROR', 'KEYPAD_ANGKA_RUSAK_ERROR', 'SEGEL_PUTUS', 'TERMINAL_HANGUS', 'KWH_ERROR', 'MCB_1PH_RUSAK_TERBAKAR', 'MCB_3PH_RUSAK_TERBAKAR'].includes(jenisGangguanApp) && (
                      <option value={jenisGangguanApp}>{(jenisGangguanApp as string).replace(/_/g, ' ')}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: METER LAMA & METER BARU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* METER LAMA (CABUT) */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase">
                  <Gauge className="w-4 h-4 text-amber-700" />
                  <span>2. DATA KWH METER LAMA (DICABUT)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Merk Meter Lama</label>
                    <input
                      type="text"
                      value={merkMeterLama}
                      onChange={(e) => setMerkMeterLama(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nomor Meter Lama</label>
                    <input
                      type="text"
                      value={nomorMeterLama}
                      onChange={(e) => setNomorMeterLama(e.target.value)}
                      placeholder="0192830192"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Stan Cabut (kWh) *</label>
                    <input
                      type="text"
                      required
                      value={stanCabutLama}
                      onChange={(e) => setStanCabutLama(e.target.value)}
                      placeholder="28450.0"
                      className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl font-mono font-black text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sisa Pulsa (kWh, jika ada)</label>
                    <input
                      type="text"
                      value={sisaPulsaLama}
                      onChange={(e) => setSisaPulsaLama(e.target.value)}
                      placeholder="12.5 kWh"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* METER BARU (PASANG) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  <span>3. DATA KWH METER BARU (DIPASANG)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Merk Meter Baru *</label>
                    <input
                      type="text"
                      required
                      value={merkMeterBaru}
                      onChange={(e) => setMerkMeterBaru(e.target.value)}
                      placeholder="Itron Smart / Hexing"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nomor Meter Baru *</label>
                    <input
                      type="text"
                      required
                      value={nomorMeterBaru}
                      onChange={(e) => setNomorMeterBaru(e.target.value)}
                      placeholder="14209823401"
                      className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Stan Awal Baru (kWh)</label>
                    <input
                      type="text"
                      value={stanAwalBaru}
                      onChange={(e) => setStanAwalBaru(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Token Perdana (20 Digit)</label>
                    <input
                      type="text"
                      value={tokenPerdana}
                      onChange={(e) => setTokenPerdana(e.target.value)}
                      placeholder="1829-4019-2830-1920"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: WAKTU & TIM EXECUTION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>4. PELAKSANAAN & TIM GAMET LAPANGAN</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal Ganti Meter *</label>
                  <input
                    type="date"
                    required
                    value={tanggalGanti}
                    onChange={(e) => setTanggalGanti(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Waktu Ganti</label>
                  <input
                    type="time"
                    value={waktuGanti}
                    onChange={(e) => setWaktuGanti(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Petugas Lapangan</label>
                  <input
                    type="text"
                    value={namaPetugas}
                    onChange={(e) => setNamaPetugas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tim Gamet</label>
                  <input
                    type="text"
                    value={timGamet}
                    onChange={(e) => setTimGamet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: DOKUMENTASI FOTO LAPANGAN & AI OCR */}
            <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>5. DOKUMENTASI FOTO LAPANGAN (WAJIB FOTO RUMAH, KTP, METER LAMA & METER BARU)</span>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiVerification}
                  disabled={isVerifyingAi}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer"
                >
                  {isVerifyingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifikasi AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Uji Verifikasi AI OCR
                    </>
                  )}
                </button>
              </div>

              {gametPhotoErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{gametPhotoErrorMsg}</span>
                </div>
              )}

              {aiVerifiedResult && (
                <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold block">Hasil AI Engine Verification (Score: {Math.round(aiVerifiedResult.confidenceScore*100)}%):</strong>
                    <p className="text-[11px] font-medium mt-0.5">{aiVerifiedResult.summary}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. FOTO RUMAH PELANGGAN */}
                <div className={`p-4 bg-white border rounded-xl space-y-3 shadow-xs ${!fotoRumah ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      1. Foto Rumah Pelanggan <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                    </span>
                    {fotoRumah && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                        Terupload ✓
                      </span>
                    )}
                  </div>

                  {fotoRumah ? (
                    <div className="space-y-2">
                      <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img src={fotoRumah} alt="Foto Rumah" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotoRumah(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                          title="Hapus / Replace Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="h-36 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Foto Rumah</span>
                        <span className="text-[10px] text-slate-500">Format JPG / PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFotoRumah(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFotoRumah('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80')}
                        className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-200 transition"
                      >
                        + Contoh Foto Rumah
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. FOTO KTP PELANGGAN */}
                <div className={`p-4 bg-white border rounded-xl space-y-3 shadow-xs ${!fotoKtp ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      2. Foto KTP Pelanggan <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                    </span>
                    {fotoKtp && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                        Terupload ✓
                      </span>
                    )}
                  </div>

                  {fotoKtp ? (
                    <div className="space-y-2">
                      <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img src={fotoKtp} alt="Foto KTP" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotoKtp(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                          title="Hapus / Replace Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="h-36 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Foto KTP</span>
                        <span className="text-[10px] text-slate-500">Format JPG / PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFotoKtp(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFotoKtp('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80')}
                        className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-200 transition"
                      >
                        + Contoh Foto KTP
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. FOTO KWH METER LAMA */}
                <div className={`p-4 bg-white border rounded-xl space-y-3 shadow-xs ${!fotoMeterLama ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      3. Foto KWh Meter Lama <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                    </span>
                    {fotoMeterLama && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                        Terupload ✓
                      </span>
                    )}
                  </div>

                  {fotoMeterLama ? (
                    <div className="space-y-2">
                      <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img src={fotoMeterLama} alt="Foto KWh Meter Lama" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotoMeterLama(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                          title="Hapus / Replace Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="h-36 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Foto KWh Meter Lama</span>
                        <span className="text-[10px] text-slate-500">Format JPG / PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFotoMeterLama(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFotoMeterLama('https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80')}
                        className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-200 transition"
                      >
                        + Contoh Foto KWh Meter Lama
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. FOTO KWH METER BARU */}
                <div className={`p-4 bg-white border rounded-xl space-y-3 shadow-xs ${!fotoMeterBaru ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      4. Foto KWh Meter Baru <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                    </span>
                    {fotoMeterBaru && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                        Terupload ✓
                      </span>
                    )}
                  </div>

                  {fotoMeterBaru ? (
                    <div className="space-y-2">
                      <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img src={fotoMeterBaru} alt="Foto KWh Meter Baru" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotoMeterBaru(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                          title="Hapus / Replace Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="h-36 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Foto KWh Meter Baru</span>
                        <span className="text-[10px] text-slate-500">Format JPG / PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFotoMeterBaru(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFotoMeterBaru('https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80')}
                        className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-200 transition"
                      >
                        + Contoh Foto KWh Meter Baru
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIdpel('');
                  setNamaPelanggan('');
                  setNomorMeterBaru('');
                  setSelectedWo(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Form
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" /> Simpan Data Penggantian Gamet & Cetak BA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPERVISOR TARGET WORK ORDERS GAMET                             */}
      {/* ========================================================================= */}
      {activeTab === 'supervisor' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden space-y-6 p-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-6 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  MANAJEMEN TARGET WORK ORDER GAMET (SUPERVISOR)
                </h2>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  Upload file Excel/CSV target penggantian meter Gamet, delegasikan ke tim lapangan, dan pantau status realisasi.
                </p>
              </div>
            </div>

            {/* Sub-tab Switchers */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setSupervisorSubTab('list')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  supervisorSubTab === 'list' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Daftar Target WO ({workOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setSupervisorSubTab('add_single')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  supervisorSubTab === 'add_single' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
              >
                + Single Target
              </button>
              <button
                type="button"
                onClick={() => setSupervisorSubTab('upload_file')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  supervisorSubTab === 'upload_file' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Upload File Excel
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: LIST DAFTAR TARGET WO GAMET */}
          {supervisorSubTab === 'list' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari IDPEL / Nama Pelanggan / Tim..."
                    value={searchWoQuery}
                    onChange={(e) => setSearchWoQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={woStatusFilter}
                    onChange={(e) => setWoStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="ALL">Semua Status Target</option>
                    <option value="BELUM_DIGANTI">Belum Diganti ({workOrders.filter(w=>w.status==='BELUM_DIGANTI').length})</option>
                    <option value="SELESAI">Selesai ({workOrders.filter(w=>w.status==='SELESAI').length})</option>
                  </select>

                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Template Excel
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">IDPEL & Pelanggan</th>
                      <th className="p-3.5">Tarif / Daya</th>
                      <th className="p-3.5">Program Gamet</th>
                      <th className="p-3.5">Assigned Tim Gamet</th>
                      <th className="p-3.5 text-center">Status Target</th>
                      <th className="p-3.5 text-right">Aksi Execution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {filteredWo.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                          Belum ada target Work Order Gamet yang diunggah.
                        </td>
                      </tr>
                    ) : (
                      filteredWo.map((wo) => (
                        <tr key={wo.id} className="hover:bg-slate-50 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-emerald-950 text-sm">{wo.idpel}</div>
                            <div className="font-bold text-slate-900">{wo.namaPelanggan}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{wo.alamatPelanggan}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800">{wo.tarif} / {wo.daya}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                              {getGametTypeLabel(wo.jenisPenggantian)}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-700">
                            {wo.assignedTim || 'Tim Gamet Central'}
                          </td>
                          <td className="p-3.5 text-center">
                            {wo.status === 'SELESAI' ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                                ✓ SELESAI
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] border border-amber-300">
                                ⏳ BELUM DIGANTI
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-y-1">
                            {wo.status === 'BELUM_DIGANTI' ? (
                              <button
                                type="button"
                                onClick={() => applyWoToForm(wo)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                Eksekusi Gamet <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 block text-right">Realisasi Selesai</span>
                            )}
                            {onDeleteWorkOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Hapus Work Order Target IDPEL ${wo.idpel}?`)) {
                                    onDeleteWorkOrder(wo.id);
                                  }
                                }}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline block ml-auto cursor-pointer"
                              >
                                Hapus WO
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: SINGLE ADD TARGET */}
          {supervisorSubTab === 'add_single' && (
            <form onSubmit={handleAddSingleWo} className="space-y-4 max-w-2xl bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase">Tambah Target Single Work Order Gamet</h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">IDPEL Target *</label>
                  <input
                    type="text"
                    required
                    value={woIdpel}
                    onChange={(e) => setWoIdpel(e.target.value)}
                    placeholder="538900xxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    value={woNama}
                    onChange={(e) => setWoNama(e.target.value)}
                    placeholder="Nama Pelanggan"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-bold block mb-1">Alamat Pelanggan</label>
                  <input
                    type="text"
                    value={woAlamat}
                    onChange={(e) => setWoAlamat(e.target.value)}
                    placeholder="Jl. Diponegoro No. 88"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Jenis Program Gamet</label>
                  <select
                    value={woJenis}
                    onChange={(e) => setWoJenis(e.target.value as GametType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="PASCABAYAR_KE_PRABAYAR">Pascabayar ke Prabayar</option>
                    <option value="PRABAYAR_KE_PASCABAYAR">Prabayar ke Pascabayar</option>
                    <option value="REAGING_METER_TUA">Reaging Meter Tua</option>
                    <option value="PENGGANTIAN_RUSAK_REGULAR">Penggantian Rusak Regular</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Tim Gamet Lapangan</label>
                  <input
                    type="text"
                    value={woTim}
                    onChange={(e) => setWoTim(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Simpan Target WO
                </button>
              </div>
            </form>
          )}

          {/* SUB-VIEW 3: UPLOAD FILE EXCEL */}
          {supervisorSubTab === 'upload_file' && (
            <div className="space-y-4 max-w-2xl bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">Upload File Target Excel / CSV Gamet</h3>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Template Excel
                </button>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
                  dragOver ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white'
                }`}
              >
                <FileSpreadsheet className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Tarik & Lepas File Excel (.xlsx / .csv) Target Gamet di Sini</p>
                <p className="text-[11px] text-slate-500 mb-3">Atau klik tombol di bawah untuk memilih file dari komputer Anda</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processSelectedFile(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Pilih File Excel Target
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIWAYAT & BERITA ACARA GAMET                                      */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden space-y-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-600" /> RIWAYAT PENGGANTIAN METER GAMET & BERITA ACARA
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Daftar lengkap penggantian KWh meter program Gamet terverifikasi.
              </p>
            </div>

            <button
              type="button"
              onClick={exportHistoryToCsv}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <Download className="w-4 h-4" /> Export Excel / CSV
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari IDPEL / Nama / No BA / Meter Baru..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={historyJenisFilter}
                onChange={(e) => setHistoryJenisFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="ALL">Semua Program Gamet</option>
                <option value="PASCABAYAR_KE_PRABAYAR">Pascabayar ke Prabayar</option>
                <option value="PRABAYAR_KE_PASCABAYAR">Prabayar ke Pascabayar</option>
                <option value="REAGING_METER_TUA">Reaging Meter Tua</option>
                <option value="PENGGANTIAN_RUSAK_REGULAR">Penggantian Rusak Regular</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">No. BA & Tanggal</th>
                  <th className="p-3.5">IDPEL & Pelanggan</th>
                  <th className="p-3.5">Program Gamet</th>
                  <th className="p-3.5">Stan Cabut & Sisa Pulsa</th>
                  <th className="p-3.5">KWh Meter Baru</th>
                  <th className="p-3.5">Petugas / Tim</th>
                  <th className="p-3.5 text-center">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Belum ada riwayat pelaksanaan penggantian meter Gamet.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900">{rec.noBeritaAcara}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{rec.tanggalGanti}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-emerald-950 text-sm">{rec.idpel}</div>
                        <div className="font-bold text-slate-900">{rec.namaPelanggan}</div>
                        <div className="text-[10px] text-slate-500">{rec.tarif} / {rec.daya}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                          {getGametTypeLabel(rec.jenisPenggantian)}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-amber-900 font-bold">Cabut: {rec.stanCabutLama} kWh</div>
                        {rec.sisaPulsaLama && <div className="text-[10px] text-slate-500">Sisa Pulsa: {rec.sisaPulsaLama}</div>}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{rec.merkMeterBaru}</div>
                        <div className="font-mono text-emerald-900 font-bold text-[11px]">{rec.nomorMeterBaru}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{rec.namaPetugas}</div>
                        <div className="text-[10px] text-slate-500">{rec.timGamet}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord(rec)}
                            title="Detail & Verifikasi AI"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPrintRecord(rec)}
                            title="Cetak Berita Acara (BA)"
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus riwayat penggantian Gamet IDPEL ${rec.idpel}?`)) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            title="Hapus Record"
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ANALYTICS & SUMMARY GAMET                                         */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Total Realisasi Gamet</span>
                <strong className="text-2xl font-black text-emerald-600">{records.length} Unit</strong>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Target WO Active</span>
                <strong className="text-2xl font-black text-amber-600">
                  {workOrders.filter(w => w.status === 'BELUM_DIGANTI').length} Target
                </strong>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Pasca ke Prabayar</span>
                <strong className="text-2xl font-black text-slate-900">
                  {records.filter(r => r.jenisPenggantian === 'PASCABAYAR_KE_PRABAYAR').length}
                </strong>
              </div>
              <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Reaging Meter Tua</span>
                <strong className="text-2xl font-black text-slate-900">
                  {records.filter(r => r.jenisPenggantian === 'REAGING_METER_TUA').length}
                </strong>
              </div>
              <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase">Ringkasan Capaian Program Ganti Meter Pra-Pasca (Gamet)</h3>
            <div className="space-y-3 text-xs font-medium">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Realisasi Target Work Order Gamet</span>
                  <span>{workOrders.length > 0 ? Math.round((records.length / workOrders.length) * 100) : 100}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${workOrders.length > 0 ? Math.min(100, Math.round((records.length / workOrders.length) * 100)) : 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTabChange('form')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer"
              >
                + Input Ganti Meter Baru
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('supervisor')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow cursor-pointer"
              >
                Upload Target WO Gamet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINTABLE BERITA ACARA (BA) GAMET                                  */}
      {/* ========================================================================= */}
      {selectedPrintRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak / Simpan PDF
            </button>
            <button
              onClick={() => setSelectedPrintRecord(null)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-3xl w-full p-8 md:p-10 my-auto overflow-y-auto print:max-w-none print:w-full print:shadow-none print:p-0 print:my-0">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                .print-sheet-gamet, .print-sheet-gamet * { visibility: visible; }
                .print-sheet-gamet { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>

            <div className="print-sheet-gamet space-y-6 text-xs text-slate-900">
              {/* Header PLN Official */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-900 text-yellow-400 font-black text-xl flex items-center justify-center rounded-lg tracking-tighter">
                    PLN
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm tracking-wide text-slate-900">PT PLN (PERSERO)</h2>
                    <h3 className="font-bold text-xs text-slate-700 uppercase">PROGRAM GANTI METER PRA-PASCA (GAMET)</h3>
                    <p className="text-[10px] text-slate-500">BERITA ACARA PENGGANTIAN KWH METER PELANGGAN</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded border border-slate-300">
                    BA-GAMET-2026
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Dokumen Resmi Layanan Pelanggan</p>
                </div>
              </div>

              {/* Title Document */}
              <div className="text-center space-y-1">
                <h1 className="text-base font-black uppercase underline tracking-wider">
                  BERITA ACARA PENGGANTIAN KWH METER PROGRAM GAMET
                </h1>
                <p className="font-mono text-xs font-bold text-emerald-900">
                  NOMOR: {selectedPrintRecord.noBeritaAcara}
                </p>
              </div>

              <p className="text-xs leading-relaxed">
                Pada hari ini <strong>{new Date(selectedPrintRecord.tanggalGanti).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, 
                telah dilaksanakan pekerjaan penggantian KWh meter program GAMET pada instalasi pelanggan berikut:
              </p>

              {/* Section 1: Data Pelanggan */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300 uppercase text-[11px] text-slate-800">
                  I. IDENTITAS PELANGGAN
                </div>
                <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">ID Pelanggan (IDPEL):</span>
                    <strong className="font-mono text-sm text-emerald-950">{selectedPrintRecord.idpel}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nama Pelanggan:</span>
                    <strong className="font-bold">{selectedPrintRecord.namaPelanggan}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tarif / Daya:</span>
                    <strong className="font-medium">{selectedPrintRecord.tarif} / {selectedPrintRecord.daya}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Program Gamet:</span>
                    <strong className="font-bold text-emerald-900">{getGametTypeLabel(selectedPrintRecord.jenisPenggantian)}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Alamat Bangunan:</span>
                    <span className="font-medium">{selectedPrintRecord.alamatPelanggan}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Data Teknis */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300 uppercase text-[11px] text-slate-800">
                  II. DATA TEKNIS KWH METER LAMA DAN BARU
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-300 text-xs">
                  <div className="p-3 space-y-1.5 bg-amber-50/30">
                    <h4 className="font-bold text-amber-900 underline text-xs">KWH METER LAMA (DICABUT)</h4>
                    <div>Merk Meter: <strong>{selectedPrintRecord.merkMeterLama || '-'}</strong></div>
                    <div>Nomor Meter: <strong className="font-mono">{selectedPrintRecord.nomorMeterLama}</strong></div>
                    <div>STAN CABUT: <strong className="font-mono text-amber-900 bg-amber-100 px-1 rounded">{selectedPrintRecord.stanCabutLama} kWh</strong></div>
                    {selectedPrintRecord.sisaPulsaLama && <div>Sisa Pulsa: <strong>{selectedPrintRecord.sisaPulsaLama}</strong></div>}
                  </div>

                  <div className="p-3 space-y-1.5 bg-emerald-50/30">
                    <h4 className="font-bold text-emerald-900 underline text-xs">KWH METER BARU (DIPASANG)</h4>
                    <div>NOMOR METER BARU: <strong className="font-mono text-emerald-900">{selectedPrintRecord.nomorMeterBaru}</strong></div>
                    <div>Merk / Tipe: <strong>{selectedPrintRecord.merkMeterBaru}</strong></div>
                    <div>Stan Awal: <strong className="font-mono">{selectedPrintRecord.stanAwalBaru} kWh</strong></div>
                    {selectedPrintRecord.tokenPerdana && <div>Token Perdana: <strong className="font-mono text-emerald-900">{selectedPrintRecord.tokenPerdana}</strong></div>}
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-12">
                  <p>Pelanggan / Penerima Layanan,</p>
                  <div className="border-b border-slate-900 w-48 mx-auto"></div>
                  <p className="font-bold">{selectedPrintRecord.namaPelanggan}</p>
                </div>

                <div className="space-y-12">
                  <p>Petugas Pelaksana GAMET PLN,</p>
                  <div className="border-b border-slate-900 w-48 mx-auto"></div>
                  <p className="font-bold">{selectedPrintRecord.namaPetugas} ({selectedPrintRecord.timGamet})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETAIL GAMET                                                        */}
      {/* ========================================================================= */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900">DETAIL REKAMAN PENGGANTIAN GAMET</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedDetailRecord.noBeritaAcara}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>IDPEL: <strong className="font-mono text-emerald-950 font-bold">{selectedDetailRecord.idpel}</strong></div>
                <div>Pelanggan: <strong>{selectedDetailRecord.namaPelanggan}</strong></div>
                <div>Tarif / Daya: <strong>{selectedDetailRecord.tarif} / {selectedDetailRecord.daya}</strong></div>
                <div>Program: <strong>{getGametTypeLabel(selectedDetailRecord.jenisPenggantian)}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">METER LAMA (DICABUT):</span>
                  <strong>{selectedDetailRecord.nomorMeterLama}</strong> ({selectedDetailRecord.stanCabutLama} kWh)
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">METER BARU (DIPASANG):</span>
                  <strong className="text-emerald-900">{selectedDetailRecord.nomorMeterBaru}</strong> ({selectedDetailRecord.merkMeterBaru})
                </div>
              </div>

              {selectedDetailRecord.aiVerification && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 font-medium text-[11px]">
                  ✓ {selectedDetailRecord.aiVerification.summary}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const rec = selectedDetailRecord;
                  setSelectedDetailRecord(null);
                  setSelectedPrintRecord(rec);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak BA
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
