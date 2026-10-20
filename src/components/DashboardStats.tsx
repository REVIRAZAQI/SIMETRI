import React from 'react';
import { ReplacementRecord } from '../types';
import { 
  Gauge, ShieldCheck, Clock, AlertTriangle, Activity, 
  TrendingUp, Users, Zap, CheckCircle2 
} from 'lucide-react';
import { JENIS_PELANGGARAN_MAP } from '../data/mockData';

interface DashboardStatsProps {
  records: ReplacementRecord[];
  onSelectRecord: (record: ReplacementRecord) => void;
  onGoToForm: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  records,
  onSelectRecord,
  onGoToForm
}) => {
  const total = records.length;
  const verified = records.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const pending = records.filter((r) => r.verificationStatus === 'PENDING').length;
  const rejected = records.filter((r) => r.verificationStatus === 'REJECTED' || r.verificationStatus === 'REVISION_NEEDED').length;

  // Total stan cabut calculation
  const totalStanCabut = records.reduce((acc, curr) => {
    const val = parseFloat(curr.stanCabut) || 0;
    return acc + val;
  }, 0);

  // Group by jenis pelanggaran
  const jenisCounts: Record<string, number> = {};
  records.forEach((r) => {
    jenisCounts[r.jenisPelanggaran] = (jenisCounts[r.jenisPelanggaran] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ganti Meter</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{total}</div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Data Tersimpan
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terverifikasi Valid</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{verified}</div>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
              {total > 0 ? Math.round((verified / total) * 100) : 0}% Terverifikasi AI
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Menunggu Audit AI</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pending}</div>
            <span className="text-[10px] text-amber-700 font-semibold mt-1 block">Perlu Ditekan Audit</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stan Cabut</span>
            <div className="text-xl font-black font-mono text-cyan-900 mt-1">
              {totalStanCabut.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">kWh Terakumulasi</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Breakdown Graphs & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown by Kategori P2TL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-700" /> Breakdown Kategori P2TL
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(JENIS_PELANGGARAN_MAP).map(([key, val]) => {
              const count = jenisCounts[key] || 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 truncate max-w-[180px]">{val.title}</span>
                    <span className="font-bold text-slate-900">{count} ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Replacement Log Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-700" /> Log Terkini Penggantian Meter
            </h3>
            <button
              onClick={onGoToForm}
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              + Input Baru
            </button>
          </div>

          <div className="space-y-3">
            {records.slice(0, 4).map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-900">{rec.idpel}</span>
                    <span className="font-semibold text-slate-900">{rec.namaPelanggan}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Stan Cabut: <strong className="text-amber-900">{rec.stanCabut} kWh</strong> | Meter Baru: <strong className="text-blue-900">{rec.nomorMeterBaru}</strong>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">{rec.tanggalGanti}</span>
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                    {rec.verificationStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
