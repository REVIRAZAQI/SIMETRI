import React from 'react';
import { Printer, X, Download, ShieldCheck, FileCheck } from 'lucide-react';
import { ReplacementRecord } from '../types';

interface PrintBeritaAcaraProps {
  record: ReplacementRecord | null;
  onClose: () => void;
}

export const PrintBeritaAcara: React.FC<PrintBeritaAcaraProps> = ({ record, onClose }) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Floating Action Controls (Hidden on Print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl transition"
        >
          <Printer className="w-4 h-4" /> Cetak / Simpan PDF
        </button>
        <button
          onClick={onClose}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-xl transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-3xl w-full p-8 md:p-10 my-auto overflow-y-auto print:max-w-none print:w-full print:shadow-none print:p-0 print:my-0">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-sheet, .print-sheet * { visibility: visible; }
            .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        <div className="print-sheet space-y-6 text-xs text-slate-900">
          {/* Header PLN Official */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 font-black text-xl flex items-center justify-center rounded-lg tracking-tighter">
                PLN
              </div>
              <div>
                <h2 className="font-extrabold text-sm tracking-wide text-slate-900">PT PLN (PERSERO)</h2>
                <h3 className="font-bold text-xs text-slate-700 uppercase">PENERTIBAN PEMAKAIAN TENAGA LISTRIK (P2TL)</h3>
                <p className="text-[10px] text-slate-500">PENORMALAN KWH METER PELANGGAN</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded border border-slate-300">
                P2TL-BA-2026
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Lampiran Dokumen Resmi PLN</p>
            </div>
          </div>

          {/* Title Document */}
          <div className="text-center space-y-1">
            <h1 className="text-base font-black uppercase underline tracking-wider">
              BERITA ACARA PENGGANTIAN KWH METER P2TL
            </h1>
            <p className="font-mono text-xs font-bold text-blue-900">
              NOMOR: {record.noBeritaAcara}
            </p>
          </div>

          <p className="text-xs leading-relaxed">
            Pada hari ini <strong>{new Date(record.tanggalGanti).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, 
            telah dilaksanakan pekerjaan pencabutan dan penggantian unit KWh Meter P2TL pada instalasi pelanggan berikut:
          </p>

          {/* Section 1: Data Pelanggan */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300 uppercase text-[11px] text-slate-800">
              I. IDENTITAS PELANGGAN
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">ID Pelanggan (IDPEL):</span>
                <strong className="font-mono text-sm text-blue-950">{record.idpel}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Nama Pelanggan:</span>
                <strong className="font-bold">{record.namaPelanggan}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Tarif / Daya:</span>
                <strong className="font-medium">{record.tarif} / {record.daya}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Material / Penggantian:</span>
                <strong className="font-medium">{record.jenisPelanggaran.replace(/_/g, ' ')}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Gardu:</span>
                <strong className="font-medium">{record.gardu || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Titik Tumpu:</span>
                <strong className="font-medium">{record.titikTumpu || '-'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Alamat Bangunan:</span>
                <span className="font-medium">{record.alamatPelanggan}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Data Teknis Penggantian (Old vs New) */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300 uppercase text-[11px] text-slate-800">
              II. DATA TEKNIS KWH METER LAMA DAN BARU
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-300 text-xs">
              {/* Meter Lama (Cabut) */}
              <div className="p-3 space-y-1.5 bg-amber-50/30">
                <h4 className="font-bold text-amber-900 underline text-xs">KWH METER LAMA (DICABUT)</h4>
                <div>Merk Meter: <strong>{record.merkMeterLama || '-'}</strong></div>
                <div>Nomor Meter: <strong className="font-mono">{record.nomorMeterLama}</strong></div>
                <div>STAN CABUT: <strong className="font-mono text-amber-900 bg-amber-100 px-1 rounded">{record.stanCabut} kWh</strong></div>
                <div>Kondisi Fisik: <span>Segel dicabut / Dites P2TL</span></div>
              </div>

              {/* Meter Baru (Pasang) */}
              <div className="p-3 space-y-1.5 bg-blue-50/30">
                <h4 className="font-bold text-blue-900 underline text-xs">KWH METER BARU (DIPASANG)</h4>
                <div>NOMOR METER BARU: <strong className="font-mono text-blue-900">{record.nomorMeterBaru}</strong></div>
                <div>Merk / Tipe: <strong>{record.merkMeterBaru}</strong></div>
                <div>Stan Awal: <strong className="font-mono">{record.stanAwalBaru} kWh</strong></div>
              </div>
            </div>
          </div>

          {/* Section 3: Catatan & Verifikasi AI */}
          <div className="border border-slate-300 rounded-lg p-3 space-y-1">
            <h4 className="font-bold uppercase text-[11px] text-slate-800">III. CATATAN PETUGAS & VERIFIKASI LAPANGAN</h4>
            <p className="text-slate-700 italic">"{record.catatanPetugas || 'Tidak ada catatan khusus.'}"</p>
            {record.aiVerification && (
              <p className="text-[10px] text-emerald-800 font-semibold pt-1 border-t border-slate-200">
                ✓ Otentikasi Digital AI: Verifikasi foto dokumen valid ({Math.round(record.aiVerification.confidenceScore * 100)}% match pada timestamp {record.aiVerification.verifiedAt}).
              </p>
            )}
          </div>

          {/* Section 4: Lampiran Foto Dokumentasi */}
          <div className="border border-slate-300 rounded-lg p-3 space-y-2">
            <h4 className="font-bold uppercase text-[11px] text-slate-800">IV. DOKUMENTASI FOTO LAPANGAN TERLAMPIR</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {record.photos.map((p, idx) => (
                <div key={p.id || idx} className="border border-slate-200 rounded p-1 bg-slate-50 text-[10px]">
                  <img src={p.dataUrl} alt={p.title} className="w-full h-28 object-cover rounded mb-1" />
                  <div className="font-bold truncate">{p.title}</div>
                  <div className="text-slate-500 font-mono text-[9px]">{p.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Signature Zone */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <p>Pelanggan / Saksi Lapangan,</p>
              <div className="border-b border-slate-900 w-48 mx-auto"></div>
              <p className="font-bold">{record.namaPelanggan}</p>
            </div>

            <div className="space-y-12">
              <p>Petugas Pelaksana P2TL PLN,</p>
              <div className="border-b border-slate-900 w-48 mx-auto"></div>
              <p className="font-bold">{record.namaPetugas} ({record.timP2TL})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
