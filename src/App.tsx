import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReplacementRecord, WorkOrderTarget, AppMainModule, GangguanAppRecord, GametRecord, CustomerMasterItem, GametWorkOrderTarget, UserAccount } from './types';
import { INITIAL_RECORDS, INITIAL_WORK_ORDERS, INITIAL_GANGGUAN_RECORDS, INITIAL_GAMET_RECORDS, INITIAL_CUSTOMER_DATABASE, INITIAL_GAMET_WORK_ORDERS, INITIAL_USER_ACCOUNTS } from './data/mockData';
import { Header } from './components/Header';
import { FormReplacement } from './components/FormReplacement';
import { SupervisorManager } from './components/SupervisorManager';
import { HistoryList } from './components/HistoryList';
import { RecordDetailModal } from './components/RecordDetailModal';
import { PrintBeritaAcara } from './components/PrintBeritaAcara';
import { DashboardStats } from './components/DashboardStats';
import { GangguanAppManager } from './components/GangguanAppManager';
import { GametManager } from './components/GametManager';
import { TanyaSimetri } from './components/TanyaSimetri';
import { UserManager } from './components/UserManager';
import { LoginModal } from './components/LoginModal';
import { CheckCircle2, Zap } from 'lucide-react';
import { saveCustomersToCache, loadCustomersFromCache } from './utils/customerDbCache';
import { fetchAllCustomersFromServer } from './utils/googleSheetsSync';

const STORAGE_KEY_RECORDS = 'p2tl_meter_replacement_records_v2';
const STORAGE_KEY_WO = 'p2tl_meter_replacement_wo_v2';
const STORAGE_KEY_GANGGUAN = 'p2tl_gangguan_app_records_v1';
const STORAGE_KEY_GAMET = 'p2tl_gamet_records_v1';
const STORAGE_KEY_GAMET_WO = 'p2tl_gamet_wo_v1';
const STORAGE_KEY_CUST_DB = 'p2tl_customer_database_v1';
const STORAGE_KEY_USERS = 'simetri_user_accounts_v2';
const STORAGE_KEY_ACTIVE_USER = 'simetri_active_user_v2';

export default function App() {
  // User Management & Login State
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
    return INITIAL_USER_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading active user:', e);
    }
    return null; // Require login first
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Primary Module Menu State: 'gangguan' | 'p2tl' | 'gamet' | 'users'
  const [activeModule, setActiveModule] = useState<AppMainModule>('gangguan');

  // Sub-Tab for P2TL (Yanbung) module
  const [activeP2tlTab, setActiveP2tlTab] = useState<'form' | 'supervisor' | 'history' | 'dashboard'>('form');

  // Sub-Tab for Gangguan APP module
  const [activeGangguanTab, setActiveGangguanTab] = useState<'input' | 'list' | 'custdb' | 'upload' | 'analytics'>('input');

  // Sub-Tab for Gamet module
  const [activeGametTab, setActiveGametTab] = useState<'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard'>('form');

  // ROLE ACCESS RESTRICTION AUTO-ENFORCEMENT
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;

    // Menu Tanya SIMETRI AI dapat diakses oleh semua role user
    if (activeModule === 'tanya-simetri') return;

    if (role === 'Yantek' || role === 'Billman') {
      if (activeModule !== 'gangguan') setActiveModule('gangguan');
      if (activeGangguanTab !== 'input') setActiveGangguanTab('input');
    } else if (role === 'Yanbung') {
      if (activeModule !== 'p2tl') setActiveModule('p2tl');
      if (activeP2tlTab !== 'form') setActiveP2tlTab('form');
    } else if (role === 'Gamet') {
      if (activeModule !== 'gamet') setActiveModule('gamet');
      if (activeGametTab !== 'form') setActiveGametTab('form');
    }
  }, [currentUser, activeModule, activeGangguanTab, activeP2tlTab, activeGametTab]);

  // Customer Master Database State
  const [customerDatabase, setCustomerDatabase] = useState<CustomerMasterItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUST_DB);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading customer database:', e);
    }
    return INITIAL_CUSTOMER_DATABASE;
  });

  // P2TL Records & Work Orders
  const [records, setRecords] = useState<ReplacementRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local records:', e);
    }
    return INITIAL_RECORDS;
  });

  const [workOrders, setWorkOrders] = useState<WorkOrderTarget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local work orders:', e);
    }
    return INITIAL_WORK_ORDERS;
  });

  // Gangguan APP Records
  const [gangguanRecords, setGangguanRecords] = useState<GangguanAppRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GANGGUAN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local gangguan records:', e);
    }
    return INITIAL_GANGGUAN_RECORDS;
  });

  // Gamet Records
  const [gametRecords, setGametRecords] = useState<GametRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GAMET);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local gamet records:', e);
    }
    return INITIAL_GAMET_RECORDS;
  });

  // Gamet Work Orders
  const [gametWorkOrders, setGametWorkOrders] = useState<GametWorkOrderTarget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GAMET_WO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local gamet work orders:', e);
    }
    return INITIAL_GAMET_WORK_ORDERS;
  });

  const [editingRecord, setEditingRecord] = useState<ReplacementRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ReplacementRecord | null>(null);
  const [selectedWoForForm, setSelectedWoForForm] = useState<WorkOrderTarget | null>(null);
  const [printRecord, setPrintRecord] = useState<ReplacementRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // LocalStorage Syncs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) { console.error(e); }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WO, JSON.stringify(workOrders));
    } catch (e) { console.error(e); }
  }, [workOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GANGGUAN, JSON.stringify(gangguanRecords));
    } catch (e) { console.error(e); }
  }, [gangguanRecords]);

  useEffect(() => {
    try {
      if (customerDatabase.length <= 500) {
        localStorage.setItem(STORAGE_KEY_CUST_DB, JSON.stringify(customerDatabase));
      } else {
        localStorage.setItem(
          STORAGE_KEY_CUST_DB + '_meta',
          JSON.stringify({
            count: customerDatabase.length,
            updatedAt: new Date().toISOString(),
          })
        );
        // Persist all records safely in browser IndexedDB
        saveCustomersToCache(customerDatabase);
      }
    } catch (e) {
      console.warn('LocalStorage customerDatabase quota guard:', e);
    }
  }, [customerDatabase]);

  // Load all 92,148 customer master data from IndexedDB cache or backend on startup
  useEffect(() => {
    let isMounted = true;
    async function initCustomerData() {
      // 1. Try to load from fast IndexedDB first for instant UI response
      try {
        const cached = await loadCustomersFromCache();
        if (isMounted && cached && Array.isArray(cached.customers) && cached.customers.length > 0) {
          setCustomerDatabase(cached.customers);
        }
      } catch (err) {
        console.warn('IndexedDB initial load note:', err);
      }

      // 2. Fetch all customers from server if server has full 92,148 records
      try {
        const statsRes = await fetch('/api/customers/stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          const serverTotal = stats.totalCount || 0;
          if (serverTotal > 0) {
            const allRes = await fetchAllCustomersFromServer();
            if (isMounted && allRes.success && allRes.customers.length > 0) {
              setCustomerDatabase(allRes.customers);
              saveCustomersToCache(allRes.customers, allRes.lastSync);
            }
          }
        }
      } catch (err) {
        console.warn('Backend customer sync note:', err);
      }
    }

    initCustomerData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GAMET, JSON.stringify(gametRecords));
    } catch (e) { console.error(e); }
  }, [gametRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GAMET_WO, JSON.stringify(gametWorkOrders));
    } catch (e) { console.error(e); }
  }, [gametWorkOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(userAccounts));
    } catch (e) { console.error(e); }
  }, [userAccounts]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      }
    } catch (e) { console.error(e); }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // User Management Handlers
  const handleAddUserAccount = (newUser: UserAccount) => {
    setUserAccounts((prev) => [newUser, ...prev]);
    showToast(`Berhasil mendaftarkan akun ${newUser.namaLengkap} (${newUser.role})!`);
  };

  const handleUpdateUserAccount = (updatedUser: UserAccount) => {
    setUserAccounts((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    showToast(`Akun user ${updatedUser.username} berhasil diperbarui.`);
  };

  const handleDeleteUserAccount = (id: string) => {
    setUserAccounts((prev) => prev.filter((u) => u.id !== id));
    showToast('Akun user telah dihapus.');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    showToast(`Selamat datang, ${user.namaLengkap}! Akses: Role ${user.role}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowLoginModal(true);
    showToast('Anda telah logout dari SIMETRI.');
  };

  // Gamet Handlers
  const handleAddGametRecord = (newRecord: GametRecord) => {
    setGametRecords(prev => [newRecord, ...prev]);
    if (newRecord.workOrderId) {
      setGametWorkOrders(prev => prev.map(wo => wo.id === newRecord.workOrderId ? { ...wo, status: 'SELESAI' } : wo));
    }
    showToast(`Berhasil menyimpan Laporan Penggantian Gamet IDPEL ${newRecord.idpel}!`);
  };

  const handleAddBatchGametRecords = (newRecords: GametRecord[]) => {
    setGametRecords(prev => [...newRecords, ...prev]);
    showToast(`Berhasil mengimpor ${newRecords.length} data penggantian Gamet!`);
  };

  const handleDeleteGametRecord = (id: string) => {
    setGametRecords(prev => prev.filter(r => r.id !== id));
    showToast('Data penggantian Gamet berhasil dihapus.');
  };

  const handleAddGametWorkOrders = (newOrders: GametWorkOrderTarget[]) => {
    setGametWorkOrders(prev => [...newOrders, ...prev]);
    showToast(`Berhasil menambahkan ${newOrders.length} Target Work Order Gamet!`);
  };

  const handleDeleteGametWorkOrder = (id: string) => {
    setGametWorkOrders(prev => prev.filter(w => w.id !== id));
    showToast('Target Work Order Gamet berhasil dihapus.');
  };

  // Handlers for P2TL (Yanbung)
  const handleUploadWorkOrders = (newWos: WorkOrderTarget[]) => {
    setWorkOrders((prev) => [...newWos, ...prev]);
    showToast(`Berhasil menambahkan ${newWos.length} data target Work Order dari Supervisor!`);
  };

  const handleSelectWoForExecution = (wo: WorkOrderTarget) => {
    setSelectedWoForForm(wo);
    setEditingRecord(null);
    setActiveP2tlTab('form');
    showToast(`Target IDPEL ${wo.idpel} dimuat ke Form Lapangan P2TL.`);
  };

  const handleSaveRecord = (newOrUpdated: ReplacementRecord) => {
    setRecords((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === newOrUpdated.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = newOrUpdated;
        return updated;
      } else {
        return [newOrUpdated, ...prev];
      }
    });

    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === newOrUpdated.workOrderId || wo.idpel === newOrUpdated.idpel) {
          return {
            ...wo,
            status: 'SELESAI',
            executedAt: newOrUpdated.tanggalGanti,
            stanCabut: newOrUpdated.stanCabut,
            nomorMeterBaru: newOrUpdated.nomorMeterBaru
          };
        }
        return wo;
      })
    );

    setEditingRecord(null);
    setSelectedWoForForm(null);
    showToast(`Berhasil menyimpan data penggantian meter IDPEL ${newOrUpdated.idpel}!`);
    setActiveP2tlTab('history');
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('Data penggantian meter P2TL berhasil dihapus.');
  };

  const handleEditRecord = (record: ReplacementRecord) => {
    setEditingRecord(record);
    setActiveP2tlTab('form');
  };

  const handleUpdateRecordFromModal = (updated: ReplacementRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
    showToast('Data verifikasi AI berhasil diperbarui.');
  };

  // Handlers for Gangguan APP (Yantek/Billman)
  const handleAddCustomerMaster = (newCust: CustomerMasterItem) => {
    setCustomerDatabase((prev) => [newCust, ...prev]);
    showToast('Data Pelanggan berhasil ditambahkan ke database!');
  };

  const handleBatchAddCustomerMaster = (custs: CustomerMasterItem[]) => {
    setCustomerDatabase((prev) => [...custs, ...prev]);
    showToast(`Berhasil mengimpor ${custs.length} data pelanggan ke database!`);
  };

  const handleUpsertCustomerMaster = (custs: CustomerMasterItem[], replaceAll: boolean = false) => {
    if (replaceAll) {
      setCustomerDatabase(custs);
      saveCustomersToCache(custs);
      showToast(`Database Master Pelanggan berhasil diganti (${custs.length.toLocaleString('id-ID')} pelanggan)!`);
    } else {
      setCustomerDatabase((prev) => {
        const map = new Map<string, CustomerMasterItem>();
        prev.forEach((c) => map.set(c.idpel.trim(), c));
        custs.forEach((c) => map.set(c.idpel.trim(), c));
        const merged = Array.from(map.values());
        saveCustomersToCache(merged);
        return merged;
      });
      showToast(`Berhasil menyinkronkan & memperbarui ${custs.length.toLocaleString('id-ID')} data pelanggan ke database!`);
    }
  };

  const handleDeleteCustomerMaster = (id: string) => {
    setCustomerDatabase((prev) => prev.filter((c) => c.id !== id));
    showToast('Data pelanggan berhasil dihapus dari database.');
  };

  const handleAddGangguanRecord = (newRecord: GangguanAppRecord) => {
    setGangguanRecords((prev) => [newRecord, ...prev]);
    showToast(`Berhasil menambahkan laporan Gangguan APP IDPEL ${newRecord.idpel}!`);
  };

  const handleAddBatchGangguanRecords = (batch: GangguanAppRecord[]) => {
    setGangguanRecords((prev) => [...batch, ...prev]);
    showToast(`Berhasil mengimpor ${batch.length} laporan Gangguan APP!`);
  };

  const handleUpdateGangguanStatus = (id: string, newStatus: GangguanAppRecord['status'], catatan?: string) => {
    setGangguanRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus, catatanPenanganan: catatan || r.catatanPenanganan } : r))
    );
    showToast('Status penanganan gangguan APP berhasil diperbarui!');
  };

  const handleDeleteGangguanRecord = (id: string) => {
    setGangguanRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('Laporan gangguan APP berhasil dihapus.');
  };

  const handleConvertGangguanToP2tlWo = (idpel: string, nama: string, alamat: string, jenisGangguan: string) => {
    const newWo: WorkOrderTarget = {
      id: `WO-GAPP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idpel,
      namaPelanggan: nama,
      alamatPelanggan: alamat,
      tarif: 'R1M',
      daya: '900 VA',
      nomorMeterLama: '00000000000',
      jenisPelanggaran: 'P2TL_KATEGORI_II',
      assignedTim: 'Tim Penormalan Alpha 01',
      status: 'BELUM_DIGANTI',
      catatanSupervisor: `Konversi dari Laporan Gangguan APP Yantek/Billman (${jenisGangguan})`,
      uploadedAt: new Date().toISOString()
    };

    setWorkOrders((prev) => [newWo, ...prev]);
    setSelectedWoForForm(newWo);
    setActiveModule('p2tl');
    setActiveP2tlTab('form');
    showToast(`Laporan Gangguan IDPEL ${idpel} dikonversi ke Target Work Order Ganti Meter P2TL.`);
  };

  const handleBatchConvertGangguanToP2tlWo = (
    items: Array<{
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
      assignedTim?: string;
      catatanSupervisor?: string;
    }>
  ) => {
    if (!items || items.length === 0) return;

    const newWos: WorkOrderTarget[] = items.map((item, index) => ({
      id: `WO-GAPP-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      idpel: item.idpel,
      namaPelanggan: item.nama,
      alamatPelanggan: item.alamat,
      tarif: item.tarif || 'R1M',
      daya: item.daya || '900 VA',
      gardu: item.gardu || '-',
      titikTumpu: item.titikTumpu || '-',
      nomorMeterLama: item.nomorMeter || '00000000000',
      jenisPelanggaran: 'P2TL_KATEGORI_II',
      assignedTim: item.assignedTim || 'Tim Penormalan Alpha 01',
      status: 'BELUM_DIGANTI',
      catatanSupervisor: item.catatanSupervisor || `Konversi Kolektif dari Laporan Gangguan APP (${item.jenisGangguan})`,
      uploadedAt: new Date().toISOString()
    }));

    setWorkOrders((prev) => [...newWos, ...prev]);

    const convertedRecordIds = items.map(i => i.recordId).filter(Boolean) as string[];
    if (convertedRecordIds.length > 0) {
      setGangguanRecords((prev) =>
        prev.map((r) =>
          convertedRecordIds.includes(r.id)
            ? { ...r, status: 'DALAM_PENANGANAN', catatanPenanganan: 'Dikonversi kolektif ke WO P2TL' }
            : r
        )
      );
    }

    setActiveModule('p2tl');
    setActiveP2tlTab('supervisor');
    showToast(`Berhasil mengirim ${newWos.length} Target Work Order secara kolektif ke P2TL (Yanbung)!`);
  };

  const handleConvertGangguanToGamet = (
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
  ) => {
    const newGametWo: GametWorkOrderTarget = {
      id: `WO-GMT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idpel,
      namaPelanggan: nama,
      alamatPelanggan: alamat,
      nomorTelepon: extraData?.nomorTelepon || '',
      tarif: extraData?.tarif || 'R1M',
      daya: extraData?.daya || '900 VA',
      gardu: extraData?.gardu || 'BG-042',
      titikTumpu: extraData?.titikTumpu || 'Tiang B2-14',
      nomorMeterLama: extraData?.nomorMeter || '00000000000',
      jenisPenggantian: 'PENGGANTIAN_RUSAK_REGULAR',
      jenisGangguanApp: jenisGangguan,
      assignedTim: 'Tim Gamet 1',
      status: 'BELUM_DIGANTI',
      catatanSupervisor: `Kiriman WO dari Monitoring Laporan Gangguan APP (${jenisGangguan})`,
      uploadedAt: new Date().toISOString(),
      lamaGangguanHari: extraData?.lamaGangguanHari ?? 30,
      pemakaianRupiahPerBulan: 300000
    };
    setGametWorkOrders((prev) => [newGametWo, ...prev]);
    setActiveModule('gamet');
    setActiveGametTab('monitoring');
    showToast(`Laporan Gangguan IDPEL ${idpel} berhasil dikirim ke Monitoring WO & Tagsus Gamet!`);
  };

  const handleBatchConvertGangguanToGamet = (
    items: Array<{
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
    }>
  ) => {
    if (!items || items.length === 0) return;

    const newGametWos: GametWorkOrderTarget[] = items.map((item, index) => ({
      id: `WO-GMT-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      idpel: item.idpel,
      namaPelanggan: item.nama,
      alamatPelanggan: item.alamat,
      nomorTelepon: item.nomorTelepon || '',
      tarif: item.tarif || 'R1M',
      daya: item.daya || '900 VA',
      gardu: item.gardu || 'BG-042',
      titikTumpu: item.titikTumpu || 'Tiang B2-14',
      nomorMeterLama: item.nomorMeter || '00000000000',
      jenisPenggantian: 'PENGGANTIAN_RUSAK_REGULAR',
      jenisGangguanApp: item.jenisGangguan,
      assignedTim: item.assignedTim || 'Tim Gamet 1',
      status: 'BELUM_DIGANTI',
      catatanSupervisor: item.catatanSupervisor || `Konversi Kolektif dari Monitoring Laporan Gangguan APP (${item.jenisGangguan})`,
      uploadedAt: new Date().toISOString(),
      lamaGangguanHari: item.lamaGangguanHari ?? 30,
      pemakaianRupiahPerBulan: 300000
    }));

    setGametWorkOrders((prev) => [...newGametWos, ...prev]);

    const convertedRecordIds = items.map(i => i.recordId).filter(Boolean) as string[];
    if (convertedRecordIds.length > 0) {
      setGangguanRecords((prev) =>
        prev.map((r) =>
          convertedRecordIds.includes(r.id)
            ? { ...r, status: 'DALAM_PENANGANAN', catatanPenanganan: 'Dikonversi kolektif ke WO Gamet' }
            : r
        )
      );
    }

    setActiveModule('gamet');
    setActiveGametTab('monitoring');
    showToast(`Berhasil mengirim ${newGametWos.length} Target Work Order secara kolektif ke Gamet (Ganti Meter)!`);
  };

  const handleUpdateGametWorkOrder = (updatedWo: GametWorkOrderTarget) => {
    setGametWorkOrders((prev) => prev.map((w) => (w.id === updatedWo.id ? updatedWo : w)));
    showToast(`Penugasan petugas WO Gamet IDPEL ${updatedWo.idpel} diperbarui (${updatedWo.assignedTim || 'Belum Ditugaskan'}).`);
  };

  const pendingWoCount = workOrders.filter((w) => w.status === 'BELUM_DIGANTI').length;
  const pendingGametWoCount = gametWorkOrders.filter((w) => w.status === 'BELUM_DIGANTI').length;

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div
          key="login-screen"
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen bg-slate-950"
        >
          <LoginModal
            userAccounts={userAccounts}
            onLoginSuccess={handleLoginSuccess}
            isModal={false}
          />
        </motion.div>
      ) : (
        <motion.div
          key="simetri-app-main"
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased"
        >
          {/* Main Top Navigation Bar */}
          <Header
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            activeP2tlTab={activeP2tlTab}
            setActiveP2tlTab={setActiveP2tlTab}
            activeGangguanTab={activeGangguanTab}
            setActiveGangguanTab={setActiveGangguanTab}
            activeGametTab={activeGametTab}
            setActiveGametTab={setActiveGametTab}
            recordCount={records.length}
            pendingWoCount={pendingWoCount}
            gangguanCount={gangguanRecords.length}
            gametCount={gametRecords.length}
            pendingGametWoCount={pendingGametWoCount}
            customerCount={customerDatabase.length}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenLoginModal={() => setShowLoginModal(true)}
          />

          {/* Main Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Toast Notification Banner */}
            {toastMessage && (
              <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-cyan-500/50 flex items-center gap-3 animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="text-xs font-semibold">{toastMessage}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModule}_${activeP2tlTab}_${activeGangguanTab}_${activeGametTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="w-full"
              >
                {/* MODULE 0: ENGINE AI TANYA SIMETRI */}
                {activeModule === 'tanya-simetri' && (
                  <TanyaSimetri
                    records={records}
                    workOrders={workOrders}
                    gangguanRecords={gangguanRecords}
                    gametRecords={gametRecords}
                    gametWorkOrders={gametWorkOrders}
                    customerDatabase={customerDatabase}
                    currentUser={currentUser}
                  />
                )}

                {/* MODULE 1: PENYELESAIAN P2TL (YANBUNG) */}
                {activeModule === 'p2tl' && (
                  <>
                    {activeP2tlTab === 'supervisor' && (
                      <SupervisorManager
                        workOrders={workOrders}
                        onUploadWorkOrders={handleUploadWorkOrders}
                        onExecuteWo={handleSelectWoForExecution}
                      />
                    )}

                    {activeP2tlTab === 'form' && (
                      <FormReplacement
                        onSaveRecord={handleSaveRecord}
                        initialData={editingRecord}
                        onCancelEdit={() => setEditingRecord(null)}
                        workOrders={workOrders}
                        selectedWoFromParent={selectedWoForForm}
                      />
                    )}

                    {activeP2tlTab === 'history' && (
                      <HistoryList
                        records={records}
                        onSelectRecord={(rec) => setSelectedRecord(rec)}
                        onPrintRecord={(rec) => setPrintRecord(rec)}
                        onEditRecord={handleEditRecord}
                        onDeleteRecord={handleDeleteRecord}
                        onAddNew={() => {
                          setEditingRecord(null);
                          setSelectedWoForForm(null);
                          setActiveP2tlTab('form');
                        }}
                      />
                    )}

                    {activeP2tlTab === 'dashboard' && (
                      <DashboardStats
                        records={records}
                        onSelectRecord={(rec) => setSelectedRecord(rec)}
                        onGoToForm={() => {
                          setEditingRecord(null);
                          setSelectedWoForForm(null);
                          setActiveP2tlTab('form');
                        }}
                      />
                    )}
                  </>
                )}

                {/* MODULE 2: UPLOAD GANGGUAN APP (YANTEK & BILLMAN) */}
                {activeModule === 'gangguan' && (
                  <GangguanAppManager
                    records={gangguanRecords}
                    customerDatabase={customerDatabase}
                    activeSubTab={activeGangguanTab}
                    onSubTabChange={setActiveGangguanTab}
                    onAddRecord={handleAddGangguanRecord}
                    onAddBatchRecords={handleAddBatchGangguanRecords}
                    onUpdateStatus={handleUpdateGangguanStatus}
                    onDeleteRecord={handleDeleteGangguanRecord}
                    onConvertToWoP2tl={handleConvertGangguanToP2tlWo}
                    onConvertToGamet={handleConvertGangguanToGamet}
                    onBatchConvertToWoP2tl={handleBatchConvertGangguanToP2tlWo}
                    onBatchConvertToGamet={handleBatchConvertGangguanToGamet}
                    onAddCustomerMaster={handleAddCustomerMaster}
                    onBatchAddCustomerMaster={handleBatchAddCustomerMaster}
                    onUpsertCustomerMaster={handleUpsertCustomerMaster}
                    onDeleteCustomerMaster={handleDeleteCustomerMaster}
                  />
                )}

                {/* MODULE 3: GANTI KWH METER PRA-PASCA (GAMET) */}
                {activeModule === 'gamet' && (
                  <GametManager
                    records={gametRecords}
                    workOrders={gametWorkOrders}
                    customerDatabase={customerDatabase}
                    gangguanRecords={gangguanRecords}
                    activeSubTab={activeGametTab}
                    onSubTabChange={setActiveGametTab}
                    onAddRecord={handleAddGametRecord}
                    onAddBatchRecords={handleAddBatchGametRecords}
                    onDeleteRecord={handleDeleteGametRecord}
                    onAddWorkOrders={handleAddGametWorkOrders}
                    onUpdateWorkOrder={handleUpdateGametWorkOrder}
                    onDeleteWorkOrder={handleDeleteGametWorkOrder}
                  />
                )}

                {/* MODULE 4: MANAGEMENT USER (PEMBUATAN & PENDAFTARAN USER LOGIN) */}
                {activeModule === 'users' && (
                  <UserManager
                    userAccounts={userAccounts}
                    onAddUser={handleAddUserAccount}
                    onUpdateUser={handleUpdateUserAccount}
                    onDeleteUser={handleDeleteUserAccount}
                    currentUser={currentUser}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold">
              <Zap className="w-4 h-4 text-amber-400" />
              PT PLN (Persero) - Integrated Field Operations Portal
            </div>
            <p className="text-[11px] text-slate-500">
              SIMETRI (Sistem Ganti Meter Terintegrasi) • P2TL (Yanbung) • Gangguan APP (Yantek & Billman) • Ganti Meter (Gamet).
            </p>
          </footer>

          {/* Modal Detail & Inspection for P2TL */}
          <RecordDetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onPrint={(rec) => {
              setSelectedRecord(null);
              setPrintRecord(rec);
            }}
            onUpdateRecord={handleUpdateRecordFromModal}
          />

          {/* Printable Berita Acara (BA) Modal for P2TL */}
          <PrintBeritaAcara
            record={printRecord}
            onClose={() => setPrintRecord(null)}
          />

          {/* Interactive SIMETRI Login & Role Selector Modal */}
          {showLoginModal && (
            <LoginModal
              userAccounts={userAccounts}
              onLoginSuccess={handleLoginSuccess}
              onClose={() => setShowLoginModal(false)}
              isModal={true}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}


