import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, ExternalLink,
  Download, Database, Copy, Check, Eye, Layers, ArrowRight, X, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { CustomerMasterItem } from '../types';
import {
  DEFAULT_GOOGLE_SHEETS_URL,
  fetchGoogleSheetsCsv,
  fetchAllCustomersFromServer,
  parseSpreadsheetToCustomerList,
  ParseResult
} from '../utils/googleSheetsSync';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (customers: CustomerMasterItem[], replaceAll: boolean) => void;
  currentCustomerCount: number;
}

const STORAGE_KEY_CUSTOM_SHEET_URL = 'simetri_gsheet_url';
const STORAGE_KEY_LAST_SYNC_TIME = 'simetri_gsheet_last_sync';

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  currentCustomerCount,
}) => {
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_SHEET_URL) || DEFAULT_GOOGLE_SHEETS_URL;
  });

  const [syncMode, setSyncMode] = useState<'UPSERT' | 'REPLACE'>('UPSERT');
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [manualCsvInput, setManualCsvInput] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC_TIME) || null;
  });

  const [previewCustomers, setPreviewCustomers] = useState<CustomerMasterItem[]>([]);
  const [totalDetectedCount, setTotalDetectedCount] = useState<number>(0);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetchAndPreview = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    setParseResult(null);
    setPreviewCustomers([]);
    setTotalDetectedCount(0);

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SHEET_URL, sheetUrl.trim());

      const res = await fetchGoogleSheetsCsv(sheetUrl, syncMode === 'REPLACE');
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal mengambil data dari Google Sheets.');
        setIsLoading(false);
        return;
      }

      const total = res.totalCount || 0;
      const samples = res.sampleCustomers || [];
      const headers = res.detectedHeaders || [];

      if (total === 0) {
        setErrorMsg(
          'Tidak ditemukan data pelanggan valid. Pastikan terdapat kolom IDPEL / ID_PELANGGAN pada lembar spreadsheet.'
        );
        setIsLoading(false);
        return;
      }

      setTotalDetectedCount(total);
      setPreviewCustomers(samples);
      setDetectedHeaders(headers);

      // Create a virtual parseResult for preview display
      setParseResult({
        customers: samples,
        totalRows: total,
        parsedCount: total,
        skippedCount: 0,
        detectedColumns: headers,
      });

      const timeStr = res.lastSync || new Date().toLocaleString('id-ID');
      setLastSyncTime(timeStr);
      localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, timeStr);

      setSuccessMsg(
        `Berhasil menyinkronkan ${total.toLocaleString('id-ID')} data pelanggan dari Google Sheets!`
      );
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Terjadi kesalahan sistem saat memproses Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessManualPaste = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!manualCsvInput.trim()) {
      setErrorMsg('Harap tempel teks CSV atau tabel data terlebih dahulu.');
      return;
    }

    try {
      const parsed = parseSpreadsheetToCustomerList(manualCsvInput.trim());
      if (parsed.customers.length === 0) {
        setErrorMsg(
          'Tidak ditemukan data pelanggan. Pastikan baris header mengandung kolom IDPEL / ID_PELANGGAN.'
        );
        return;
      }

      setParseResult(parsed);
      setPreviewCustomers(parsed.customers);
      setTotalDetectedCount(parsed.customers.length);
      setDetectedHeaders(parsed.detectedColumns);
      setSuccessMsg(`Berhasil mem-parsing ${parsed.customers.length.toLocaleString('id-ID')} data pelanggan dari teks input!`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Format teks tidak valid.');
    }
  };

  const handleApplyToDatabase = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const nowStr = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, nowStr);
    setLastSyncTime(nowStr);

    try {
      if (activeTab === 'url') {
        // Fetch all 92,148 records from server to apply full dataset to client
        const allRes = await fetchAllCustomersFromServer();
        if (allRes.success && allRes.customers.length > 0) {
          onApplyData(allRes.customers, syncMode === 'REPLACE');
          onClose();
          return;
        }
      }

      // Fallback or manual paste mode
      if (previewCustomers && previewCustomers.length > 0) {
        onApplyData(previewCustomers, syncMode === 'REPLACE');
      }
      onClose();
    } catch (e: any) {
      console.error(e);
      if (previewCustomers && previewCustomers.length > 0) {
        onApplyData(previewCustomers, syncMode === 'REPLACE');
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaultUrl = () => {
    setSheetUrl(DEFAULT_GOOGLE_SHEETS_URL);
    localStorage.setItem(STORAGE_KEY_CUSTOM_SHEET_URL, DEFAULT_GOOGLE_SHEETS_URL);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
                Update Database Pelanggan via Google Sheets
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Sinkronisasi data master pelanggan langsung dari tautan Google Spreadsheet PLN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Method Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('url')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Link Google Spreadsheet Langsung
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Copy className="w-4 h-4" /> Tempel Data / CSV Manual (Alternatif)
            </button>
          </div>

          {activeTab === 'url' ? (
            <div className="space-y-4">
              {/* URL Input Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    Tautan Google Spreadsheet Master:
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetDefaultUrl}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Reset ke Link Default
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Tersalin' : 'Salin Link'}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-24"
                  />
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2 top-2 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    Buka <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Pastikan akses link di Google Sheets diset ke <strong>"Anyone with the link can view"</strong>.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchAndPreview}
                    disabled={isLoading || !sheetUrl.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Mengambil Data...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Tarik & Preview Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Manual Paste Tab */
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <label className="text-xs font-bold text-slate-700 block">
                Tempel data CSV atau salinan sel dari Google Sheets / Excel di sini:
              </label>
              <textarea
                rows={5}
                value={manualCsvInput}
                onChange={(e) => setManualCsvInput(e.target.value)}
                placeholder="IDPEL, NAMA, ALAMAT, TARIF, DAYA, GARDU, TITIK_TUMPU, MERK_METER, NOMOR_METER&#10;538900112233, Bambang Tri, Jl. Pemuda 12, R1M, 900 VA, SMG-01, Tiang A1, Itron, 142389102"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessManualPaste}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Parsing Teks
                </button>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold">Gagal Mengambil Data</p>
                <p className="text-rose-700 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-bold">{successMsg}</span>
              </div>
              {lastSyncTime && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Sinkron Terakhir: {lastSyncTime}
                </span>
              )}
            </div>
          )}

          {/* Data Preview Table */}
          {parseResult && parseResult.customers.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 border border-blue-200 p-4 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    Preview Data Hasil Pembacaan Spreadsheet ({totalDetectedCount > 0 ? totalDetectedCount.toLocaleString('id-ID') : parseResult.customers.length} Pelanggan)
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Total baris dibaca: {totalDetectedCount > 0 ? totalDetectedCount.toLocaleString('id-ID') : parseResult.totalRows} baris • Kolom terdeteksi: {detectedHeaders.slice(0, 8).join(', ')}
                  </p>
                </div>

                {/* Upsert vs Replace Selector */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-blue-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSyncMode('UPSERT')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      syncMode === 'UPSERT'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Perbarui & Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode('REPLACE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      syncMode === 'REPLACE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ganti Semua ({currentCustomerCount.toLocaleString('id-ID')} data lama)
                  </button>
                </div>
              </div>

              {/* Sample Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">IDPEL</th>
                        <th className="p-2.5">Nama Pelanggan</th>
                        <th className="p-2.5">Alamat</th>
                        <th className="p-2.5">Tarif / Daya</th>
                        <th className="p-2.5">Gardu / Tiang</th>
                        <th className="p-2.5">Merk / No Meter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {previewCustomers.slice(0, 15).map((cust, idx) => (
                        <tr key={cust.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-extrabold text-blue-900">{cust.idpel}</td>
                          <td className="p-2.5 font-bold text-slate-900">{cust.nama}</td>
                          <td className="p-2.5 text-slate-600 truncate max-w-[150px]">{cust.alamat}</td>
                          <td className="p-2.5 font-bold text-slate-700">{cust.tarif} / {cust.daya}</td>
                          <td className="p-2.5 text-slate-600">{cust.gardu} • {cust.titikTumpu}</td>
                          <td className="p-2.5">
                            <span className="font-semibold block">{cust.merkMeter}</span>
                            <span className="font-mono text-[10px] text-slate-500">{cust.nomorMeter}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalDetectedCount > 15 && (
                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
                    + Menampilkan 15 sampel data pertama dari total {totalDetectedCount.toLocaleString('id-ID')} data pelanggan di spreadsheet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Database saat ini: <strong>{currentCustomerCount.toLocaleString('id-ID')} Pelanggan</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApplyToDatabase}
              disabled={!previewCustomers || previewCustomers.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan Database ({totalDetectedCount > 0 ? totalDetectedCount.toLocaleString('id-ID') : previewCustomers.length} Data)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
