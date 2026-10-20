import React, { useState } from 'react';
import { 
  Search, Filter, Eye, Printer, Edit2, Trash2, CheckCircle2, 
  Clock, AlertTriangle, Download, FileSpreadsheet, Sparkles, Building, Gauge, Calendar 
} from 'lucide-react';
import { ReplacementRecord, VerificationStatus } from '../types';
import { JENIS_PELANGGARAN_MAP } from '../data/mockData';

interface HistoryListProps {
  records: ReplacementRecord[];
  onSelectRecord: (record: ReplacementRecord) => void;
  onPrintRecord: (record: ReplacementRecord) => void;
  onEditRecord: (record: ReplacementRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddNew: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  records,
  onSelectRecord,
  onPrintRecord,
  onEditRecord,
  onDeleteRecord,
  onAddNew
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [jenisFilter, setJenisFilter] = useState<string>('ALL');

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.idpel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.namaPelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.nomorMeterBaru.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.noBeritaAcara.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || rec.verificationStatus === statusFilter;
    const matchesJenis = jenisFilter === 'ALL' || rec.jenisPelanggaran === jenisFilter;

    return matchesSearch && matchesStatus && matchesJenis;
  });

  const exportToCsv = () => {
    if (records.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    const headers = [
      "No BA", "IDPEL", "Nama Pelanggan", "Alamat", "Tarif", "Daya", 
      "Stan Cabut (kWh)", "Merk Meter Lama", "Nomor Meter Lama", "Nomor Meter Baru", "Merk Meter Baru", 
      "Tanggal Ganti", "Waktu Ganti", "Petugas Penormalan", "Material", "Status Verifikasi"
    ];

    const rows = records.map(r => [
      `"${r.noBeritaAcara}"`,
      `"${r.idpel}"`,
      `"${r.namaPelanggan}"`,
      `"${r.alamatPelanggan.replace(/"/g, '""')}"`,
      `"${r.tarif}"`,
      `"${r.daya}"`,
      `"${r.stanCabut}"`,
      `"${r.merkMeterLama || ''}"`,
      `"${r.nomorMeterLama}"`,
      `"${r.nomorMeterBaru}"`,
      `"${r.merkMeterBaru}"`,
      `"${r.tanggalGanti}"`,
      `"${r.waktuGanti || ''}"`,
      `"${r.timP2TL}"`,
      `"${r.jenisPelanggaran}"`,
      `"${r.verificationStatus}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Penggantian_KWh_Meter_P2TL_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Audit AI
          </span>
        );
      case 'REJECTED':
      case 'REVISION_NEEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Perlu Revisi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Riwayat Penggantian KWh Meter P2TL</h3>
            <p className="text-xs text-slate-500">
              Total {filteredRecords.length} data tersimpan dalam sistem.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={exportToCsv}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV / Excel
            </button>
            <button
              onClick={onAddNew}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            >
              + Input Ganti Meter Baru
            </button>
          </div>
        </div>

        {/* Search & Select Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="Cari IDPEL, Nama Pelanggan, Nomor Meter Baru, No BA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status Verifikasi</option>
              <option value="VERIFIED">Terverifikasi Valid</option>
              <option value="PENDING">Menunggu Audit AI</option>
              <option value="REVISION_NEEDED">Perlu Revisi / Ditolak</option>
            </select>
          </div>

          {/* Jenis Pelanggaran Filter */}
          <div>
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kategori P2TL</option>
              {Object.entries(JENIS_PELANGGARAN_MAP).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Tidak ada data penggantian meter ditemukan</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau klik tombol '+ Input Ganti Meter Baru' untuk menambah pendataan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">IDPEL & Pelanggan</th>
                  <th className="px-4 py-3.5">STAN CABUT</th>
                  <th className="px-4 py-3.5">NOMOR METER BARU</th>
                  <th className="px-4 py-3.5">TANGGAL GANTI</th>
                  <th className="px-4 py-3.5">DOKUMENTASI FOTO</th>
                  <th className="px-4 py-3.5">VERIFIKASI LAPANGAN</th>
                  <th className="px-4 py-3.5 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const jenisInfo = JENIS_PELANGGARAN_MAP[rec.jenisPelanggaran] || {
                    title: rec.jenisPelanggaran,
                    color: 'text-slate-700',
                    bg: 'bg-slate-100 border-slate-200'
                  };

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      {/* IDPEL & Customer */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-sm text-blue-900">{rec.idpel}</div>
                        <div className="font-semibold text-slate-900 text-xs">{rec.namaPelanggan}</div>
                        <div className="text-[10px] text-slate-500 max-w-xs truncate">{rec.alamatPelanggan}</div>
                        <div className="text-[10px] text-slate-600 font-semibold mt-0.5">Tarif/Daya: {rec.tarif} / {rec.daya}</div>
                        <div className="mt-1">
                          <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded border ${jenisInfo.bg} ${jenisInfo.color}`}>
                            {jenisInfo.title}
                          </span>
                        </div>
                      </td>

                      {/* STAN CABUT */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-amber-900 text-sm bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 inline-block">
                          {rec.stanCabut} <span className="text-[10px] text-slate-500 font-sans">kWh</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          Meter Lama: {rec.merkMeterLama ? `${rec.merkMeterLama} - ` : ''}{rec.nomorMeterLama}
                        </div>
                      </td>

                      {/* NOMOR METER BARU */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-blue-900 text-sm bg-blue-50 px-2 py-1 rounded-lg border border-blue-200/80 inline-block">
                          {rec.nomorMeterBaru}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{rec.merkMeterBaru}</div>
                      </td>

                      {/* TANGGAL GANTI */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {rec.tanggalGanti}
                        </div>
                        <div className="text-[10px] text-slate-500">{rec.waktuGanti || '10:00'} WIB</div>
                        <div className="text-[10px] text-slate-400">{rec.timP2TL}</div>
                      </td>

                      {/* FOTO DOKUMENTASI */}
                      <td className="px-4 py-3">
                        <div className="flex -space-x-2 overflow-hidden">
                          {rec.photos.map((p, idx) => (
                            <img
                              key={p.id || idx}
                              src={p.dataUrl}
                              alt={p.title}
                              className="inline-block h-9 w-9 rounded-lg object-cover ring-2 ring-white shadow-sm"
                              title={p.title}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                          {rec.photos.length} Foto Terlampir
                        </div>
                      </td>

                      {/* STATUS VERIFIKASI */}
                      <td className="px-4 py-3">
                        {getStatusBadge(rec.verificationStatus)}
                        {rec.aiVerification && (
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Skor: {Math.round(rec.aiVerification.confidenceScore * 100)}%
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectRecord(rec)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Lihat Detail & Foto"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onPrintRecord(rec)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Cetak Berita Acara P2TL"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditRecord(rec)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Hapus data penggantian meter IDPEL ${rec.idpel}?`)) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
