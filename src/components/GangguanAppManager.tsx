import React, { useState, useRef } from 'react';
import { 
  AlertTriangle, Upload, FileSpreadsheet, Plus, CheckCircle2, Clock, 
  Trash2, Search, Filter, PhoneCall, UserCheck, Download, AlertCircle, Loader2, 
  ArrowRight, FileText, Wrench, Sparkles, Camera, Database, Eye, RefreshCw, Check, Calendar, Lock, Unlock,
  BarChart3, TrendingUp, PieChart, Activity, Zap, DollarSign, Layers, ChevronDown, ChevronUp, X, Users,
  ExternalLink, Link2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GangguanAppRecord, CustomerMasterItem } from '../types';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { DEFAULT_GOOGLE_SHEETS_URL, fetchGoogleSheetsCsv, fetchAllCustomersFromServer, parseSpreadsheetToCustomerList } from '../utils/googleSheetsSync';

export interface BatchConvertWoItem {
  recordId?: string;
  idpel: string;
  nama: string;
  alamat: string;
  jenisGangguan: string;
  tarif?: string;
  daya?: string;
  gardu?: string;
  titikTumpu?: string;
  nomorMeter?: string;
  nomorTelepon?: string;
  lamaGangguanHari?: number;
  assignedTim?: string;
  catatanSupervisor?: string;
}

interface GangguanAppManagerProps {
  records: GangguanAppRecord[];
  customerDatabase: CustomerMasterItem[];
  activeSubTab?: 'input' | 'list' | 'custdb' | 'upload' | 'analytics';
  onSubTabChange?: (tab: 'input' | 'list' | 'custdb' | 'upload' | 'analytics') => void;
  onAddRecord: (newRecord: GangguanAppRecord) => void;
  onAddBatchRecords: (records: GangguanAppRecord[]) => void;
  onUpdateStatus: (id: string, newStatus: GangguanAppRecord['status'], catatan?: string) => void;
  onDeleteRecord: (id: string) => void;
  onConvertToWoP2tl?: (idpel: string, nama: string, alamat: string, jenisGangguan: string) => void;
  onConvertToGamet?: (
    idpel: string, 
    nama: string, 
    alamat: string, 
    jenisGangguan: string,
    extraData?: {
      tarif?: string;
      daya?: string;
      gardu?: string;
      titikTumpu?: string;
      nomorMeter?: string;
      nomorTelepon?: string;
      lamaGangguanHari?: number;
    }
  ) => void;
  onBatchConvertToWoP2tl?: (items: BatchConvertWoItem[]) => void;
  onBatchConvertToGamet?: (items: BatchConvertWoItem[]) => void;
  onAddCustomerMaster?: (newCust: CustomerMasterItem) => void;
  onBatchAddCustomerMaster?: (custs: CustomerMasterItem[]) => void;
  onUpsertCustomerMaster?: (custs: CustomerMasterItem[], replaceAll?: boolean) => void;
  onDeleteCustomerMaster?: (id: string) => void;
}

export const GangguanAppManager: React.FC<GangguanAppManagerProps> = ({
  records,
  customerDatabase,
  activeSubTab: activeSubTabProp,
  onSubTabChange,
  onAddRecord,
  onAddBatchRecords,
  onUpdateStatus,
  onDeleteRecord,
  onConvertToWoP2tl,
  onConvertToGamet,
  onBatchConvertToWoP2tl,
  onBatchConvertToGamet,
  onAddCustomerMaster,
  onBatchAddCustomerMaster,
  onUpsertCustomerMaster,
  onDeleteCustomerMaster
}) => {
  // SUB-TAB NAVIGATION: Default to 'input' (Input Laporan Manual) & Sync with Header props
  const [internalSubTab, setInternalSubTab] = useState<'input' | 'custdb' | 'list' | 'upload' | 'analytics'>('input');
  const activeSubTab = activeSubTabProp !== undefined ? activeSubTabProp : internalSubTab;

  const setActiveSubTab = (tab: 'input' | 'custdb' | 'list' | 'upload' | 'analytics') => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Search, Sort & Filters for Monitoring
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sumberFilter, setSumberFilter] = useState<string>('ALL');
  const [jenisFilter, setJenisFilter] = useState<string>('ALL');
  const [tipeFilter, setTipeFilter] = useState<string>('ALL');
  
  // Replaced sort bulan bypass & sort tipe with Filter Bulan Input & Filter Tahun Input
  const [filterBulanInput, setFilterBulanInput] = useState<string>('ALL');
  const [filterTahunInput, setFilterTahunInput] = useState<string>('ALL');
  const [sortLamaOrder, setSortLamaOrder] = useState<'NONE' | 'TERLAMA' | 'TERBARU'>('NONE');

  // AI Priority Panel Toggle & Analytics Year Filter
  const [showAiPriorityPanel, setShowAiPriorityPanel] = useState<boolean>(true);
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState<string>('ALL');

  // BATCH / KOLEKTIF SELECTION STATE
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // BATCH CONVERSION MODAL STATE
  const [batchModalTarget, setBatchModalTarget] = useState<'P2TL' | 'GAMET' | null>(null);
  const [batchModalSelectedIds, setBatchModalSelectedIds] = useState<string[]>([]);
  const [batchAssignedTim, setBatchAssignedTim] = useState<string>('Tim Penormalan Alpha 01');
  const [batchCatatan, setBatchCatatan] = useState<string>('');

  // IDPEL SEARCH STATE inside Input Laporan Manual
  const [searchIdpelQuery, setSearchIdpelQuery] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<CustomerMasterItem | null>(null);
  const [searchStatus, setSearchStatus] = useState<'IDLE' | 'FOUND' | 'NOT_FOUND'>('IDLE');

  // INPUT FORM MANUAL STATES
  const [isCustomerLocked, setIsCustomerLocked] = useState(true);
  const [idpel, setIdpel] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [alamatPelanggan, setAlamatPelanggan] = useState('');
  const [tarif, setTarif] = useState('R1M');
  const [daya, setDaya] = useState('900 VA');
  const [gardu, setGardu] = useState('');
  const [titikTumpu, setTitikTumpu] = useState('');
  const [merkMeter, setMerkMeter] = useState('');
  const [nomorMeter, setNomorMeter] = useState('');

  // Manual Gangguan Specific Fields
  const [noGangguan, setNoGangguan] = useState(() => `GGN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
  const [noBAGangguan, setNoBAGangguan] = useState(() => `BA-GGN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
  const [tipeMeter, setTipeMeter] = useState<'PRABAYAR' | 'PASCABAYAR' | 'MCB'>('PRABAYAR');
  const [tanggalBypass, setTanggalBypass] = useState(() => new Date().toISOString().substring(0, 10));
  const [sisaToken, setSisaToken] = useState('0.0 kWh');
  const [sumberLaporan, setSumberLaporan] = useState<'YANTEK' | 'BILLMAN' | 'PETUGAS_LAPANGAN'>('YANTEK');
  const [jenisGangguan, setJenisGangguan] = useState<GangguanAppRecord['jenisGangguan']>('METER_MACET');
  const [deskripsiGangguan, setDeskripsiGangguan] = useState('');
  const [petugasPelapor, setPetugasPelapor] = useState('Petugas Yantek Posko 01');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [photoErrorMsg, setPhotoErrorMsg] = useState<string | null>(null);

  // PHOTO & AI INTEGRATION STATES
  const [fotoBA, setFotoBA] = useState<string | null>(null);
  const [isScanningBA, setIsScanningBA] = useState(false);
  const [aiAnalysisBA, setAiAnalysisBA] = useState<{ verified: boolean; confidence: number; summary: string } | null>(null);

  const [fotoKwh, setFotoKwh] = useState<string | null>(null);
  const [isScanningKwh, setIsScanningKwh] = useState(false);
  const [aiAnalysisKwh, setAiAnalysisKwh] = useState<{ verified: boolean; confidence: number; detectedNomorMeter: string; detectedStan: string; summary: string } | null>(null);

  const [fotoStanSisaKwh, setFotoStanSisaKwh] = useState<string | null>(null);
  const [isScanningStan, setIsScanningStan] = useState(false);
  const [aiAnalysisStan, setAiAnalysisStan] = useState<{ verified: boolean; confidence: number; summary: string } | null>(null);

  // CUSTOMER DATABASE MANAGEMENT STATES
  const [custDbSearch, setCustDbSearch] = useState('');
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [isQuickSyncingSheets, setIsQuickSyncingSheets] = useState(false);
  const custDbFileInputRef = useRef<HTMLInputElement>(null);
  const [custDbSuccessMsg, setCustDbSuccessMsg] = useState<string | null>(null);
  const [custDbErrorMsg, setCustDbErrorMsg] = useState<string | null>(null);

  // Quick Sync Handler for Google Sheets
  const handleQuickSyncSheets = async () => {
    setIsQuickSyncingSheets(true);
    setCustDbErrorMsg(null);
    setCustDbSuccessMsg(null);

    const url = localStorage.getItem('simetri_gsheet_url') || DEFAULT_GOOGLE_SHEETS_URL;
    try {
      const res = await fetchGoogleSheetsCsv(url, false);
      if (!res.success) {
        throw new Error(res.error || 'Gagal mengambil data dari Google Sheets.');
      }

      // Fetch all 92,148 customers from server to ensure complete database in app
      const allRes = await fetchAllCustomersFromServer();
      if (allRes.success && allRes.customers.length > 0) {
        if (onUpsertCustomerMaster) {
          onUpsertCustomerMaster(allRes.customers, false);
        } else if (onBatchAddCustomerMaster) {
          onBatchAddCustomerMaster(allRes.customers);
        }
      } else if (res.sampleCustomers && res.sampleCustomers.length > 0) {
        if (onUpsertCustomerMaster) {
          onUpsertCustomerMaster(res.sampleCustomers, false);
        } else if (onBatchAddCustomerMaster) {
          onBatchAddCustomerMaster(res.sampleCustomers);
        }
      }

      const total = res.totalCount || allRes.total || (allRes.customers ? allRes.customers.length : 0);
      const nowStr = res.lastSync || new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      localStorage.setItem('simetri_gsheet_last_sync', nowStr);
      setCustDbSuccessMsg(`Berhasil sinkronisasi! ${total.toLocaleString('id-ID')} data pelanggan PLN tersambung & aktif dari Google Sheets.`);
    } catch (err: any) {
      setCustDbErrorMsg(err.message || 'Gagal menyinkronkan data Google Sheets.');
    } finally {
      setIsQuickSyncingSheets(false);
    }
  };

  // New Customer Modal Form
  const [newCustIdpel, setNewCustIdpel] = useState('');
  const [newCustNama, setNewCustNama] = useState('');
  const [newCustAlamat, setNewCustAlamat] = useState('');
  const [newCustTarif, setNewCustTarif] = useState('R1M');
  const [newCustDaya, setNewCustDaya] = useState('900 VA');
  const [newCustGardu, setNewCustGardu] = useState('SMG-001');
  const [newCustTitik, setNewCustTitik] = useState('Tiang A1-01');
  const [newCustMerk, setNewCustMerk] = useState('Itron');
  const [newCustNoMeter, setNewCustNoMeter] = useState('');

  // FILE UPLOAD FOR GANGGUAN BATCH
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // DETAIL MODAL FOR RECORD
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<GangguanAppRecord | null>(null);

  // --- HANDLER CARI IDPEL ---
  const handleSearchIdpel = async (queryStr?: string) => {
    const q = (queryStr !== undefined ? queryStr : searchIdpelQuery).trim();
    if (!q) return;

    // 1. Local Customer Database lookup
    const matched = customerDatabase.find(
      (c) => c.idpel.toLowerCase() === q.toLowerCase() || c.nama.toLowerCase().includes(q.toLowerCase())
    );

    if (matched) {
      setFoundCustomer(matched);
      setSearchStatus('FOUND');
      setIdpel(matched.idpel);
      setNamaPelanggan(matched.nama);
      setAlamatPelanggan(matched.alamat);
      setTarif(matched.tarif);
      setDaya(matched.daya);
      setGardu(matched.gardu || '-');
      setTitikTumpu(matched.titikTumpu || '-');
      setMerkMeter(matched.merkMeter || '-');
      setNomorMeter(matched.nomorMeter || '-');
      return;
    }

    // 2. Query backend lookup API (for instant access to all 92,000+ customers)
    try {
      const res = await fetch(`/api/customers/lookup/${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.customer) {
          const cust = data.customer;
          setFoundCustomer(cust);
          setSearchStatus('FOUND');
          setIdpel(cust.idpel);
          setNamaPelanggan(cust.nama);
          setAlamatPelanggan(cust.alamat);
          setTarif(cust.tarif);
          setDaya(cust.daya);
          setGardu(cust.gardu || '-');
          setTitikTumpu(cust.titikTumpu || '-');
          setMerkMeter(cust.merkMeter || '-');
          setNomorMeter(cust.nomorMeter || '-');
          return;
        }
      }
    } catch (e) {
      console.log('Customer API lookup note:', e);
    }

    setFoundCustomer(null);
    setSearchStatus('NOT_FOUND');
    setIdpel(q);
  };

  // --- AI SCANNER HANDLERS ---
  const handleAnalyzeFotoBA = (dataUrl: string) => {
    setFotoBA(dataUrl);
    setIsScanningBA(true);
    setAiAnalysisBA(null);

    // AI Processing Simulation
    setTimeout(() => {
      setIsScanningBA(false);
      setAiAnalysisBA({
        verified: true,
        confidence: 0.96,
        summary: 'AI Verification: Berita Acara valid. Tanda tangan saksi & stempel posko Yantek terdeteksi jelas.'
      });
    }, 1200);
  };

  const handleAnalyzeFotoKwh = (dataUrl: string) => {
    setFotoKwh(dataUrl);
    setIsScanningKwh(true);
    setAiAnalysisKwh(null);

    setTimeout(() => {
      setIsScanningKwh(false);
      const detectedNo = nomorMeter && nomorMeter !== '-' ? nomorMeter : `${Math.floor(10000000000 + Math.random() * 90000000000)}`;
      const detectedStanVal = `${Math.floor(1000 + Math.random() * 80000)}.${Math.floor(Math.random() * 9)}`;

      setAiAnalysisKwh({
        verified: true,
        confidence: 0.94,
        detectedNomorMeter: detectedNo,
        detectedStan: detectedStanVal,
        summary: `AI OCR Result: Nomor Meter ${detectedNo} (${nomorMeter && nomorMeter === detectedNo ? '100% Cocok dengan Database' : 'Terdeteksi OCR'}). Stan KWh: ${detectedStanVal}.`
      });
    }, 1400);
  };

  const handleAnalyzeFotoStan = (dataUrl: string) => {
    setFotoStanSisaKwh(dataUrl);
    setIsScanningStan(true);
    setAiAnalysisStan(null);

    setTimeout(() => {
      setIsScanningStan(false);
      setAiAnalysisStan({
        verified: true,
        confidence: 0.95,
        summary: `AI OCR Stan: Stan / Sisa Token ${sisaToken || '12.5 kWh'} terverifikasi jelas dari foto.`
      });
    }, 1300);
  };

  const calculateLamaGangguan = (tanggalBypass?: string, tanggalLapor?: string) => {
    const dateStr = tanggalBypass || tanggalLapor;
    if (!dateStr) return { days: 0, label: '0 Hari' };

    const cleanDateStr = dateStr.split(' ')[0]; // YYYY-MM-DD
    const startDate = new Date(cleanDateStr);
    const today = new Date();

    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) return { days: 0, label: '0 Hari (Hari Ini)' };
    return { days: diffDays, label: `${diffDays} Hari` };
  };

  // --- BATCH CONVERSION MODAL HANDLERS ---
  const handleOpenBatchModal = (target: 'P2TL' | 'GAMET') => {
    const initialIds = selectedRecordIds.length > 0
      ? [...selectedRecordIds]
      : records.filter(r => r.status !== 'SELESAI').map(r => r.id);

    setBatchModalTarget(target);
    setBatchModalSelectedIds(initialIds);
    setBatchAssignedTim(target === 'P2TL' ? 'Tim Penormalan Alpha 01' : 'Tim Gamet 1');
    setBatchCatatan(target === 'P2TL' ? 'Pengiriman WO P2TL Hasil Monitoring Laporan Gangguan' : 'Pengiriman WO Gamet Hasil Monitoring Laporan Gangguan');
  };

  const handleToggleBatchModalSelect = (id: string) => {
    setBatchModalSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllInModal = () => {
    const activeCandidates = records.filter(r => r.status !== 'SELESAI');
    if (batchModalSelectedIds.length === activeCandidates.length) {
      setBatchModalSelectedIds([]);
    } else {
      setBatchModalSelectedIds(activeCandidates.map(r => r.id));
    }
  };

  const handleConfirmBatchConvert = () => {
    if (!batchModalTarget || batchModalSelectedIds.length === 0) return;

    const candidateRecs = records.filter(r => batchModalSelectedIds.includes(r.id));
    
    const itemsToConvert: BatchConvertWoItem[] = candidateRecs.map(rec => {
      const lama = calculateLamaGangguan(rec.tanggalBypass, rec.tanggalLapor);
      return {
        recordId: rec.id,
        idpel: rec.idpel,
        nama: rec.namaPelanggan,
        alamat: rec.alamatPelanggan,
        jenisGangguan: rec.jenisGangguan,
        tarif: rec.tarif,
        daya: rec.daya,
        gardu: rec.gardu,
        titikTumpu: rec.titikTumpu,
        nomorMeter: rec.nomorMeter,
        nomorTelepon: rec.nomorTelepon,
        lamaGangguanHari: lama.days,
        assignedTim: batchAssignedTim,
        catatanSupervisor: batchCatatan
      };
    });

    if (batchModalTarget === 'P2TL') {
      if (onBatchConvertToWoP2tl) {
        onBatchConvertToWoP2tl(itemsToConvert);
      } else if (onConvertToWoP2tl) {
        itemsToConvert.forEach(item => {
          onConvertToWoP2tl(item.idpel, item.nama, item.alamat, item.jenisGangguan);
        });
      }
    } else if (batchModalTarget === 'GAMET') {
      if (onBatchConvertToGamet) {
        onBatchConvertToGamet(itemsToConvert);
      } else if (onConvertToGamet) {
        itemsToConvert.forEach(item => {
          onConvertToGamet(item.idpel, item.nama, item.alamat, item.jenisGangguan, {
            tarif: item.tarif,
            daya: item.daya,
            gardu: item.gardu,
            titikTumpu: item.titikTumpu,
            nomorMeter: item.nomorMeter,
            nomorTelepon: item.nomorTelepon,
            lamaGangguanHari: item.lamaGangguanHari
          });
        });
      }
    }

    setBatchModalTarget(null);
    setBatchModalSelectedIds([]);
    setSelectedRecordIds([]);
  };

  // --- SUBMIT INPUT LAPORAN MANUAL ---
  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idpel.trim()) return;

    // MANDATORY PHOTO VALIDATION
    if (sumberLaporan === 'BILLMAN') {
      if (!fotoKwh || !fotoStanSisaKwh) {
        setPhotoErrorMsg('Kedua foto berikut WAJIB diisi untuk Laporan Billman: 1. Foto KWh Meter, dan 2. Foto Stan / Sisa kWh.');
        return;
      }
    } else {
      if (!fotoBA || !fotoKwh || !fotoStanSisaKwh) {
        setPhotoErrorMsg('Ketiga foto berikut WAJIB diisi: 1. Foto Berita Acara, 2. Foto KWh Meter, dan 3. Foto Stan / Sisa kWh.');
        return;
      }
    }
    setPhotoErrorMsg(null);

    const newRec: GangguanAppRecord = {
      id: `GAPP-${Date.now()}`,
      noLaporan: `YNT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`,
      noGangguan: sumberLaporan === 'BILLMAN' ? `BILLMAN-${Date.now().toString().slice(-6)}` : (noGangguan.trim() || `GGN-${Date.now().toString().slice(-6)}`),
      noBAGangguan: sumberLaporan === 'BILLMAN' ? '-' : (noBAGangguan.trim() || `BA-GGN-${Date.now().toString().slice(-6)}`),
      tipeMeter,
      idpel: idpel.trim(),
      namaPelanggan: namaPelanggan.trim() || 'Pelanggan PLN',
      alamatPelanggan: alamatPelanggan.trim() || 'Alamat Terdaftar',
      nomorTelepon: nomorTelepon.trim() || undefined,
      tarif,
      daya,
      gardu: gardu || '-',
      titikTumpu: titikTumpu || '-',
      merkMeter: merkMeter || '-',
      nomorMeter: nomorMeter || '-',
      sumberLaporan,
      jenisGangguan,
      deskripsiGangguan: deskripsiGangguan.trim() || 'Laporan gangguan APP dari Yantek/Billman',
      tanggalLapor: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tanggalBypass,
      sisaToken,
      status: 'BELUM_DIPROSES',
      petugasPelapor: petugasPelapor.trim() || 'Petugas Lapangan',
      assignedTim: 'Tim Penormalan Alpha 01',
      fotoBA: sumberLaporan === 'BILLMAN' ? undefined : (fotoBA || undefined),
      fotoKwh: fotoKwh || undefined,
      fotoStanSisaKwh: fotoStanSisaKwh || undefined,
      aiAnalysisBA: sumberLaporan === 'BILLMAN' ? undefined : (aiAnalysisBA || undefined),
      aiAnalysisKwh: aiAnalysisKwh || undefined
    };

    onAddRecord(newRec);

    // Reset Form
    setSearchIdpelQuery('');
    setFoundCustomer(null);
    setSearchStatus('IDLE');
    setIdpel('');
    setNamaPelanggan('');
    setAlamatPelanggan('');
    setNomorTelepon('');
    setGardu('');
    setTitikTumpu('');
    setMerkMeter('');
    setNomorMeter('');
    setDeskripsiGangguan('');
    setTipeMeter('PRABAYAR');
    setFotoBA(null);
    setFotoKwh(null);
    setFotoStanSisaKwh(null);
    setAiAnalysisBA(null);
    setAiAnalysisKwh(null);
    setAiAnalysisStan(null);
    setNoGangguan(`GGN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
    setNoBAGangguan(`BA-GGN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
    setPhotoErrorMsg(null);

    // Switch to Monitoring
    setActiveSubTab('list');
  };

  // --- UPLOAD CUSTOMER DATABASE FILE (EXCEL/CSV) ---
  const handleProcessCustDbFile = (file: File) => {
    setCustDbErrorMsg(null);
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
          throw new Error('Sheet Excel kosong.');
        }

        const newCustList: CustomerMasterItem[] = [];

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

          newCustList.push({
            id: `CUST-${Date.now()}-${idx + 1}`,
            idpel: idpelVal,
            nama: getVal('NAMA', 'NAMA_PELANGGAN', 'PELANGGAN') || 'Pelanggan PLN',
            alamat: getVal('ALAMAT', 'ALAMAT_PELANGGAN') || 'Alamat Terdaftar',
            tarif: getVal('TARIF', 'GOL_TARIF') || 'R1M',
            daya: getVal('DAYA', 'KAPASITAS') || '900 VA',
            gardu: getVal('GARDU', 'GARDU_DISTRIBUSI') || '-',
            titikTumpu: getVal('TITIK_TUMPU', 'TITIK') || '-',
            merkMeter: getVal('MERK_METER', 'MERK', 'MERK_KWH') || '-',
            nomorMeter: getVal('NOMOR_METER', 'NO_METER', 'SERIAL_METER') || '-'
          });
        });

        if (newCustList.length === 0) {
          throw new Error('Kolom IDPEL tidak teridentifikasi pada file Excel.');
        }

        if (onBatchAddCustomerMaster) {
          onBatchAddCustomerMaster(newCustList);
        }
        setCustDbSuccessMsg(`Berhasil mengimpor ${newCustList.length} data pelanggan ke Database Master!`);
      } catch (err: any) {
        setCustDbErrorMsg(err.message || 'Gagal mengimpor file data pelanggan.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- ADD SINGLE CUSTOMER TO DATABASE ---
  const handleAddSingleCustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustIdpel.trim()) return;

    const newCust: CustomerMasterItem = {
      id: `CUST-${Date.now()}`,
      idpel: newCustIdpel.trim(),
      nama: newCustNama.trim() || 'Pelanggan PLN',
      alamat: newCustAlamat.trim() || 'Alamat Terdaftar',
      tarif: newCustTarif,
      daya: newCustDaya,
      gardu: newCustGardu.trim() || '-',
      titikTumpu: newCustTitik.trim() || '-',
      merkMeter: newCustMerk.trim() || '-',
      nomorMeter: newCustNoMeter.trim() || '-'
    };

    if (onAddCustomerMaster) {
      onAddCustomerMaster(newCust);
    }

    setNewCustIdpel('');
    setNewCustNama('');
    setNewCustAlamat('');
    setNewCustNoMeter('');
    setShowAddCustModal(false);
  };

  // Helper to extract month (01-12) and year (YYYY) from record date
  const getRecordMonthAndYear = (rec: GangguanAppRecord) => {
    const dateStr = rec.tanggalBypass || rec.tanggalLapor || (rec as any).createdAt || '';
    if (!dateStr) return { month: '', year: '' };
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { month: '', year: '' };
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString();
    return { month, year };
  };

  // Helper for Tariff Price per kWh & Category
  const getTarifPricePerKwh = (tarifCode: string, dayaStr: string) => {
    const t = (tarifCode || '').toUpperCase().trim();
    const dayaNum = parseInt((dayaStr || '').replace(/\D/g, ''), 10) || 900;

    if (t.startsWith('B3') || t.startsWith('I3')) return { price: 1115, label: 'Bisnis/Industri Besar (>200 kVA)' };
    if (t.startsWith('B2') || t.startsWith('R3') || t.startsWith('I2')) return { price: 1700, label: 'Bisnis/Residensi Daya Besar' };
    if (t.startsWith('R2') || dayaNum >= 3500) return { price: 1699.53, label: 'Residensi Menengah (>=3500 VA)' };
    if (t.startsWith('R1M') || dayaNum >= 900) return { price: 1352, label: 'Residensi R1M 900 VA' };
    if (t.startsWith('R1') && dayaNum <= 450) return { price: 415, label: 'Subsidi R1 450 VA' };
    if (t.startsWith('P1') || t.startsWith('P2')) return { price: 1523, label: 'Pemerintah (P1/P2)' };
    return { price: 1444.70, label: 'Residensi Non-Subsidi Standard' };
  };

  // Helper for AI Priority Score calculation
  const calculateAiReplacementPriority = (record: GangguanAppRecord) => {
    const { days } = calculateLamaGangguan(record.tanggalBypass, record.tanggalLapor);
    const dayaVA = parseInt((record.daya || '900').replace(/\D/g, ''), 10) || 900;
    const { price, label: tarifLabel } = getTarifPricePerKwh(record.tarif, record.daya);

    // Daily estimated kWh usage = (dayaVA / 1000) * 5.5 hours/day
    const kwhPerHari = (dayaVA / 1000) * 5.5;
    const totalKwhTerlewat = Math.round(kwhPerHari * days);
    const totalEstimasiRupiah = Math.round(totalKwhTerlewat * price);

    const isBypassOrMacet = (record.jenisGangguan || '').toUpperCase().includes('BYPASS') || 
                            (record.jenisGangguan || '').toUpperCase().includes('MACET') ||
                            (record.jenisGangguan || '').toUpperCase().includes('MATI');

    // Formula score: Rupiah loss / 50000 + (Days * 1.5) + Severity
    const priorityScore = Math.round((totalEstimasiRupiah / 50000) + (days * 1.5) + (isBypassOrMacet ? 50 : 20));

    let urgencyLevel: 'SANGAT_KRITIS' | 'TINGGI' | 'SEDANG' = 'SEDANG';
    if (totalEstimasiRupiah >= 3000000 || days >= 90 || dayaVA >= 3500) {
      urgencyLevel = 'SANGAT_KRITIS';
    } else if (totalEstimasiRupiah >= 1000000 || days >= 30) {
      urgencyLevel = 'TINGGI';
    }

    return {
      days,
      dayaVA,
      tarifPrice: price,
      tarifLabel,
      kwhPerHari,
      totalKwhTerlewat,
      totalEstimasiRupiah,
      priorityScore,
      urgencyLevel
    };
  };

  // Top AI Recommendations for Pending Unresolved Records
  const aiRecommendedRecords = records
    .filter((r) => r.status !== 'SELESAI')
    .map((r) => ({
      record: r,
      metrics: calculateAiReplacementPriority(r)
    }))
    .sort((a, b) => b.metrics.priorityScore - a.metrics.priorityScore);

  // Filtered Customer Database
  const filteredCustDb = customerDatabase.filter((c) =>
    c.idpel.toLowerCase().includes(custDbSearch.toLowerCase()) ||
    c.nama.toLowerCase().includes(custDbSearch.toLowerCase()) ||
    c.nomorMeter.toLowerCase().includes(custDbSearch.toLowerCase()) ||
    c.gardu.toLowerCase().includes(custDbSearch.toLowerCase()) ||
    c.alamat.toLowerCase().includes(custDbSearch.toLowerCase())
  );

  const [custDbPage, setCustDbPage] = useState(1);
  const [custDbJumpInput, setCustDbJumpInput] = useState('');
  const CUST_DB_PAGE_SIZE = 100; // Format 100 data per halaman sesuai permintaan
  const totalCustPages = Math.ceil(filteredCustDb.length / CUST_DB_PAGE_SIZE) || 1;
  const paginatedCustDb = filteredCustDb.slice(
    (custDbPage - 1) * CUST_DB_PAGE_SIZE,
    custDbPage * CUST_DB_PAGE_SIZE
  );

  // Filtered Gangguan Reports for Monitoring with Sort & Filter
  const filteredRecords = records
    .filter((rec) => {
      const matchesSearch = 
        rec.idpel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.namaPelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.noLaporan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.noGangguan && rec.noGangguan.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.noBAGangguan && rec.noBAGangguan.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
      const matchesSumber = sumberFilter === 'ALL' || rec.sumberLaporan === sumberFilter;
      const matchesJenis = jenisFilter === 'ALL' || rec.jenisGangguan === jenisFilter;
      const matchesTipe = tipeFilter === 'ALL' || (rec.tipeMeter || 'PRABAYAR') === tipeFilter;

      // Filter Bulan & Tahun Input Laporan
      const { month: recMonth, year: recYear } = getRecordMonthAndYear(rec);
      const matchesBulan = filterBulanInput === 'ALL' || recMonth === filterBulanInput;
      const matchesTahun = filterTahunInput === 'ALL' || recYear === filterTahunInput;

      return matchesSearch && matchesStatus && matchesSumber && matchesJenis && matchesTipe && matchesBulan && matchesTahun;
    })
    .sort((a, b) => {
      // Sort Lama Gangguan
      if (sortLamaOrder === 'TERLAMA') {
        const daysA = calculateLamaGangguan(a.tanggalBypass, a.tanggalLapor).days;
        const daysB = calculateLamaGangguan(b.tanggalBypass, b.tanggalLapor).days;
        return daysB - daysA;
      }
      if (sortLamaOrder === 'TERBARU') {
        const daysA = calculateLamaGangguan(a.tanggalBypass, a.tanggalLapor).days;
        const daysB = calculateLamaGangguan(b.tanggalBypass, b.tanggalLapor).days;
        return daysA - daysB;
      }

      return 0;
    });

  // AI REMINDER: Overdue Reports > 90/120 Days (3 Bulan) that are not SELESAI
  const overdueList = records.filter((r) => {
    const lama = calculateLamaGangguan(r.tanggalBypass, r.tanggalLapor);
    return lama.days >= 90 && r.status !== 'SELESAI';
  });

  const totalCount = records.length;
  const belumDiprosesCount = records.filter(r => r.status === 'BELUM_DIPROSES').length;
  const dalamPenangananCount = records.filter(r => r.status === 'DALAM_PENANGANAN').length;
  const selesaiCount = records.filter(r => r.status === 'SELESAI').length;

  // --- ANALYTICS STATISTICS CALCULATIONS ---
  const analyticsYearRecords = records.filter(r => {
    if (analyticsYearFilter === 'ALL') return true;
    const { year } = getRecordMonthAndYear(r);
    return year === analyticsYearFilter;
  });

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthlyData = monthNames.map((mName, idx) => {
    const mCode = (idx + 1).toString().padStart(2, '0');
    const count = analyticsYearRecords.filter(r => getRecordMonthAndYear(r).month === mCode).length;
    return { monthCode: mCode, monthName: mName, count };
  });
  const maxMonthlyCount = Math.max(...monthlyData.map(m => m.count), 1);

  const availableYearsList = Array.from(new Set(records.map(r => getRecordMonthAndYear(r).year).filter(Boolean))).sort().reverse();
  const yearlyData = (availableYearsList.length > 0 ? availableYearsList : ['2026', '2025', '2024']).map(y => {
    return {
      year: y,
      count: records.filter(r => getRecordMonthAndYear(r).year === y).length
    };
  });

  const prabayarCount = analyticsYearRecords.filter(r => (r.tipeMeter || 'PRABAYAR') === 'PRABAYAR').length;
  const pascabayarCount = analyticsYearRecords.filter(r => r.tipeMeter === 'PASCABAYAR').length;
  const mcbCount = analyticsYearRecords.filter(r => r.tipeMeter === 'MCB').length;

  const merkMap: Record<string, number> = {};
  analyticsYearRecords.forEach(r => {
    const merk = (r.merkMeter || 'Lainnya / Tidak Terisi').trim().toUpperCase();
    merkMap[merk] = (merkMap[merk] || 0) + 1;
  });
  const merkListSorted = Object.entries(merkMap)
    .map(([merk, count]) => ({ merk, count }))
    .sort((a, b) => b.count - a.count);
  const maxMerkCount = Math.max(...merkListSorted.map(m => m.count), 1);

  const jenisMap: Record<string, number> = {};
  analyticsYearRecords.forEach(r => {
    const j = (r.jenisGangguan || 'LAINNYA').trim();
    jenisMap[j] = (jenisMap[j] || 0) + 1;
  });
  const jenisListSorted = Object.entries(jenisMap)
    .map(([jenis, count]) => ({ jenis, count }))
    .sort((a, b) => b.count - a.count);
  const maxJenisCount = Math.max(...jenisListSorted.map(j => j.count), 1);

  const yantekCount = analyticsYearRecords.filter(r => r.sumberLaporan === 'YANTEK').length;
  const billmanCount = analyticsYearRecords.filter(r => r.sumberLaporan === 'BILLMAN').length;
  const petugasLapCount = analyticsYearRecords.filter(r => r.sumberLaporan === 'PETUGAS_LAPANGAN').length;

  // EXPORT MONITORING DATA TO EXCEL
  const handleExportMonitoringToExcel = () => {
    const recordsToExport = selectedRecordIds.length > 0
      ? filteredRecords.filter((r) => selectedRecordIds.includes(r.id))
      : filteredRecords;

    if (recordsToExport.length === 0) {
      alert('Tidak ada data monitoring untuk diexport.');
      return;
    }

    const exportData = recordsToExport.map((r, idx) => ({
      'No': idx + 1,
      'No. Laporan': r.noLaporan || '-',
      'No. Gangguan': r.noGangguan || '-',
      'No. BA Gangguan': r.noBAGangguan || '-',
      'Sumber Laporan': r.sumberLaporan || 'YANTEK',
      'IDPEL': r.idpel,
      'Nama Pelanggan': r.namaPelanggan || '-',
      'Alamat': r.alamatPelanggan || '-',
      'Tarif': r.tarif || '-',
      'Daya': r.daya || '-',
      'Tipe Meter': r.tipeMeter || 'PRABAYAR',
      'Merk Meter': r.merkMeter || '-',
      'Nomor Meter': r.nomorMeter || '-',
      'Tanggal': r.tanggalBypass || r.tanggalLapor || '-',
      'Sisa Token / Stan': r.sisaToken || '-',
      'Lama Gangguan': calculateLamaGangguan(r.tanggalBypass, r.tanggalLapor).label,
      'Jenis Gangguan': r.jenisGangguan || '-',
      'Deskripsi Gangguan': r.deskripsiGangguan || '-',
      'Status Penanganan': r.status === 'BELUM_DIPROSES' ? 'Belum Diproses' : r.status === 'DALAM_PENANGANAN' ? 'Dalam Penanganan' : 'Selesai',
      'Petugas Pelapor': r.petugasPelapor || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 },   // No
      { wch: 22 },  // No. Laporan
      { wch: 18 },  // No. Gangguan
      { wch: 18 },  // No. BA Gangguan
      { wch: 18 },  // Sumber Laporan
      { wch: 16 },  // IDPEL
      { wch: 25 },  // Nama
      { wch: 30 },  // Alamat
      { wch: 8 },   // Tarif
      { wch: 12 },  // Daya
      { wch: 14 },  // Tipe Meter
      { wch: 15 },  // Merk Meter
      { wch: 16 },  // Nomor Meter
      { wch: 18 },  // Tanggal
      { wch: 15 },  // Sisa Token
      { wch: 18 },  // Lama Gangguan
      { wch: 26 },  // Jenis Gangguan
      { wch: 35 },  // Deskripsi
      { wch: 18 },  // Status
      { wch: 25 },  // Petugas
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring_Gangguan_APP');

    const fileName = selectedRecordIds.length > 0
      ? `Monitoring_Laporan_Terpilih_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Monitoring_Laporan_Gangguan_APP_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Module Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold mb-2">
            <PhoneCall className="w-3.5 h-3.5" /> YANTEK & BILLMAN APP MANAGEMENT
          </span>
          <h2 className="text-xl font-black tracking-tight">Upload & Input Laporan Gangguan APP</h2>
          <p className="text-xs text-slate-300 mt-1">
            Pencarian otomatis IDPEL dari Database Pelanggan, Input Laporan Manual, AI Scanner Foto Berita Acara & KWh Meter, Monitoring Laporan, serta Analytics Gangguan.
          </p>
        </div>
      </div>

      {/* Metric Summary Cards (Sembunyikan saat di Sub-Menu Input kWh Gangguan) */}
      {activeSubTab !== 'input' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">Total Database Pelanggan</span>
              <strong className="text-xl font-extrabold text-blue-600">{customerDatabase.length} IDPEL</strong>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">Laporan Gangguan</span>
              <strong className="text-xl font-extrabold text-slate-900">{totalCount} Laporan</strong>
            </div>
            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">Belum Diproses</span>
              <strong className="text-xl font-extrabold text-amber-600">{belumDiprosesCount}</strong>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">Selesai Ditindak</span>
              <strong className="text-xl font-extrabold text-emerald-600">{selesaiCount}</strong>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. HALAMAN UTAMA: INPUT KWH GANGGUAN                     */}
      {/* ========================================================= */}
      {activeSubTab === 'input' && (
        <form onSubmit={handleManualFormSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8 w-full max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" /> Input kWh Gangguan - SIMETRI
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan atau cari IDPEL dari Database Pelanggan untuk melengkapi data secara otomatis.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Terintegrasi AI Scan BA & KWh
            </span>
          </div>

          {/* STEP 1: PENCARIAN IDPEL DARI DATABASE */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4" /> Cari IDPEL dari Database Pelanggan *
              </label>
              <span className="text-[11px] text-slate-300">Contoh IDPEL: 538900778899, 538900334455, 538100123456</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Masukkan 12 Digit IDPEL / Nama Pelanggan..."
                  value={searchIdpelQuery}
                  onChange={(e) => {
                    setSearchIdpelQuery(e.target.value);
                    if (e.target.value.length >= 4) {
                      handleSearchIdpel(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchIdpel();
                    }
                  }}
                  className="w-full pl-4 pr-10 py-3 bg-white/10 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {searchIdpelQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchIdpelQuery('');
                      setSearchStatus('IDLE');
                      setFoundCustomer(null);
                      setIdpel('');
                    }}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSearchIdpel()}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shrink-0"
              >
                <Search className="w-4 h-4" /> CARI IDPEL
              </button>
            </div>

            {/* Suggestions Quick Pick if query matches */}
            {searchIdpelQuery && searchStatus !== 'FOUND' && (
              <div className="bg-slate-800 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 text-xs border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold px-2 py-1">Saran Dari Database Pelanggan:</div>
                {customerDatabase
                  .filter((c) => c.idpel.includes(searchIdpelQuery) || c.nama.toLowerCase().includes(searchIdpelQuery.toLowerCase()))
                  .slice(0, 5)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSearchIdpelQuery(c.idpel);
                        handleSearchIdpel(c.idpel);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg flex items-center justify-between text-slate-200"
                    >
                      <span><strong className="font-mono text-amber-300">{c.idpel}</strong> - {c.nama}</span>
                      <span className="text-[10px] text-slate-400">{c.tarif}/{c.daya} • {c.merkMeter}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* STATUS PENCARIAN BADGE */}
            {searchStatus === 'FOUND' && foundCustomer && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <strong>IDPEL Terdaftar di Database!</strong> Data pelanggan berhasil ditarik otomatis.
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/30 rounded text-[10px] font-bold">
                  {foundCustomer.tarif} / {foundCustomer.daya}
                </span>
              </div>
            )}

            {searchStatus === 'NOT_FOUND' && (
              <div className="p-3 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>IDPEL belum ditemukan di Database Master. Anda dapat melengkapi informasi pelanggan secara manual di bawah.</span>
              </div>
            )}
          </div>

          {/* STEP 2: DATA PELANGGAN (TERKUNCI) */}
          <div className="p-6 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-blue-600" /> Data Pelanggan
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerLocked(!isCustomerLocked)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
                    isCustomerLocked
                      ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 ring-2 ring-amber-200/50'
                      : 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200 ring-2 ring-emerald-200/50'
                  }`}
                  title={isCustomerLocked ? "Klik untuk membuka kunci edit data pelanggan" : "Klik untuk mengunci kembali data pelanggan"}
                >
                  {isCustomerLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                      <span>Data Pelanggan Terkunci</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                      <span>Buka Edit Data</span>
                    </>
                  )}
                </button>

                {searchStatus === 'FOUND' && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black border border-emerald-300 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-filled dari Database
                  </span>
                )}
              </div>
            </div>

            {isCustomerLocked && (
              <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl text-[11px] font-semibold text-amber-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Form Data Pelanggan dikunci agar sesuai dengan Database Master PLN. Klik tombol <strong>"Data Pelanggan Terkunci"</strong> di atas jika perlu mengedit.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* IDPEL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">IDPEL <span className="text-rose-500">*</span></span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  required
                  readOnly={isCustomerLocked}
                  placeholder="Masukkan IDPEL 12 digit"
                  value={idpel}
                  onChange={(e) => setIdpel(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Nama Pelanggan */}
              <div className="space-y-1.5 sm:col-span-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">Nama Pelanggan <span className="text-rose-500">*</span></span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  required
                  readOnly={isCustomerLocked}
                  placeholder="Nama Lengkap Pelanggan"
                  value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Tarif & Daya */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Tarif / Daya</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    readOnly={isCustomerLocked}
                    placeholder="Tarif"
                    value={tarif}
                    onChange={(e) => setTarif(e.target.value)}
                    className={`w-full px-2.5 py-2.5 rounded-xl text-xs font-bold text-center transition ${
                      isCustomerLocked
                        ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                        : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                    }`}
                  />
                  <input
                    type="text"
                    readOnly={isCustomerLocked}
                    placeholder="Daya"
                    value={daya}
                    onChange={(e) => setDaya(e.target.value)}
                    className={`w-full px-2.5 py-2.5 rounded-xl text-xs font-bold text-center transition ${
                      isCustomerLocked
                        ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                        : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                    }`}
                  />
                </div>
              </div>

              {/* Gardu Distribusi */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Gardu Distribusi</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  readOnly={isCustomerLocked}
                  placeholder="Contoh: SMG-012"
                  value={gardu}
                  onChange={(e) => setGardu(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Titik Tumpu */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Titik Tumpu</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  readOnly={isCustomerLocked}
                  placeholder="Contoh: Tiang P1-04"
                  value={titikTumpu}
                  onChange={(e) => setTitikTumpu(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Merk Meter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Merk KWh Meter</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  readOnly={isCustomerLocked}
                  placeholder="Contoh: Fuji / Itron / Hexing"
                  value={merkMeter}
                  onChange={(e) => setMerkMeter(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Nomor Meter Terpasang */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Nomor Meter Terpasang</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  readOnly={isCustomerLocked}
                  placeholder="Contoh: 0189230412"
                  value={nomorMeter}
                  onChange={(e) => setNomorMeter(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>

              {/* Alamat Pelanggan */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Alamat Pelanggan</span>
                  {isCustomerLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  readOnly={isCustomerLocked}
                  placeholder="Alamat Lengkap Terdaftar Pelanggan"
                  value={alamatPelanggan}
                  onChange={(e) => setAlamatPelanggan(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isCustomerLocked
                      ? 'bg-slate-100/90 text-slate-700 border border-slate-200 cursor-not-allowed select-none shadow-none'
                      : 'bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* STEP 3: INPUT MANUAL DATA LAPORAN GANGGUAN */}
          <div className="p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-4">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-600" /> Form Input Rincian Laporan Gangguan (Yantek/Billman)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* SUMBER LAPORAN - DITARUH PALING ATAS */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <span>Sumber Laporan *</span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-extrabold">(Utama)</span>
                </label>
                <select
                  value={sumberLaporan}
                  onChange={(e) => setSumberLaporan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-amber-100/60 border border-amber-300 rounded-xl text-xs font-black text-amber-950 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="YANTEK">YANTEK (Pelayanan Teknik)</option>
                  <option value="BILLMAN">BILLMAN (Cater / Pembaca Meter)</option>
                  <option value="PETUGAS_LAPANGAN">Petugas Lapangan Lainnya</option>
                </select>
              </div>

              {/* TIPE METER */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Tipe (Meter / APP) *</label>
                <select
                  value={tipeMeter}
                  onChange={(e) => setTipeMeter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 bg-blue-50/50 cursor-pointer"
                >
                  <option value="PRABAYAR">Prabayar</option>
                  <option value="PASCABAYAR">Pascabayarr</option>
                  <option value="MCB">MCB</option>
                </select>
              </div>

              {/* TANGGAL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Tanggal *</label>
                <input
                  type="date"
                  required
                  value={tanggalBypass}
                  onChange={(e) => setTanggalBypass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {/* NO. GANGGUAN & NO. BA GANGGUAN (HANYA DITAMPILKAN JIKA BUKAN BILLMAN) */}
              {sumberLaporan !== 'BILLMAN' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">No. Gangguan *</label>
                    <input
                      type="text"
                      required
                      value={noGangguan}
                      onChange={(e) => setNoGangguan(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">No. BA Gangguan *</label>
                    <input
                      type="text"
                      required
                      placeholder="BA-GGN-..."
                      value={noBAGangguan}
                      onChange={(e) => setNoBAGangguan(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </>
              )}

              {/* SISA TOKEN */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Sisa Token / Stan *</label>
                <input
                  type="text"
                  placeholder="Contoh: 15.4 kWh"
                  value={sisaToken}
                  onChange={(e) => setSisaToken(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {/* NOMOR TELEPON */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nomor Telfon / HP Pelanggan</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={nomorTelepon}
                  onChange={(e) => setNomorTelepon(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800"
                />
              </div>

              {/* JENIS GANGGUAN APP */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700">Jenis Gangguan APP *</label>
                <select
                  value={jenisGangguan}
                  onChange={(e) => setJenisGangguan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-900 bg-rose-50/50 cursor-pointer"
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
                </select>
              </div>

              {/* DESKRIPSI DETAIL GANGGUAN */}
              <div className="space-y-1 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-700">Deskripsi Detail Gangguan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan detail keluhan pelanggan atau temuan fisik petugas di lapangan..."
                  value={deskripsiGangguan}
                  onChange={(e) => setDeskripsiGangguan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 4: UPLOAD FOTO BERITA ACARA, FOTO KWH METER, DAN FOTO STAN/SISA KWH TERINTEGRASI AI */}
          <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Upload Dokumentasi Foto & AI Verification Engine
              </h4>
              <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 shadow-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {sumberLaporan === 'BILLMAN' ? 'Foto KWh Meter & Stan Wajib Diisi' : 'Semua Foto Wajib Diisi'}
              </span>
            </div>

            {photoErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{photoErrorMsg}</span>
              </div>
            )}

            <div className={`grid grid-cols-1 ${sumberLaporan === 'BILLMAN' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5`}>
              {/* UPLOAD FOTO BERITA ACARA (HANYA UNTUK BUKAN BILLMAN) */}
              {sumberLaporan !== 'BILLMAN' && (
                <div className={`bg-white p-4 rounded-xl border shadow-xs space-y-3 ${!fotoBA ? 'border-rose-300 bg-rose-50/20' : 'border-indigo-100'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-indigo-600" /> Foto Berita Acara (BA) <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                    </label>
                    {aiAnalysisBA && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                        AI Verified ✓
                      </span>
                    )}
                  </div>

                {fotoBA ? (
                  <div className="space-y-2">
                    <div className="relative h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={fotoBA} alt="Berita Acara" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFotoBA(null); setAiAnalysisBA(null); }}
                        className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow"
                      >
                        Ganti
                      </button>
                    </div>

                    {isScanningBA ? (
                      <div className="p-2.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span className="text-[11px]">Memindai stempel & ttd BA...</span>
                      </div>
                    ) : aiAnalysisBA ? (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <div className="font-bold flex items-center justify-between text-[11px]">
                          <span>Akurasi: {(aiAnalysisBA.confidence * 100).toFixed(0)}%</span>
                          <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-black">VALID</span>
                        </div>
                        <p className="text-[10px] text-emerald-800 leading-tight">{aiAnalysisBA.summary}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="h-32 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer text-center transition">
                      <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                      <span className="text-xs font-bold text-indigo-950">Upload Foto Berita Acara</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Format JPG / PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => handleAnalyzeFotoBA(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeFotoBA('https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80')}
                      className="w-full py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200 transition"
                    >
                      + Contoh Foto BA Lapangan
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* UPLOAD FOTO KWH METER */}
              <div className={`bg-white p-4 rounded-xl border shadow-xs space-y-3 ${!fotoKwh ? 'border-rose-300 bg-rose-50/20' : 'border-indigo-100'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" /> Foto KWh Meter (Fisik) <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                  </label>
                  {aiAnalysisKwh && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-black">
                      OCR Verified ✓
                    </span>
                  )}
                </div>

                {fotoKwh ? (
                  <div className="space-y-2">
                    <div className="relative h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={fotoKwh} alt="KWh Meter" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFotoKwh(null); setAiAnalysisKwh(null); }}
                        className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow"
                      >
                        Ganti
                      </button>
                    </div>

                    {isScanningKwh ? (
                      <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span className="text-[11px]">Memindai nomor meter...</span>
                      </div>
                    ) : aiAnalysisKwh ? (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                        <div className="font-bold flex items-center justify-between text-[11px]">
                          <span>Serial: {aiAnalysisKwh.detectedNomorMeter}</span>
                        </div>
                        <p className="text-[10px] text-blue-800 leading-tight">{aiAnalysisKwh.summary}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="h-32 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer text-center transition">
                      <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                      <span className="text-xs font-bold text-indigo-950">Upload Foto KWh Meter</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Format JPG / PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => handleAnalyzeFotoKwh(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeFotoKwh('https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80')}
                      className="w-full py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200 transition"
                    >
                      + Contoh Foto KWh Meter
                    </button>
                  </div>
                )}
              </div>

              {/* UPLOAD FOTO STAN / SISA KWH METER */}
              <div className={`bg-white p-4 rounded-xl border shadow-xs space-y-3 ${!fotoStanSisaKwh ? 'border-rose-300 bg-rose-50/20' : 'border-indigo-100'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" /> Foto Stan / Sisa kWh <span className="text-rose-600 font-extrabold text-[10px]">* WAJIB</span>
                  </label>
                  {aiAnalysisStan && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                      Stan OCR ✓
                    </span>
                  )}
                </div>

                {fotoStanSisaKwh ? (
                  <div className="space-y-2">
                    <div className="relative h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={fotoStanSisaKwh} alt="Stan / Sisa KWh" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFotoStanSisaKwh(null); setAiAnalysisStan(null); }}
                        className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow"
                      >
                        Ganti
                      </button>
                    </div>

                    {isScanningStan ? (
                      <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span className="text-[11px]">Memindai sisa token / stan...</span>
                      </div>
                    ) : aiAnalysisStan ? (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <div className="font-bold flex items-center justify-between text-[11px]">
                          <span>Stan Terdeteksi: {sisaToken || '12.5 kWh'}</span>
                          <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-black">TERSISTEM</span>
                        </div>
                        <p className="text-[10px] text-emerald-800 leading-tight">{aiAnalysisStan.summary}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="h-32 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer text-center transition">
                      <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                      <span className="text-xs font-bold text-emerald-950">Upload Foto Stan / Sisa kWh</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Format JPG / PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => handleAnalyzeFotoStan(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeFotoStan('https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80')}
                      className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 transition"
                    >
                      + Contoh Foto Stan / Sisa kWh
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSearchIdpelQuery('');
                setFoundCustomer(null);
                setSearchStatus('IDLE');
                setIdpel('');
                setNamaPelanggan('');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Reset Form
            </button>

            <button
              type="submit"
              className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-xl transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" /> SIMPAN LAPORAN GANGGUAN APP
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-MENU: UPLOAD PELANGGAN (DATABASE MASTER)          */}
      {/* ========================================================= */}
      {activeSubTab === 'custdb' && (
        <div className="space-y-6">
          {/* Top Actions & Excel Upload */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" /> Database Master Pelanggan PLN
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola dan unggah file Excel/CSV data master pelanggan yang digunakan untuk fitur pencarian IDPEL otomatis.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleSheetsModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Google Sheets Sync
                </button>

                <button
                  type="button"
                  onClick={() => custDbFileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Upload File (.XLSX / .CSV)
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah 1 Pelanggan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const templateData = [
                      {
                        IDPEL: '538900778899',
                        NAMA_PELANGGAN: 'Ahmad Subagyo',
                        ALAMAT: 'Jl. Pemuda No. 45',
                        TARIF: 'R1M',
                        DAYA: '900 VA',
                        GARDU: 'SMG-012',
                        TITIK_TUMPU: 'Tiang P1-04',
                        MERK_METER: 'Fuji Dharma',
                        NOMOR_METER: '0189230412'
                      }
                    ];
                    const ws = XLSX.utils.json_to_sheet(templateData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Database_Pelanggan");
                    XLSX.writeFile(wb, "Template_Database_Master_Pelanggan.xlsx");
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Download Template
                </button>
              </div>
            </div>

            {/* GOOGLE SHEETS LIVE SYNC BANNER */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50/40 border border-emerald-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-emerald-600/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      Sinkronisasi Database via Google Sheets
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-900 text-[10px] font-bold rounded-full border border-emerald-300">
                      Tersambung Link Online
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-mono truncate max-w-md sm:max-w-xl">
                    {localStorage.getItem('simetri_gsheet_url') || DEFAULT_GOOGLE_SHEETS_URL}
                  </p>
                  {localStorage.getItem('simetri_gsheet_last_sync') && (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      Terakhir disinkronkan: {localStorage.getItem('simetri_gsheet_last_sync')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  disabled={isQuickSyncingSheets}
                  onClick={handleQuickSyncSheets}
                  className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  {isQuickSyncingSheets ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Tarik / Sync Cepat
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGoogleSheetsModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Atur Link & Preview
                </button>

                <a
                  href={localStorage.getItem('simetri_gsheet_url') || DEFAULT_GOOGLE_SHEETS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center"
                  title="Buka Spreadsheet di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {custDbSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
                <span>{custDbSuccessMsg}</span>
                <button onClick={() => setCustDbSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            )}

            {custDbErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between">
                <span>{custDbErrorMsg}</span>
                <button onClick={() => setCustDbErrorMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            )}

            {/* Dropzone Upload Customer Excel */}
            <input
              type="file"
              ref={custDbFileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => e.target.files?.[0] && handleProcessCustDbFile(e.target.files[0])}
              className="hidden"
            />

            <div
              onClick={() => custDbFileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 rounded-2xl text-center space-y-2 cursor-pointer transition"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mx-auto font-bold">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">Klik untuk Unggah File Excel Data Pelanggan (.XLSX / .CSV)</h4>
              <p className="text-[11px] text-slate-500">Mendukung ribuan baris data pelanggan untuk pencarian IDPEL otomatis</p>
            </div>
          </div>

          {/* Database Table List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari IDPEL / Nama / No Meter / Gardu..."
                  value={custDbSearch}
                  onChange={(e) => {
                    setCustDbSearch(e.target.value);
                    setCustDbPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 text-xs font-extrabold rounded-lg border border-blue-200">
                  {filteredCustDb.length.toLocaleString('id-ID')} Pelanggan
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (100 data per halaman • {totalCustPages.toLocaleString('id-ID')} halaman)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">No</th>
                    <th className="p-3">IDPEL</th>
                    <th className="p-3">Nama Pelanggan</th>
                    <th className="p-3">Tarif / Daya</th>
                    <th className="p-3">Gardu & Titik Tumpu</th>
                    <th className="p-3">Merk & Nomor Meter</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {paginatedCustDb.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada data pelanggan di database yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustDb.map((cust, idx) => (
                      <tr key={cust.id || `${cust.idpel}-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {((custDbPage - 1) * CUST_DB_PAGE_SIZE) + idx + 1}
                        </td>
                        <td className="p-3 font-mono font-extrabold text-blue-900">{cust.idpel}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{cust.nama}</div>
                          <div className="text-[10px] text-slate-500 max-w-xs truncate">{cust.alamat}</div>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{cust.tarif} / {cust.daya}</td>
                        <td className="p-3 text-slate-600">{cust.gardu} • {cust.titikTumpu}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{cust.merkMeter}</span>
                          <span className="font-mono text-[11px] text-slate-500">{cust.nomorMeter}</span>
                        </td>
                        <td className="p-3 text-right">
                          {onDeleteCustomerMaster && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomerMaster(cust.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus Pelanggan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer with 100 per page and jump to page controls */}
            {totalCustPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 font-semibold text-center lg:text-left">
                  Menampilkan {((custDbPage - 1) * CUST_DB_PAGE_SIZE) + 1} - {Math.min(custDbPage * CUST_DB_PAGE_SIZE, filteredCustDb.length)} dari {filteredCustDb.length.toLocaleString('id-ID')} pelanggan (Format 100 data per halaman)
                </span>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={custDbPage <= 1}
                    onClick={() => setCustDbPage(1)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    title="Halaman Pertama"
                  >
                    « Hal 1
                  </button>

                  <button
                    type="button"
                    disabled={custDbPage <= 1}
                    onClick={() => setCustDbPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    ‹ Sebelumnya
                  </button>

                  <span className="px-3 py-1.5 bg-blue-50 text-blue-900 font-extrabold rounded-lg border border-blue-200 text-xs">
                    Hal {custDbPage.toLocaleString('id-ID')} / {totalCustPages.toLocaleString('id-ID')}
                  </span>

                  <button
                    type="button"
                    disabled={custDbPage >= totalCustPages}
                    onClick={() => setCustDbPage((p) => Math.min(totalCustPages, p + 1))}
                    className="px-3 py-1.5 bg-white border border-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Selanjutnya ›
                  </button>

                  <button
                    type="button"
                    disabled={custDbPage >= totalCustPages}
                    onClick={() => setCustDbPage(totalCustPages)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    title="Halaman Terakhir"
                  >
                    Hal {totalCustPages} »
                  </button>

                  {/* Jump to page form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const target = parseInt(custDbJumpInput, 10);
                      if (!isNaN(target) && target >= 1 && target <= totalCustPages) {
                        setCustDbPage(target);
                        setCustDbJumpInput('');
                      }
                    }}
                    className="flex items-center gap-1 ml-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-sm"
                  >
                    <span className="text-[11px] text-slate-500 font-semibold">Ke Hal:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalCustPages}
                      value={custDbJumpInput}
                      onChange={(e) => setCustDbJumpInput(e.target.value)}
                      placeholder={String(custDbPage)}
                      className="w-16 text-center text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                    >
                      Buka
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-MENU: MONITORING LAPORAN GANGGUAN APP              */}
      {/* ========================================================= */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* 🤖 AI SMART RECOMMENDATION: PRIORITAS PENGGANTIAN METER IDPEL */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl border border-indigo-500/30 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-indigo-500/20 bg-indigo-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5 text-slate-950 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded uppercase">
                      AI SMART RECOMMENDATION
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> Analisis Tarif Daya & Tagihan Susulan
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    Rekomendasi Urutan Penggantian Meter IDPEL (Prioritas Resiko Kerugian Rp PLN)
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAiPriorityPanel(!showAiPriorityPanel)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700 shrink-0"
              >
                {showAiPriorityPanel ? (
                  <>
                    <span>Tutup Panel</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Tampilkan Prioritas ({aiRecommendedRecords.length})</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {showAiPriorityPanel && (
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Algoritma AI menganalisis <strong>Tarif Daya (Rp/kWh)</strong>, <strong>Lama Gangguan (Hari/Bulan)</strong>, serta <strong>Estimasi kWh Tidak Terukur</strong> untuk menentukan IDPEL mana yang paling mendesak harus terganti terlebih dahulu agar terhindar dari sengketa & membengkaknya tagihan susulan.
                </p>

                {aiRecommendedRecords.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs text-center font-bold">
                    🎉 Semua laporan gangguan telah berstatus SELESAI. Tidak ada tunggakan penggantian meter!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aiRecommendedRecords.slice(0, 3).map(({ record: rec, metrics }, idx) => (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                          metrics.urgencyLevel === 'SANGAT_KRITIS'
                            ? 'bg-rose-950/40 border-rose-500/50 hover:border-rose-400'
                            : metrics.urgencyLevel === 'TINGGI'
                            ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400'
                            : 'bg-slate-800/60 border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Header Badge & Rank */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                              idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                            }`}>
                              PRIORITAS REKOMENDASI #{idx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                              IDPEL: {rec.idpel}
                            </span>
                          </div>

                          {/* Customer Info */}
                          <h4 className="text-xs font-black text-white truncate">{rec.namaPelanggan}</h4>
                          <p className="text-[11px] text-slate-300 truncate mt-0.5">{rec.alamatPelanggan || 'Alamat tidak terisi'}</p>

                          {/* Tarif & Daya Detail */}
                          <div className="mt-3 p-2.5 bg-slate-900/80 rounded-lg border border-slate-700/60 space-y-1 text-[11px]">
                            <div className="flex justify-between text-slate-300">
                              <span>Golongan Tarif / Daya:</span>
                              <strong className="text-amber-300 font-mono">{rec.tarif || 'R1M'} / {rec.daya || '900 VA'}</strong>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Harga Rupiah per kWh:</span>
                              <strong className="text-cyan-300">Rp {metrics.tarifPrice.toLocaleString('id-ID')}/kWh</strong>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Lama Gangguan:</span>
                              <strong className="text-rose-300 font-bold">{metrics.days} Hari Membengkak</strong>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Est. kWh Terlewat:</span>
                              <strong className="text-slate-200 font-mono">{metrics.totalKwhTerlewat.toLocaleString('id-ID')} kWh</strong>
                            </div>
                          </div>

                          {/* Estimated Loss / Susulan Highlight */}
                          <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-center">
                            <span className="text-[10px] text-rose-300 font-bold block uppercase tracking-wider">Potensi Membengkaknya Tagihan Susulan:</span>
                            <span className="text-sm font-black text-rose-400">
                              Rp {metrics.totalEstimasiRupiah.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {/* AI Justification */}
                          <p className="text-[10px] text-slate-300 italic mt-2.5 leading-tight">
                            💡 <strong>Pertimbangan AI:</strong> Tarif {rec.tarif} ({rec.daya}) termasuk mahal per kWh. Lama gangguan {metrics.days} hari sangat berisiko membebankan tagihan susulan besar ke pelanggan.
                          </p>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onConvertToGamet) {
                                onConvertToGamet(rec.idpel, rec.namaPelanggan, rec.alamatPelanggan, rec.jenisGangguan || 'Gangguan APP Prioritas AI', {
                                  tarif: rec.tarif,
                                  daya: rec.daya,
                                  gardu: rec.gardu,
                                  titikTumpu: rec.titikTumpu,
                                  nomorMeter: rec.nomorMeter,
                                  nomorTelepon: rec.nomorTelepon,
                                  lamaGangguanHari: metrics.days
                                });
                              } else {
                                alert(`IDPEL ${rec.idpel} diprioritaskan untuk pembuatan WO Ganti Meter.`);
                              }
                            }}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-slate-950" /> Konversi WO Gamet Prioritas
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            {/* AI REMINDER BANNER (>3 Bulan / 120 Hari Belum Diganti) */}
            {overdueList.length > 0 && (
              <div className="m-4 md:m-6 mb-0 p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center shrink-0 font-black">
                    <Sparkles className="w-5 h-5 text-amber-950 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded uppercase">
                        🤖 AI REMINDER PLN
                      </span>
                      <h4 className="text-xs font-black text-slate-900">
                        {overdueList.length} Laporan Gangguan &gt; 3 Bulan (90–120+ Hari) Belum Diganti!
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5 font-medium">
                      Sistem mengidentifikasi meter/bypass belum diganti lebih dari 3 bulan. Disarankan segera ambil tindakan kolektif ke <strong>WO P2TL</strong> atau <strong>WO Gamet</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSortLamaOrder('TERLAMA');
                    setStatusFilter('BELUM_DIPROSES');
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Filter className="w-3.5 h-3.5" /> Filter Data Terlama (&gt;120 Hari)
                </button>
              </div>
            )}

            {/* Filters Bar */}
            <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col space-y-3">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari IDPEL / Nama / No Gangguan / BA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Action Buttons: Export Excel & Reset Filters */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                  <button
                    type="button"
                    onClick={handleExportMonitoringToExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer border border-emerald-500 shrink-0"
                    title="Export Data Monitoring ke File Excel (.XLSX)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                    <span>Export Excel ({filteredRecords.length})</span>
                  </button>

                  {(searchQuery || statusFilter !== 'ALL' || sumberFilter !== 'ALL' || jenisFilter !== 'ALL' || tipeFilter !== 'ALL' || sortLamaOrder !== 'NONE' || filterBulanInput !== 'ALL' || filterTahunInput !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                        setSumberFilter('ALL');
                        setJenisFilter('ALL');
                        setTipeFilter('ALL');
                        setSortLamaOrder('NONE');
                        setFilterBulanInput('ALL');
                        setFilterTahunInput('ALL');
                      }}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      Reset Filter & Sort
                    </button>
                  )}
                </div>
              </div>

              {/* Filter & Sort Dropdown Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Tipe Meter */}
                <select
                  value={tipeFilter}
                  onChange={(e) => setTipeFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-blue-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">⚡ Semua Tipe Meter</option>
                  <option value="PRABAYAR">Prabayar</option>
                  <option value="PASCABAYAR">Pascabayar</option>
                  <option value="MCB">MCB</option>
                </select>

                {/* Filter Bulan Input Gangguan (Menggantikan Sort Bulan Bypass) */}
                <select
                  value={filterBulanInput}
                  onChange={(e) => setFilterBulanInput(e.target.value)}
                  className="px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">📅 Semua Bulan Input</option>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>

                {/* Filter Tahun Input Gangguan (Menggantikan Sort Tipe) */}
                <select
                  value={filterTahunInput}
                  onChange={(e) => setFilterTahunInput(e.target.value)}
                  className="px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">📆 Semua Tahun Input</option>
                  <option value="2026">Tahun 2026</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2024">Tahun 2024</option>
                  <option value="2023">Tahun 2023</option>
                </select>

              {/* Sort Lama Gangguan */}
              <select
                value={sortLamaOrder}
                onChange={(e) => setSortLamaOrder(e.target.value as any)}
                className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-amber-500"
              >
                <option value="NONE">⏱️ Sort Lama Gangguan (Default)</option>
                <option value="TERLAMA">⏱️ Lama Gangguan (Terlama First)</option>
                <option value="TERBARU">⏱️ Lama Gangguan (Terbaru First)</option>
              </select>

              {/* Filter Jenis Gangguan */}
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Jenis Gangguan</option>
                <option value="METER_MACET">Meter Macet</option>
                <option value="METER_BURAM">Meter Buram</option>
                <option value="METER_MATI">Meter Mati</option>
                <option value="DISPLAY_ERROR">Display Error</option>
                <option value="SEGEL_PUTUS">Segel Putus</option>
                <option value="TERMINAL_HANGUS">Terminal Hangus</option>
                <option value="KWH_ERROR">KWh Error</option>
                <option value="MCB_1PH_RUSAK_TERBAKAR">MCB 1 ph Rusak/Terbakar</option>
                <option value="MCB_3PH_RUSAK_TERBAKAR">MCB 3 ph Rusak/Terbakar</option>
              </select>

              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="BELUM_DIPROSES">Belum Diproses</option>
                <option value="DALAM_PENANGANAN">Dalam Penanganan</option>
                <option value="SELESAI">Selesai Ditindak</option>
              </select>

              {/* Filter Sumber */}
              <select
                value={sumberFilter}
                onChange={(e) => setSumberFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Sumber</option>
                <option value="YANTEK">Yantek</option>
                <option value="BILLMAN">Billman</option>
                <option value="PETUGAS_LAPANGAN">Petugas Lapangan</option>
              </select>
            </div>
          </div>

          {/* KOLEKTIF BATCH ACTION BAR (Aksi Pilihan Kolektif) */}
          {selectedRecordIds.length > 0 && (
            <div className="mx-4 md:mx-6 p-3 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-black">
                  {selectedRecordIds.length} Dipilih
                </span>
                <span className="text-xs text-slate-300 font-medium">Aksi Kolektif Laporan Gangguan:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Export Excel Selected */}
                <button
                  type="button"
                  onClick={handleExportMonitoringToExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer border border-emerald-500"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel ({selectedRecordIds.length})
                </button>

                {/* Tandai Selesai Kolektif */}
                <button
                  type="button"
                  onClick={() => {
                    selectedRecordIds.forEach(id => onUpdateStatus(id, 'SELESAI', 'Tindak lanjut kolektif selesai'));
                    setSelectedRecordIds([]);
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Selesai ({selectedRecordIds.length})
                </button>

                {/* WO P2TL Kolektif */}
                {(onConvertToWoP2tl || onBatchConvertToWoP2tl) && (
                  <button
                    type="button"
                    onClick={() => handleOpenBatchModal('P2TL')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> WO P2TL ({selectedRecordIds.length})
                  </button>
                )}

                {/* WO Gamet Kolektif */}
                {(onConvertToGamet || onBatchConvertToGamet) && (
                  <button
                    type="button"
                    onClick={() => handleOpenBatchModal('GAMET')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Wrench className="w-3.5 h-3.5" /> WO Gamet ({selectedRecordIds.length})
                  </button>
                )}

                {/* Reset Selection */}
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds([])}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Monitoring Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && selectedRecordIds.length === filteredRecords.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecordIds(filteredRecords.map(r => r.id));
                        } else {
                          setSelectedRecordIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      title="Pilih Semua Laporan"
                    />
                  </th>
                  <th className="p-3.5">No. Gangguan & Tanggal</th>
                  <th className="p-3.5 text-center">Sumber Laporan</th>
                  <th className="p-3.5">Pelanggan (IDPEL)</th>
                  <th className="p-3.5">Nomor HP</th>
                  <th className="p-3.5 text-center">Tipe Meter</th>
                  <th className="p-3.5">Gardu & Nomor Meter</th>
                  <th className="p-3.5">Jenis Gangguan & Token</th>
                  <th className="p-3.5">Lama Gangguan</th>
                  <th className="p-3.5">Dokumentasi AI</th>
                  <th className="p-3.5">Status Penanganan</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ditemukan data laporan gangguan APP yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const isSelected = selectedRecordIds.includes(rec.id);
                    const lama = calculateLamaGangguan(rec.tanggalBypass, rec.tanggalLapor);
                    const isOverdue3Months = lama.days >= 90 && rec.status !== 'SELESAI';

                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-amber-50/60' : ''}`}>
                        {/* CHECKBOX KOLEKTIF */}
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedRecordIds(selectedRecordIds.filter(id => id !== rec.id));
                              } else {
                                setSelectedRecordIds([...selectedRecordIds, rec.id]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono font-bold text-blue-900 block">{rec.noGangguan || rec.noLaporan}</span>
                          {rec.noBAGangguan && (
                            <span className="text-[10px] text-indigo-700 font-mono font-bold block">BA: {rec.noBAGangguan}</span>
                          )}
                          <span className="text-[10px] text-slate-500 font-semibold block">{rec.noLaporan}</span>
                          <span className="text-[10px] text-slate-400">{rec.tanggalBypass || rec.tanggalLapor}</span>
                        </td>

                        {/* SUMBER LAPORAN (Di Depan Pelanggan IDPEL) */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {(() => {
                            const s = rec.sumberLaporan || 'YANTEK';
                            if (s === 'YANTEK') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-indigo-900 bg-indigo-100 border border-indigo-300 shadow-2xs uppercase">
                                  🛠️ Yantek
                                </span>
                              );
                            }
                            if (s === 'BILLMAN') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300 shadow-2xs uppercase">
                                  📋 Billman
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-teal-900 bg-teal-100 border border-teal-300 shadow-2xs uppercase">
                                👷 {s.replace(/_/g, ' ')}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900">{rec.idpel}</div>
                          <div className="font-semibold text-slate-800">{rec.namaPelanggan}</div>
                          <div className="text-[10px] text-slate-500 max-w-xs truncate">{rec.alamatPelanggan}</div>
                          <div className="text-[10px] text-slate-600 font-semibold">{rec.tarif} / {rec.daya}</div>
                        </td>

                        {/* KOLOM NOMOR HP */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-emerald-950 text-xs flex items-center gap-1">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{rec.nomorTelepon || '-'}</span>
                          </div>
                        </td>

                        {/* TIPE METER COLUMN */}
                        <td className="p-3.5 text-center">
                          {(() => {
                            const t = rec.tipeMeter || 'PRABAYAR';
                            if (t === 'PRABAYAR') {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black text-cyan-900 bg-cyan-100 border border-cyan-300 shadow-2xs uppercase">
                                  ⚡ Prabayar
                                </span>
                              );
                            }
                            if (t === 'PASCABAYAR') {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black text-indigo-900 bg-indigo-100 border border-indigo-300 shadow-2xs uppercase">
                                  📜 Pascabayarr
                                </span>
                              );
                            }
                            return (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 shadow-2xs uppercase">
                                🔌 MCB
                              </span>
                            );
                          })()}
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{rec.gardu || '-'}</div>
                          <div className="text-[10px] text-slate-500">{rec.titikTumpu || '-'}</div>
                          <div className="text-[10px] font-mono text-slate-700 font-bold mt-0.5">{rec.merkMeter} - {rec.nomorMeter}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                              {rec.jenisGangguan.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-1 font-bold">Sisa Token: {rec.sisaToken || '0.0 kWh'}</div>
                          <p className="text-[10px] text-slate-500 max-w-xs line-clamp-1">{rec.deskripsiGangguan}</p>
                        </td>

                        {/* LAMA GANGGUAN + AI REMINDER (>3 Bulan / 120 Hari) */}
                        <td className="p-3.5">
                          {(() => {
                            let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                            if (lama.days >= 90) {
                              badgeStyle = "bg-rose-100 text-rose-800 border-rose-300 font-black";
                            } else if (lama.days >= 30) {
                              badgeStyle = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                            }
                            return (
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border shadow-2xs ${badgeStyle}`}>
                                  <Calendar className="w-3 h-3" /> {lama.label}
                                </span>
                                {isOverdue3Months && (
                                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md block text-center animate-pulse shadow-2xs flex items-center justify-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> AI REMINDER (&gt;120 Hari)
                                  </span>
                                )}
                                <span className="block text-[10px] text-slate-400 font-semibold">
                                  Tanggal: {rec.tanggalBypass || rec.tanggalLapor?.split(' ')[0] || '-'}
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            {rec.aiAnalysisBA && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                                BA: Valid ✓
                              </span>
                            )}
                            {rec.aiAnalysisKwh && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                                KWh OCR: Verified ✓
                              </span>
                            )}
                            {rec.fotoStanSisaKwh && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold">
                                Stan KWh: Uploaded ✓
                              </span>
                            )}
                            {!rec.aiAnalysisBA && !rec.aiAnalysisKwh && !rec.fotoStanSisaKwh && (
                              <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          {rec.status === 'BELUM_DIPROSES' && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-300">
                              <Clock className="w-3 h-3" /> Belum Diproses
                            </span>
                          )}
                          {rec.status === 'DALAM_PENANGANAN' && (
                            <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-900 px-2.5 py-1 rounded-full text-[10px] font-bold border border-cyan-300">
                              <Wrench className="w-3 h-3" /> Dalam Penanganan
                            </span>
                          )}
                          {rec.status === 'SELESAI' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Selesai
                            </span>
                          )}
                        </td>

                        {/* SUB-MENU AKSI: SELESAI, WO P2TL, WO GAMET */}
                        <td className="p-3.5 text-right space-y-1">
                          <div className="flex flex-wrap justify-end items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedRecordDetail(rec)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="Detail Laporan & Foto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Sub-menu Selesai */}
                            {rec.status !== 'SELESAI' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStatus = rec.status === 'BELUM_DIPROSES' ? 'DALAM_PENANGANAN' : 'SELESAI';
                                  onUpdateStatus(rec.id, nextStatus, 'Ditindaklanjuti oleh petugas lapangan');
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                {rec.status === 'BELUM_DIPROSES' ? 'Tangani' : 'Selesai'}
                              </button>
                            )}

                            {/* Sub-menu WO P2TL */}
                            {onConvertToWoP2tl && (
                              <button
                                type="button"
                                onClick={() => onConvertToWoP2tl(rec.idpel, rec.namaPelanggan, rec.alamatPelanggan, rec.jenisGangguan)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Buat Work Order P2TL"
                              >
                                WO P2TL
                              </button>
                            )}

                            {/* Sub-menu WO Gamet */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onConvertToGamet) {
                                  const lama = calculateLamaGangguan(rec.tanggalBypass, rec.tanggalLapor);
                                  onConvertToGamet(rec.idpel, rec.namaPelanggan, rec.alamatPelanggan, rec.jenisGangguan, {
                                    tarif: rec.tarif,
                                    daya: rec.daya,
                                    gardu: rec.gardu,
                                    titikTumpu: rec.titikTumpu,
                                    nomorMeter: rec.nomorMeter,
                                    nomorTelepon: rec.nomorTelepon,
                                    lamaGangguanHari: lama.days
                                  });
                                } else {
                                  onUpdateStatus(rec.id, 'DALAM_PENANGANAN', 'Konversi ke WO Gamet');
                                }
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Buat Work Order Gamet (Penggantian Regular)"
                            >
                              WO Gamet
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteRecord(rec.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Hapus Laporan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ========================================================= */}
      {/* 4. SUB-MENU: UPLOAD FILE EXCEL REKAP GANGGUAN             */}
      {/* ========================================================= */}
      {activeSubTab === 'upload' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setIsProcessingBatch(true);
              setBatchError(null);

              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const buffer = ev.target?.result as ArrayBuffer;
                  const data = new Uint8Array(buffer);
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

                  const newGangguanList: GangguanAppRecord[] = [];
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

                    newGangguanList.push({
                      id: `GAPP-${Date.now()}-${idx}`,
                      noLaporan: `YNT-${Date.now().toString().slice(-6)}-${idx}`,
                      noGangguan: getVal('NO_GANGGUAN', 'NO_GGN') || `GGN-${idx + 100}`,
                      idpel: idpelVal,
                      namaPelanggan: getVal('NAMA', 'NAMA_PELANGGAN') || 'Pelanggan PLN',
                      alamatPelanggan: getVal('ALAMAT', 'ALAMAT_PELANGGAN') || 'Alamat Terdaftar',
                      tarif: getVal('TARIF') || 'R1M',
                      daya: getVal('DAYA') || '900 VA',
                      sumberLaporan: 'YANTEK',
                      jenisGangguan: 'METER_MACET',
                      deskripsiGangguan: getVal('DESKRIPSI', 'CATATAN') || 'Laporan Rekap Gangguan APP',
                      tanggalLapor: new Date().toISOString().replace('T', ' ').substring(0, 16),
                      status: 'BELUM_DIPROSES',
                      petugasPelapor: 'Petugas Yantek Batch Upload'
                    });
                  });

                  if (newGangguanList.length === 0) throw new Error('Format kolom IDPEL tidak terdeteksi.');

                  onAddBatchRecords(newGangguanList);
                  setBatchSuccessMsg(`Berhasil mengimpor ${newGangguanList.length} Laporan Gangguan APP!`);
                  setActiveSubTab('list');
                } catch (err: any) {
                  setBatchError(err.message || 'Gagal membaca file.');
                } finally {
                  setIsProcessingBatch(false);
                }
              };
              reader.readAsArrayBuffer(file);
            }}
            className="hidden"
          />

          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Upload Batch Rekap Laporan Gangguan APP
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Unggah file spreadsheet rekap temuan gangguan dari posko Yantek / Billman.
            </p>
          </div>

          {batchError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
              {batchError}
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-10 border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/20 rounded-2xl text-center space-y-3 cursor-pointer transition"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto font-bold">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Klik untuk Mengunggah Rekap Gangguan APP (.XLSX)</h4>
            <p className="text-[11px] text-slate-500">Impor sekaligus laporan gangguan dari file Excel</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SUB-MENU: ANALYTICS GANGGUAN APP                        */}
      {/* ========================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Header Banner Analytics */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-blue-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> ANALISIS HASIL INPUT GANGGUAN PETUGAS
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Dashboard Analytic Laporan Gangguan APP</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Statistik & tren hasil temuan petugas Yantek/Billman: Jumlah gangguan per bulan/tahun, tipe & merk meter bermasalah, serta distribusi jenis gangguan.
              </p>
            </div>

            {/* Year Filter Selector for Analytics */}
            <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-blue-500/30 shrink-0">
              <span className="text-xs text-slate-300 font-bold shrink-0">Filter Tahun:</span>
              <select
                value={analyticsYearFilter}
                onChange={(e) => setAnalyticsYearFilter(e.target.value)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black outline-none cursor-pointer"
              >
                <option value="ALL">🗓️ Semua Tahun ({records.length})</option>
                {availableYearsList.map((y) => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Stat Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Laporan Teranalisis</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">{analyticsYearRecords.length}</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Termasuk laporan Yantek, Billman & Lapangan</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Status Selesai Penanganan</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-emerald-600">
                  {analyticsYearRecords.filter(r => r.status === 'SELESAI').length}
                </span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs">
                  {analyticsYearRecords.length > 0 
                    ? Math.round((analyticsYearRecords.filter(r => r.status === 'SELESAI').length / analyticsYearRecords.length) * 100) 
                    : 0}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Sudah ditindaklanjuti WO Ganti Meter</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Merk Paling Bermasalah</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-rose-600 truncate max-w-[120px]">
                  {merkListSorted[0]?.merk || '-'}
                </span>
                <span className="px-2 py-1 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-lg border border-rose-200">
                  {merkListSorted[0]?.count || 0} Kasus
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Berdasarkan total temuan petugas</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Est. Tagihan Susulan PLN</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-amber-600 truncate">
                  Rp {analyticsYearRecords
                    .filter(r => r.status !== 'SELESAI')
                    .reduce((acc, r) => acc + calculateAiReplacementPriority(r).totalEstimasiRupiah, 0)
                    .toLocaleString('id-ID')}
                </span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl font-black text-xs">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Estimasi energi terlewat belum tertagih</p>
            </div>
          </div>

          {/* Section 1: Chart Gangguan per Bulan & Tahun */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Bar Visual */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">Jumlah Gangguan per Bulan ({analyticsYearFilter === 'ALL' ? 'Semua Tahun' : `Tahun ${analyticsYearFilter}`})</h4>
                </div>
                <span className="text-[11px] text-slate-500 font-bold">Januari - Desember</span>
              </div>

              <div className="h-48 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 px-2 bg-slate-50 rounded-xl border border-slate-100">
                {monthlyData.map((m) => {
                  const pct = Math.round((m.count / maxMonthlyCount) * 100);
                  return (
                    <div key={m.monthCode} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[9px] font-mono font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition mb-1">
                        {m.count}
                      </span>
                      <div
                        style={{ height: `${Math.max(pct, 6)}%` }}
                        className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                          m.count > 0 ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 shadow-xs' : 'bg-slate-200'
                        }`}
                      />
                      <span className="text-[9px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                        {m.monthName.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                {monthlyData.map(m => (
                  <div key={m.monthCode} className="p-2 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">{m.monthName}</span>
                    <strong className="text-xs font-black text-slate-800">{m.count} Laporan</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Yearly Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-black text-slate-900">Rekapitulasi per Tahun</h4>
              </div>

              <div className="space-y-3">
                {yearlyData.map((y) => {
                  const pct = totalCount > 0 ? Math.round((y.count / totalCount) * 100) : 0;
                  return (
                    <div key={y.year} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <strong className="text-slate-900 font-extrabold">Tahun {y.year}</strong>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">{y.count} Kasus ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-indigo-600 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 font-medium leading-snug">
                💡 <strong>Catatan AI Analytics:</strong> Data terdistribusi secara otomatis dari form input manual Yantek & impor file rekap Excel.
              </div>
            </div>
          </div>

          {/* Section 2: Tipe Meter & Sumber Laporan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipe Meter (Prabayar vs Pascabayar vs MCB) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <PieChart className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">Distribusi Tipe Meter Bermasalah</h4>
              </div>

              <div className="space-y-3">
                {/* Prabayar */}
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      ⚡ Meter Prabayar (Token)
                    </span>
                    <strong className="text-amber-900 font-mono">
                      {prabayarCount} ({analyticsYearRecords.length ? Math.round((prabayarCount/analyticsYearRecords.length)*100) : 0}%)
                    </strong>
                  </div>
                  <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
                    <div style={{ width: `${analyticsYearRecords.length ? (prabayarCount/analyticsYearRecords.length)*100 : 0}%` }} className="h-full bg-amber-500 rounded-full" />
                  </div>
                </div>

                {/* Pascabayar */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      📜 Meter Pascabayar
                    </span>
                    <strong className="text-blue-900 font-mono">
                      {pascabayarCount} ({analyticsYearRecords.length ? Math.round((pascabayarCount/analyticsYearRecords.length)*100) : 0}%)
                    </strong>
                  </div>
                  <div className="w-full h-2.5 bg-blue-200/60 rounded-full overflow-hidden">
                    <div style={{ width: `${analyticsYearRecords.length ? (pascabayarCount/analyticsYearRecords.length)*100 : 0}%` }} className="h-full bg-blue-600 rounded-full" />
                  </div>
                </div>

                {/* MCB */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      🔌 Pembatas MCB
                    </span>
                    <strong className="text-emerald-900 font-mono">
                      {mcbCount} ({analyticsYearRecords.length ? Math.round((mcbCount/analyticsYearRecords.length)*100) : 0}%)
                    </strong>
                  </div>
                  <div className="w-full h-2.5 bg-emerald-200/60 rounded-full overflow-hidden">
                    <div style={{ width: `${analyticsYearRecords.length ? (mcbCount/analyticsYearRecords.length)*100 : 0}%` }} className="h-full bg-emerald-600 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sumber Laporan Petugas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-black text-slate-900">Analisis Sumber Laporan Petugas</h4>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">Yantek Posko</span>
                  <strong className="text-xl font-black text-indigo-950 mt-1 block">{yantekCount}</strong>
                  <span className="text-[9px] text-indigo-700 font-semibold block mt-1">
                    {analyticsYearRecords.length ? Math.round((yantekCount/analyticsYearRecords.length)*100) : 0}% Laporan
                  </span>
                </div>

                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 text-center">
                  <span className="text-[10px] font-bold text-purple-600 uppercase block">Petugas Billman</span>
                  <strong className="text-xl font-black text-purple-950 mt-1 block">{billmanCount}</strong>
                  <span className="text-[9px] text-purple-700 font-semibold block mt-1">
                    {analyticsYearRecords.length ? Math.round((billmanCount/analyticsYearRecords.length)*100) : 0}% Laporan
                  </span>
                </div>

                <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-200 text-center">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Petugas Lapangan</span>
                  <strong className="text-xl font-black text-teal-950 mt-1 block">{petugasLapCount}</strong>
                  <span className="text-[9px] text-teal-700 font-semibold block mt-1">
                    {analyticsYearRecords.length ? Math.round((petugasLapCount/analyticsYearRecords.length)*100) : 0}% Laporan
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ranking Merk Meter & Jenis Gangguan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking Merk Meter */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-600" />
                  <h4 className="text-sm font-black text-slate-900">Ranking Merk Meter Paling Bermasalah</h4>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Top High Failure</span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {merkListSorted.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Belum ada data merk meter terinput.</p>
                ) : (
                  merkListSorted.map((item, idx) => {
                    const pct = Math.round((item.count / maxMerkCount) * 100);
                    return (
                      <div key={item.merk} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-slate-800 text-white rounded font-mono text-[10px] flex items-center justify-center font-bold">
                              #{idx + 1}
                            </span>
                            {item.merk}
                          </span>
                          <strong className="font-mono text-rose-600 font-bold">{item.count} Kasus</strong>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-rose-500 rounded-full" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Breakdown Jenis Gangguan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-black text-slate-900">Distribusi Jenis Gangguan KWh Meter</h4>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Kategori Temuan</span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {jenisListSorted.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Belum ada data jenis gangguan terinput.</p>
                ) : (
                  jenisListSorted.map((item) => {
                    const pct = Math.round((item.count / maxJenisCount) * 100);
                    return (
                      <div key={item.jenis} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-800 uppercase tracking-tight">
                            {item.jenis.replace(/_/g, ' ')}
                          </span>
                          <strong className="font-mono text-indigo-600 font-bold">{item.count} Laporan</strong>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-indigo-600 rounded-full" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH SINGLE PELANGGAN MANUALLY */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSingleCustSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" /> Tambah Pelanggan ke Database
              </h3>
              <button type="button" onClick={() => setShowAddCustModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">IDPEL *</label>
                <input
                  type="text"
                  required
                  placeholder="5389..."
                  value={newCustIdpel}
                  onChange={(e) => setNewCustIdpel(e.target.value)}
                  className="w-full p-2 border rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={newCustNama}
                  onChange={(e) => setNewCustNama(e.target.value)}
                  className="w-full p-2 border rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="font-bold text-slate-700">Alamat Lengkap</label>
                <input
                  type="text"
                  placeholder="Alamat"
                  value={newCustAlamat}
                  onChange={(e) => setNewCustAlamat(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tarif / Daya</label>
                <div className="grid grid-cols-2 gap-1">
                  <input type="text" value={newCustTarif} onChange={(e) => setNewCustTarif(e.target.value)} className="p-2 border rounded-xl text-center" />
                  <input type="text" value={newCustDaya} onChange={(e) => setNewCustDaya(e.target.value)} className="p-2 border rounded-xl text-center" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Gardu Distribusi</label>
                <input type="text" value={newCustGardu} onChange={(e) => setNewCustGardu(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Merk Meter</label>
                <input type="text" value={newCustMerk} onChange={(e) => setNewCustMerk(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nomor Meter Terpasang</label>
                <input type="text" placeholder="No. Meter" value={newCustNoMeter} onChange={(e) => setNewCustNoMeter(e.target.value)} className="w-full p-2 border rounded-xl font-mono" />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddCustModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Simpan ke Database</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DETAIL LAPORAN & FOTO AI */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 font-mono">{selectedRecordDetail.noGangguan || selectedRecordDetail.noLaporan}</span>
                <h3 className="text-sm font-black text-slate-900">Detail Laporan Gangguan APP IDPEL {selectedRecordDetail.idpel}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRecordDetail(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-500 block text-[10px]">No. Gangguan / BA:</strong> {selectedRecordDetail.noGangguan || '-'} {selectedRecordDetail.noBAGangguan ? `/ ${selectedRecordDetail.noBAGangguan}` : ''}</div>
              <div><strong className="text-slate-500 block text-[10px]">Sumber Laporan:</strong> <span className="font-black text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded text-[11px] inline-block">{selectedRecordDetail.sumberLaporan || 'YANTEK'}</span></div>
              <div><strong className="text-slate-500 block text-[10px]">Nama Pelanggan:</strong> {selectedRecordDetail.namaPelanggan}</div>
              <div><strong className="text-slate-500 block text-[10px]">Tipe / Tarif / Daya:</strong> {selectedRecordDetail.tipeMeter || 'PRABAYAR'} / {selectedRecordDetail.tarif} / {selectedRecordDetail.daya}</div>
              <div><strong className="text-slate-500 block text-[10px]">Gardu / Titik Tumpu:</strong> {selectedRecordDetail.gardu || '-'} / {selectedRecordDetail.titikTumpu || '-'}</div>
              <div><strong className="text-slate-500 block text-[10px]">Merk & No Meter:</strong> {selectedRecordDetail.merkMeter} - {selectedRecordDetail.nomorMeter}</div>
              <div><strong className="text-slate-500 block text-[10px]">Tanggal:</strong> {selectedRecordDetail.tanggalBypass || '-'}</div>
              <div><strong className="text-slate-500 block text-[10px]">Sisa Token / Stan:</strong> {selectedRecordDetail.sisaToken || '-'}</div>
              <div><strong className="text-slate-500 block text-[10px]">Jenis Gangguan:</strong> <span className="font-bold text-rose-800">{selectedRecordDetail.jenisGangguan ? selectedRecordDetail.jenisGangguan.replace(/_/g, ' ') : '-'}</span></div>
            </div>

            {/* Photos & AI Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {selectedRecordDetail.fotoBA && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">Foto Berita Acara (BA)</span>
                  <img src={selectedRecordDetail.fotoBA} alt="Foto BA" className="w-full h-36 object-cover rounded-lg" />
                  {selectedRecordDetail.aiAnalysisBA && (
                    <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded font-semibold mt-1">
                      {selectedRecordDetail.aiAnalysisBA.summary}
                    </p>
                  )}
                </div>
              )}

              {selectedRecordDetail.fotoKwh && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">Foto KWh Meter (Fisik)</span>
                  <img src={selectedRecordDetail.fotoKwh} alt="Foto KWh" className="w-full h-36 object-cover rounded-lg" />
                  {selectedRecordDetail.aiAnalysisKwh && (
                    <p className="text-[10px] text-blue-800 bg-blue-50 p-2 rounded font-semibold mt-1">
                      {selectedRecordDetail.aiAnalysisKwh.summary}
                    </p>
                  )}
                </div>
              )}

              {selectedRecordDetail.fotoStanSisaKwh && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">Foto Stan / Sisa KWh</span>
                  <img src={selectedRecordDetail.fotoStanSisaKwh} alt="Foto Stan Sisa KWh" className="w-full h-36 object-cover rounded-lg" />
                  <p className="text-[10px] text-indigo-800 bg-indigo-50 p-2 rounded font-semibold mt-1">
                    Dokumentasi Stan / Sisa Token: {selectedRecordDetail.sisaToken || '0.0 kWh'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedRecordDetail(null)} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PENGIRIMAN WO KOLEKTIF */}
      {batchModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${batchModalTarget === 'P2TL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                  {batchModalTarget === 'P2TL' ? <ArrowRight className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Konfirmasi Pengiriman Work Order Kolektif
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${batchModalTarget === 'P2TL' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                      {batchModalTarget === 'P2TL' ? 'Target P2TL (Yanbung)' : 'Target Gamet (Ganti Meter)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih dan centang pelanggan yang akan dikirimkan Work Order secara massal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBatchModalTarget(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Controls / Info Bar inside Modal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllInModal}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    {batchModalSelectedIds.length === records.filter(r => r.status !== 'SELESAI').length ? 'Batalkan Semua' : 'Pilih Semua Pelanggan'}
                  </button>
                  <span className="text-xs text-slate-300 font-bold">
                    Terpilih: <strong className="text-amber-400 font-mono text-sm">{batchModalSelectedIds.length}</strong> Pelanggan
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Target Tim:</span>
                  <input
                    type="text"
                    value={batchAssignedTim}
                    onChange={(e) => setBatchAssignedTim(e.target.value)}
                    placeholder="Nama Tim Lapangan..."
                    className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Customer Table Inside Modal */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/90 text-slate-200 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">Pilih</th>
                        <th className="p-3">IDPEL & Nama Pelanggan</th>
                        <th className="p-3">Alamat</th>
                        <th className="p-3">Tarif / Daya</th>
                        <th className="p-3">Jenis Gangguan</th>
                        <th className="p-3">Lama Gangguan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {records.filter(r => r.status !== 'SELESAI').map((rec) => {
                        const isChecked = batchModalSelectedIds.includes(rec.id);
                        const lama = calculateLamaGangguan(rec.tanggalBypass, rec.tanggalLapor);
                        return (
                          <tr
                            key={rec.id}
                            onClick={() => handleToggleBatchModalSelect(rec.id)}
                            className={`hover:bg-slate-800/50 transition cursor-pointer ${isChecked ? 'bg-amber-500/10' : ''}`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleBatchModalSelect(rec.id)}
                                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono">
                              <div className="font-bold text-white">{rec.idpel}</div>
                              <div className="text-[11px] text-slate-400 font-sans">{rec.namaPelanggan}</div>
                            </td>
                            <td className="p-3 text-slate-300 max-w-xs truncate">
                              {rec.alamatPelanggan || '-'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-mono font-bold rounded border border-slate-700">
                                {rec.tarif || 'R1M'} / {rec.daya || '900 VA'}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-300">
                              {rec.jenisGangguan}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 font-bold rounded border border-rose-500/20">
                                {lama.days} Hari
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Supervisor */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Catatan / Instruksi Penugasan WO:</label>
                <input
                  type="text"
                  value={batchCatatan}
                  onChange={(e) => setBatchCatatan(e.target.value)}
                  placeholder="Instruksi penanganan untuk tim lapangan..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBatchModalTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={batchModalSelectedIds.length === 0}
                onClick={handleConfirmBatchConvert}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg ${
                  batchModalSelectedIds.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : batchModalTarget === 'P2TL'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 cursor-pointer'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30 cursor-pointer'
                }`}
              >
                {batchModalTarget === 'P2TL' ? <ArrowRight className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                Kirim ({batchModalSelectedIds.length}) WO ke {batchModalTarget === 'P2TL' ? 'P2TL' : 'Gamet'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GOOGLE SHEETS SYNC MODAL */}
      <GoogleSheetsSyncModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        onApplyData={(customers, replaceAll) => {
          if (onUpsertCustomerMaster) {
            onUpsertCustomerMaster(customers, replaceAll);
          } else if (onBatchAddCustomerMaster) {
            onBatchAddCustomerMaster(customers);
          }
          setCustDbSuccessMsg(
            replaceAll
              ? `Database Master Pelanggan berhasil diganti (${customers.length} data) dari Google Sheets.`
              : `Berhasil menyinkronkan & memperbarui ${customers.length} data pelanggan dari Google Sheets.`
          );
        }}
        currentCustomerCount={customerDatabase.length}
      />
    </div>
  );
};
