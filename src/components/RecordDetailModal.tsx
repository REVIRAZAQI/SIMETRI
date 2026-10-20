import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, Printer, Sparkles, MapPin, Calendar, Clock, 
  User, Shield, Gauge, Tag, ZoomIn, RotateCcw, Building 
} from 'lucide-react';
import { ReplacementRecord, MeterPhoto, VerificationResult } from '../types';
import { JENIS_PELANGGARAN_MAP } from '../data/mockData';

interface RecordDetailModalProps {
  record: ReplacementRecord | null;
  onClose: () => void;
  onPrint: (record: ReplacementRecord) => void;
  onUpdateRecord: (updatedRecord: ReplacementRecord) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onPrint,
  onUpdateRecord
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<MeterPhoto | null>(null);
  const [isReVerifying, setIsReVerifying] = useState(false);

  if (!record) return null;

  const activePhoto = selectedPhoto || record.photos[0] || null;
  const jenisInfo = JENIS_PELANGGARAN_MAP[record.jenisPelanggaran] || {
    title: record.jenisPelanggaran,
    color: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-200'
  };

  const runReVerification = async () => {
    setIsReVerifying(true);
    try {
      const payloadPhotos = record.photos.map((p) => ({
        data: p.dataUrl,
        label: p.title
      }));

      const res = await fetch('/api/verify-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idpel: record.idpel,
          stanCabut: record.stanCabut,
          nomorMeterBaru: record.nomorMeterBaru,
          jenisPelanggaran: record.jenisPelanggaran,
          photos: payloadPhotos
        })
      });

      const data: VerificationResult = await res.json();
      data.verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const updated: ReplacementRecord = {
        ...record,
        verificationStatus: data.verified ? 'VERIFIED' : 'REVISION_NEEDED',
        aiVerification: data,
        updatedAt: new Date().toISOString()
      };

      onUpdateRecord(updated);
    } catch (err) {
      console.error('Re-verification error:', err);
    } finally {
      setIsReVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold">
              <Shield className="w-4 h-4" /> BERITA ACARA: {record.noBeritaAcara}
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              Verifikasi Penggantian Meter - IDPEL {record.idpel}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(record)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Cetak BA
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metric Highlight Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Pelanggan</span>
              <strong className="text-slate-900 font-bold text-sm block truncate">{record.namaPelanggan}</strong>
              <span className="text-[10px] text-slate-600 font-semibold">{record.tarif} / {record.daya}</span>
              {(record.gardu || record.titikTumpu) && (
                <div className="text-[10px] text-slate-600 mt-1 font-semibold">
                  {record.gardu && <span>Gardu: {record.gardu}</span>}
                  {record.gardu && record.titikTumpu && <span> • </span>}
                  {record.titikTumpu && <span>Tiang: {record.titikTumpu}</span>}
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-500 block">STAN CABUT</span>
              <strong className="text-amber-900 font-mono font-bold text-base block">{record.stanCabut} kWh</strong>
              <span className="text-[10px] text-slate-500 font-medium">Lama: {record.merkMeterLama ? `${record.merkMeterLama} - ` : ''}{record.nomorMeterLama}</span>
            </div>

            <div>
              <span className="text-slate-500 block">NOMOR METER BARU</span>
              <strong className="text-blue-900 font-mono font-bold text-base block">{record.nomorMeterBaru}</strong>
              <span className="text-[10px] text-slate-400">{record.merkMeterBaru}</span>
            </div>

            <div>
              <span className="text-slate-500 block">TANGGAL & TIM</span>
              <strong className="text-slate-900 font-bold block">{record.tanggalGanti}</strong>
              <span className="text-[10px] text-slate-500">{record.timP2TL}</span>
            </div>
          </div>

          {/* Side by side: Photo Inspection & AI Audit Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Photo Inspection Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4 text-cyan-600" /> Inspek Dokumentasi Foto Lapangan
              </h4>

              {activePhoto ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-300 shadow-md">
                    <img
                      src={activePhoto.dataUrl}
                      alt={activePhoto.title}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xs text-white p-2.5 text-[11px] flex justify-between items-center">
                      <span className="font-semibold text-cyan-300">{activePhoto.title}</span>
                      <span className="font-mono text-slate-300">{activePhoto.timestamp}</span>
                    </div>
                  </div>

                  {/* Thumbnail gallery selector */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {record.photos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPhoto(p)}
                        className={`relative rounded-lg overflow-hidden w-16 h-12 shrink-0 border-2 transition ${
                          activePhoto.id === p.id ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={p.dataUrl} alt={p.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border rounded-xl text-slate-400 text-xs">
                  Tidak ada foto dokumentasi.
                </div>
              )}
            </div>

            {/* AI Audit & Technical Details Column */}
            <div className="space-y-4">
              {/* AI Verification Box */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-2xl space-y-3 border border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-400" /> AI Multimodal Inspection
                  </span>

                  <button
                    onClick={runReVerification}
                    disabled={isReVerifying}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition"
                  >
                    <RotateCcw className={`w-3 h-3 ${isReVerifying ? 'animate-spin' : ''}`} />
                    {isReVerifying ? 'Audit Ulang...' : 'Audit AI Ulang'}
                  </button>
                </div>

                {record.aiVerification ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-blue-800/80 pb-2">
                      <span className="text-slate-300">Status Validasi Foto:</span>
                      <strong className={record.aiVerification.verified ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {record.aiVerification.verified ? 'VERIFIED VALID (100%)' : 'PERLU ATENSI'}
                      </strong>
                    </div>

                    <p className="text-slate-200 text-xs leading-relaxed">
                      {record.aiVerification.notes}
                    </p>

                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-lg font-mono text-[11px] text-cyan-200 border border-blue-900/60">
                      <div>Terdeteksi Stan: <span className="text-white font-bold">{record.aiVerification.detectedStanCabut || '-'}</span></div>
                      <div>Terdeteksi Meter: <span className="text-white font-bold">{record.aiVerification.detectedNomorMeterBaru || '-'}</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">Belum diaudit AI. Klik tombol diatas untuk menjalankan audit otomatis.</p>
                )}
              </div>

              {/* Detail Info list */}
              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Tarif / Daya:</span>
                  <span className="font-bold text-slate-900">{record.tarif} / {record.daya}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Merk Meter Lama:</span>
                  <span className="font-bold text-slate-900">{record.merkMeterLama || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Material:</span>
                  <span className={`font-semibold ${jenisInfo.color}`}>{jenisInfo.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Petugas Penormalan:</span>
                  <span className="font-bold text-slate-900">{record.timP2TL}</span>
                </div>
                {record.catatanPetugas && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Catatan Petugas:</span>
                    <p className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-[11px] italic">
                      "{record.catatanPetugas}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
