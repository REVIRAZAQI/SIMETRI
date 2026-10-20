import React, { useState, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, Plus, CheckCircle2, Clock, 
  Trash2, Search, Building, UserCheck, ShieldAlert, FileText, ArrowRight, Download, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { WorkOrderTarget, JenisPelanggaran } from '../types';
import { JENIS_PELANGGARAN_MAP } from '../data/mockData';

interface SupervisorManagerProps {
  workOrders: WorkOrderTarget[];
  onAddWorkOrders: (newOrders: WorkOrderTarget[]) => void;
  onDeleteWorkOrder: (id: string) => void;
  onSelectWoForExecution: (wo: WorkOrderTarget) => void;
}

export const SupervisorManager: React.FC<SupervisorManagerProps> = ({
  workOrders,
  onAddWorkOrders,
  onDeleteWorkOrder,
  onSelectWoForExecution
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add_single' | 'upload_file'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM_DIGANTI' | 'SELESAI'>('ALL');

  // Single Add Form
  const [idpel, setIdpel] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [alamatPelanggan, setAlamatPelanggan] = useState('');
  const [tarif, setTarif] = useState('R1M');
  const [daya, setDaya] = useState('900 VA');
  const [gardu, setGardu] = useState('BG-042');
  const [titikTumpu, setTitikTumpu] = useState('Tiang B2-14');
  const [merkMeterLama, setMerkMeterLama] = useState('Itron');
  const [nomorMeterLama, setNomorMeterLama] = useState('');
  const [jenisPelanggaran, setJenisPelanggaran] = useState<JenisPelanggaran>('P2TL_KATEGORI_II');
  const [assignedTim, setAssignedTim] = useState('Tim Penormalan Alpha 01');
  const [catatanSupervisor, setCatatanSupervisor] = useState('');

  // CSV/Excel upload states & ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('File tidak berisi data.');
        }

        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error('File tidak memiliki sheet data yang valid.');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('File kosong atau tidak memiliki baris data.');
        }

        const parsedTargets: WorkOrderTarget[] = [];

        rawRows.forEach((row, index) => {
          const getVal = (...possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toUpperCase().replace(/[\s_]+/g, '');
              for (const pk of possibleKeys) {
                const cleanPk = pk.trim().toUpperCase().replace(/[\s_]+/g, '');
                if (cleanKey === cleanPk || cleanKey.includes(cleanPk)) {
                  return String(row[key] ?? '').trim();
                }
              }
            }
            return '';
          };

          const idpelVal = getVal('IDPEL', 'ID_PEL', 'IDPELANGGAN', 'NOIDPEL', 'ID');
          if (!idpelVal) return; // Ignore rows without IDPEL

          const namaVal = getVal('NAMA_PELANGGAN', 'NAMAPELANGGAN', 'NAMA', 'PELANGGAN') || 'Pelanggan Target P2TL';
          const alamatVal = getVal('ALAMAT_PELANGGAN', 'ALAMATPELANGGAN', 'ALAMAT', 'LOKASI') || 'Alamat Belum Terdaftar';
          const tarifVal = getVal('TARIF', 'GOLTARIF', 'TARIFDAYA') || 'R1M';
          const dayaVal = getVal('DAYA', 'KAPASITASDAYA', 'VA') || '900 VA';
          const garduVal = getVal('GARDU', 'NOGARDU', 'GARDUDISTRIBUSI') || '-';
          const titikTumpuVal = getVal('TITIK_TUMPU', 'TITIKTUMPU', 'TIANG', 'NOTIANG') || '-';
          const merkMeterLamaVal = getVal('MERK_METER_LAMA', 'MERKMETERLAMA', 'MERKMETER', 'MERK_LAMA', 'MERK') || '-';
          const noMeterLamaVal = getVal('NO_METER_LAMA', 'NOMETERLAMA', 'NOMOR_METER_LAMA', 'NOMETER', 'NO_METER') || '00000000000';

          let materialVal: JenisPelanggaran = 'P2TL_KATEGORI_II';
          const rawMaterial = getVal('MATERIAL', 'JENISPELANGGARAN', 'JENIS_PELANGGARAN', 'KATEGORI_P2TL', 'ALASAN', 'KATEGORI').toUpperCase();

          if (rawMaterial.includes('P1') || rawMaterial.includes('KATEGORI_I') || rawMaterial.includes('KATEGORI 1')) {
            materialVal = 'P2TL_KATEGORI_I';
          } else if (rawMaterial.includes('P3') || rawMaterial.includes('KATEGORI_III') || rawMaterial.includes('KATEGORI 3')) {
            materialVal = 'P2TL_KATEGORI_III';
          } else if (rawMaterial.includes('RUSAK') || rawMaterial.includes('PENGGANTIAN_RUSAK')) {
            materialVal = 'PROGRAM_PENGGANTIAN_RUSAK';
          } else if (rawMaterial.includes('TUA') || rawMaterial.includes('PERIODIK') || rawMaterial.includes('REAGING')) {
            materialVal = 'PROGRAM_PERIODIK_TUA';
          } else {
            materialVal = 'P2TL_KATEGORI_II';
          }

          const petugasVal = getVal('PETUGAS', 'TIM', 'TIMP2TL', 'TIM_PENORMALAN', 'ASSIGNED_TIM') || 'Tim Penormalan Alpha 01';
          const catatanVal = getVal('CATATAN', 'KETERANGAN', 'CATATAN_SUPERVISOR', 'NOTE') || 'Upload Excel Target Work Order';

          parsedTargets.push({
            id: `WO-${Date.now()}-${index + 1}`,
            idpel: idpelVal,
            namaPelanggan: namaVal,
            alamatPelanggan: alamatVal,
            tarif: tarifVal,
            daya: dayaVal,
            gardu: garduVal,
            titikTumpu: titikTumpuVal,
            merkMeterLama: merkMeterLamaVal,
            nomorMeterLama: noMeterLamaVal,
            jenisPelanggaran: materialVal,
            assignedTim: petugasVal,
            status: 'BELUM_DIGANTI',
            catatanSupervisor: catatanVal,
            uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
          });
        });

        if (parsedTargets.length === 0) {
          throw new Error('Tidak dapat menemukan baris IDPEL yang valid. Mohon pastikan file memuat kolom IDPEL.');
        }

        onAddWorkOrders(parsedTargets);
        setUploadSuccessMsg(`Berhasil mengimpor file "${file.name}"! ${parsedTargets.length} Target Work Order berhasil ditambahkan.`);
        setActiveTab('list');
      } catch (err: any) {
        console.error('Upload Error:', err);
        setUploadError(err.message || 'Gagal memproses file Excel/CSV.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setUploadError('Gagal membaca file dari penyimpanan lokal.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        IDPEL: '538900112233',
        NAMA_PELANGGAN: 'Budi Santoso (Toko Bangunan)',
        ALAMAT: 'Jl. Merdeka No. 10, Jakarta',
        TARIF: 'R1M',
        DAYA: '900 VA',
        GARDU: 'BG-012',
        TITIK_TUMPU: 'Tiang B1-04',
        MERK_METER_LAMA: 'Itron',
        NO_METER_LAMA: '14109823412',
        MATERIAL: 'P2TL_KATEGORI_II',
        PETUGAS: 'Tim Penormalan Alpha 01',
        CATATAN: 'Segel tera rusak / penggantian meter'
      },
      {
        IDPEL: '538900445566',
        NAMA_PELANGGAN: 'Ibu Ratna Juwita',
        ALAMAT: 'Jl. Melawai No. 25, Kebayoran Baru',
        TARIF: 'B1',
        DAYA: '2200 VA',
        GARDU: 'BM-005',
        TITIK_TUMPU: 'Tiang C2-11',
        MERK_METER_LAMA: 'Hexing',
        NO_METER_LAMA: '22876543210',
        MATERIAL: 'PROGRAM_PENGGANTIAN_RUSAK',
        PETUGAS: 'Tim Penormalan Bravo 02',
        CATATAN: 'Meter tua / buram / tidak berputar'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Target_WO");
    XLSX.writeFile(wb, "Template_Target_WO_PLN.xlsx");
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idpel.trim()) {
      alert('Harap isi IDPel');
      return;
    }

    const newWo: WorkOrderTarget = {
      id: `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      idpel: idpel.trim(),
      namaPelanggan: namaPelanggan.trim() || 'Pelanggan Target P2TL',
      alamatPelanggan: alamatPelanggan.trim() || 'Alamat Belum Terdaftar',
      tarif: tarif.trim() || 'R1M',
      daya: daya.trim() || '900 VA',
      gardu: gardu.trim() || '-',
      titikTumpu: titikTumpu.trim() || '-',
      merkMeterLama: merkMeterLama.trim() || '-',
      nomorMeterLama: nomorMeterLama.trim() || '00000000000',
      jenisPelanggaran,
      assignedTim,
      status: 'BELUM_DIGANTI',
      catatanSupervisor: catatanSupervisor.trim() || 'Target Penertiban / Penggantian Meter Lapangan',
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onAddWorkOrders([newWo]);
    // Reset form
    setIdpel('');
    setNamaPelanggan('');
    setAlamatPelanggan('');
    setNomorMeterLama('');
    setCatatanSupervisor('');
    setUploadSuccessMsg(`Berhasil menambah 1 Target Work Order IDPEL ${newWo.idpel}!`);
    setActiveTab('list');
  };

  // Preset Batch Upload Simulation (Upload 3 Target sekaligus)
  const handleSimulateBatchUpload = () => {
    const batchList: WorkOrderTarget[] = [
      {
        id: `WO-${Date.now()}-1`,
        idpel: '538400112233',
        namaPelanggan: 'Toko Kelontong Berkah (H. Syamsul)',
        alamatPelanggan: 'Jl. Radio Dalam No. 12, Kebayoran Baru',
        tarif: 'B1',
        daya: '3500 VA',
        gardu: 'KY-019',
        titikTumpu: 'Tiang B3-02',
        merkMeterLama: 'Itron',
        nomorMeterLama: '18273645091',
        jenisPelanggaran: 'P2TL_KATEGORI_II',
        assignedTim: 'Tim Penormalan Alpha 01',
        status: 'BELUM_DIGANTI',
        catatanSupervisor: 'Upload Batch Excel: Dugaan pengetesan segel tera rusak. Harap ganti meter baru.',
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      {
        id: `WO-${Date.now()}-2`,
        idpel: '538400445566',
        namaPelanggan: 'CV Media Cipta Graha',
        alamatPelanggan: 'Komp. Fatmawati Festival No. 8, Cilandak',
        tarif: 'B1',
        daya: '5500 VA',
        gardu: 'KY-042',
        titikTumpu: 'Tiang D1-11',
        merkMeterLama: 'Hexing',
        nomorMeterLama: '99887766554',
        jenisPelanggaran: 'PROGRAM_PENGGANTIAN_RUSAK',
        assignedTim: 'Tim Penormalan Bravo 02',
        status: 'BELUM_DIGANTI',
        catatanSupervisor: 'Upload Batch Excel: Meter rusak / mati total tidak berputar.',
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      {
        id: `WO-${Date.now()}-3`,
        idpel: '538500778899',
        namaPelanggan: 'Ibu Ratna Juwita',
        alamatPelanggan: 'Jl. Panglima Polim V No. 34, Melawai',
        tarif: 'R1M',
        daya: '900 VA',
        gardu: 'BM-005',
        titikTumpu: 'Tiang A2-07',
        merkMeterLama: 'Sanxing',
        nomorMeterLama: '33221100998',
        jenisPelanggaran: 'PROGRAM_PERIODIK_TUA',
        assignedTim: 'Tim Penormalan Charlie 03',
        status: 'BELUM_DIGANTI',
        catatanSupervisor: 'Upload Batch Excel: Re-aging kwh meter usia > 15 tahun.',
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      }
    ];

    onAddWorkOrders(batchList);
    setUploadSuccessMsg(`Berhasil mengunggah file Excel! 3 Target Work Order baru telah didaftarkan.`);
    setActiveTab('list');
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.idpel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.namaPelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.nomorMeterLama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.merkMeterLama && wo.merkMeterLama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (wo.gardu && wo.gardu.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (wo.titikTumpu && wo.titikTumpu.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || wo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = workOrders.length;
  const pendingCount = workOrders.filter((w) => w.status === 'BELUM_DIGANTI').length;
  const completedCount = workOrders.filter((w) => w.status === 'SELESAI').length;

  return (
    <div className="space-y-6">
      {/* Banner Supervisor */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold mb-2">
            <UserCheck className="w-3.5 h-3.5" /> MODE SUPERVISOR
          </span>
          <h2 className="text-xl font-black tracking-tight">Upload Work Order (WO) Pelanggan Target</h2>
          <p className="text-xs text-slate-300 mt-1">
            Supervisor mengunggah data target IDPEL Work Order, kemudian petugas di lapangan tinggal memilih target & menginput Ganti Meter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Daftar Target ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('upload_file')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'upload_file'
                ? 'bg-amber-500 text-slate-950 font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload WO (Excel / CSV)
          </button>
          <button
            onClick={() => setActiveTab('add_single')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'add_single'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" /> Tambah 1 Target
          </button>
        </div>
      </div>

      {/* Alert Success Banner */}
      {uploadSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-emerald-800 hover:text-emerald-950 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Total Target Upload Supervisor</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCount} Target</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-700 font-bold uppercase">Belum Diganti (Proses Lapangan)</span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount} IDPEL</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-bold uppercase">Selesai Diganti Petugas</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">{completedCount} IDPEL</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TAB 1: LIST TARGET WORK ORDERS */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Cari IDPEL / Nama Pelanggan / Unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                onClick={() => setStatusFilter('BELUM_DIGANTI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'BELUM_DIGANTI' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'
                }`}
              >
                Belum Diganti ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('SELESAI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'SELESAI' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                Selesai ({completedCount})
              </button>
            </div>
          </div>

          {/* Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">IDPEL & Nama</th>
                  <th className="p-3">Tarif & Daya</th>
                  <th className="p-3">Gardu / Tiang</th>
                  <th className="p-3">Meter Lama (Merk & No)</th>
                  <th className="p-3">Kedapatan & Material</th>
                  <th className="p-3">Petugas Penormalan</th>
                  <th className="p-3">Status WO</th>
                  <th className="p-3 text-right">Aksi Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                      Tidak ada data target Work Order yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((wo) => {
                    const katInfo = JENIS_PELANGGARAN_MAP[wo.jenisPelanggaran];
                    return (
                      <tr key={wo.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 space-y-0.5">
                          <strong className="font-mono text-sm text-blue-900 block">{wo.idpel}</strong>
                          <span className="font-semibold text-slate-900 block">{wo.namaPelanggan}</span>
                          <span className="text-[10px] text-slate-500 block line-clamp-1">{wo.alamatPelanggan}</span>
                        </td>
                        <td className="p-3 space-y-0.5">
                          <span className="font-bold text-slate-800 block">{wo.tarif} / {wo.daya}</span>
                        </td>
                        <td className="p-3 space-y-0.5">
                          {(wo.gardu || wo.titikTumpu) ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {wo.gardu && (
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                  Gardu: {wo.gardu}
                                </span>
                              )}
                              {wo.titikTumpu && (
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-200">
                                  Tiang: {wo.titikTumpu}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 space-y-0.5">
                          <span className="font-bold text-slate-700 block text-xs">{wo.merkMeterLama || '-'}</span>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold border border-slate-200 text-xs inline-block">
                            {wo.nomorMeterLama}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border ${katInfo?.bg} ${katInfo?.color}`}>
                            {katInfo?.title}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">{wo.assignedTim || 'Tim Alpha'}</span>
                          <span className="text-[10px] text-slate-400 block">Diupload: {wo.uploadedAt}</span>
                        </td>
                        <td className="p-3">
                          {wo.status === 'BELUM_DIGANTI' ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> BELUM DIGANTI
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> SELESAI DIGANTI
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {wo.status === 'BELUM_DIGANTI' ? (
                              <button
                                onClick={() => onSelectWoForExecution(wo)}
                                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm transition"
                              >
                                Eksekusi Field <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onSelectWoForExecution(wo)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition"
                              >
                                Lihat Data
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteWorkOrder(wo.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Hapus Target"
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
      )}

      {/* TAB 2: UPLOAD EXCEL / CSV REAL & SIMULATION */}
      {activeTab === 'upload_file' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Upload File Target Work Order (Excel / CSV)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Unggah file Spreadsheet (.XLSX / .CSV) berisi daftar target pelanggan untuk ditindaklanjuti oleh Petugas Penormalan.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-300 shrink-0 self-start md:self-center"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Download Template Excel
            </button>
          </div>

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Gagal Mengimpor File</strong>
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`p-10 border-2 border-dashed rounded-2xl text-center space-y-4 cursor-pointer transition ${
              dragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
            }`}
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                {isProcessing ? 'Membaca & Memproses File Excel...' : 'Klik atau Tarik & Lepas File .XLSX / .CSV Di Sini'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Format file didukung: Excel (.xlsx, .xls) atau Comma Separated (.csv)
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Pilih File Excel / CSV dari Komputer
              </button>

              <button
                type="button"
                onClick={handleSimulateBatchUpload}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                Simulasi Import (3 Sample)
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
            <h5 className="font-bold text-slate-800">Petunjuk Format Kolom Excel:</h5>
            <p className="font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto text-slate-800">
              IDPEL | NAMA_PELANGGAN | ALAMAT | TARIF | DAYA | GARDU | TITIK_TUMPU | MERK_METER_LAMA | NO_METER_LAMA | MATERIAL
            </p>
            <p>
              Sistem akan otomatis mengenali variasi nama header (misal <em>IDPEL / ID / ID_PELANGGAN</em>) dan memetakan data target secara otomatis.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: SINGLE ADD FORM */}
      {activeTab === 'add_single' && (
        <form onSubmit={handleSingleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-700" /> Tambah 1 Target Work Order (Manual)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Input identitas awal pelanggan target P2TL / Penormalan untuk dikirim ke Petugas Lapangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">IDPEL (ID Pelanggan) *</label>
              <input
                type="text"
                required
                placeholder="Contoh: 538100998877"
                value={idpel}
                onChange={(e) => setIdpel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama Pelanggan Target</label>
              <input
                type="text"
                placeholder="Nama Pemilik"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Alamat Bangunan Pelanggan</label>
              <input
                type="text"
                placeholder="Jalan, RT/RW, Kelurahan"
                value={alamatPelanggan}
                onChange={(e) => setAlamatPelanggan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tarif</label>
              <input
                type="text"
                placeholder="Contoh: R1M"
                value={tarif}
                onChange={(e) => setTarif(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Daya</label>
              <input
                type="text"
                placeholder="Contoh: 900 VA"
                value={daya}
                onChange={(e) => setDaya(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Gardu</label>
              <input
                type="text"
                placeholder="Contoh: BG-042"
                value={gardu}
                onChange={(e) => setGardu(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Titik Tumpu</label>
              <input
                type="text"
                placeholder="Contoh: Tiang B2-14"
                value={titikTumpu}
                onChange={(e) => setTitikTumpu(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Merk Meter Lama</label>
              <input
                type="text"
                placeholder="Contoh: Itron / Hexing / Sanxing"
                value={merkMeterLama}
                onChange={(e) => setMerkMeterLama(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nomor Meter Lama (Eksisting)</label>
              <input
                type="text"
                placeholder="Nomor meter lama"
                value={nomorMeterLama}
                onChange={(e) => setNomorMeterLama(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Kedapatan & Material *</label>
              <select
                value={jenisPelanggaran}
                onChange={(e) => setJenisPelanggaran(e.target.value as JenisPelanggaran)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="P1 (MCB + Segel)">P1 (MCB + Segel)</option>
                <option value="P2 (Meter + Segel)">P2 (Meter + Segel)</option>
                <option value="P3 (MCB + Meter + Segel)">P3 (MCB + Meter + Segel)</option>
                <option value="P4">P4</option>
                <option value="K2 (Meter + Segel)">K2 (Meter + Segel)</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Petugas Penormalan</label>
              <input
                type="text"
                value={assignedTim}
                onChange={(e) => setAssignedTim(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Catatan Supervisor</label>
              <textarea
                rows={2}
                value={catatanSupervisor}
                onChange={(e) => setCatatanSupervisor(e.target.value)}
                placeholder="Petunjuk khusus untuk petugas di lapangan..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Simpan Target
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
