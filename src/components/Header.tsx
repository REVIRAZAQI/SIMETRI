import React from 'react';
import { ShieldCheck, Plus, List, BarChart3, Upload, PhoneCall, Zap, Wrench, UserCheck, Users, LogOut, User, LogIn, Bot, ClipboardList } from 'lucide-react';
import { SimetriLogo } from './SimetriLogo';
import { AppMainModule, UserAccount, SystemRole } from '../types';

interface HeaderProps {
  activeModule: AppMainModule;
  setActiveModule: (module: AppMainModule) => void;
  
  // P2TL Sub-tabs
  activeP2tlTab: 'form' | 'supervisor' | 'history' | 'dashboard';
  setActiveP2tlTab: (tab: 'form' | 'supervisor' | 'history' | 'dashboard') => void;
  
  // Gangguan APP Sub-tabs
  activeGangguanTab: 'input' | 'list' | 'custdb' | 'upload' | 'analytics';
  setActiveGangguanTab: (tab: 'input' | 'list' | 'custdb' | 'upload' | 'analytics') => void;

  // Gamet Sub-tabs
  activeGametTab: 'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard';
  setActiveGametTab: (tab: 'form' | 'monitoring' | 'supervisor' | 'history' | 'dashboard') => void;

  recordCount: number;
  pendingWoCount: number;
  gangguanCount: number;
  gametCount: number;
  pendingGametWoCount?: number;
  customerCount?: number;

  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setActiveModule,
  activeP2tlTab,
  setActiveP2tlTab,
  activeGangguanTab,
  setActiveGangguanTab,
  activeGametTab,
  setActiveGametTab,
  recordCount,
  pendingWoCount,
  gangguanCount,
  gametCount,
  pendingGametWoCount = 0,
  customerCount = 0,
  currentUser,
  onLogout,
  onOpenLoginModal
}) => {
  const role: SystemRole = currentUser?.role || 'Admin';

  // Check top menu access permission
  const canAccessGangguan = role === 'Admin' || role === 'Yantek' || role === 'Billman';
  const canAccessP2tl = role === 'Admin' || role === 'Yanbung';
  const canAccessGamet = role === 'Admin' || role === 'Gamet';
  const canAccessUsers = role === 'Admin';

  // Check sub-menu access permission for Gangguan APP
  const canAccessGangguanInput = true; // All 3 roles (Admin, Yantek, Billman) can access input
  const canAccessGangguanList = role === 'Admin';
  const canAccessGangguanCustDb = role === 'Admin';
  const canAccessGangguanUpload = role === 'Admin';
  const canAccessGangguanAnalytics = role === 'Admin';

  // Check sub-menu access permission for P2TL
  const canAccessP2tlForm = true; // Admin and Yanbung
  const canAccessP2tlSupervisor = role === 'Admin';
  const canAccessP2tlHistory = role === 'Admin';
  const canAccessP2tlDashboard = role === 'Admin';

  // Check sub-menu access permission for Gamet
  const canAccessGametForm = true; // Admin and Gamet
  const canAccessGametSupervisor = role === 'Admin';
  const canAccessGametHistory = role === 'Admin';
  const canAccessGametDashboard = role === 'Admin';

  const getRoleColor = (r: SystemRole) => {
    switch (r) {
      case 'Admin': return 'bg-purple-500 text-slate-950';
      case 'Yantek': return 'bg-amber-500 text-slate-950';
      case 'Billman': return 'bg-amber-500 text-slate-950';
      case 'Yanbung': return 'bg-blue-500 text-white';
      case 'Gamet': return 'bg-emerald-500 text-slate-950';
      default: return 'bg-cyan-500 text-slate-950';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Branding Row */}
        <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-800/80 gap-2 sm:gap-3">
          {/* SIMETRI Logo */}
          <div className="flex items-center gap-2 shrink min-w-0">
            <SimetriLogo size="sm" layout="horizontal" showText={true} />
          </div>

          {/* Logged In User Profile & Switch Account Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-800/90 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-slate-700 min-w-0">
                <div className="text-right min-w-0">
                  <div className="flex items-center justify-end gap-1 min-w-0">
                    <span className="text-[10px] sm:text-xs font-black text-slate-100 max-w-[65px] xs:max-w-[100px] sm:max-w-none truncate">{currentUser.namaLengkap}</span>
                    <span className={`px-1 sm:px-1.5 py-0.5 text-[7.5px] sm:text-[9px] font-black rounded uppercase shrink-0 ${getRoleColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block font-mono hidden sm:block">@{currentUser.username} • {currentUser.unitKerja || 'PLN Unit'}</span>
                </div>

                <button
                  onClick={onOpenLoginModal}
                  className="p-1 sm:p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg sm:rounded-xl transition cursor-pointer shrink-0"
                  title="Ganti Akun / Ganti Role"
                >
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1 sm:p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg sm:rounded-xl transition cursor-pointer border border-rose-500/30 shrink-0"
                  title="Logout Akun"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-2.5 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl shadow-lg hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">LOGIN SIMETRI</span><span className="sm:hidden">LOGIN</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Top-Level Navigation Modules Bar (PERMISSIONS FILTERED) */}
        <div 
          className="flex flex-wrap items-center p-2.5 my-1.5 gap-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md"
          style={{ borderRadius: '12px' }}
        >
          {/* Menu 0: Tanya SIMETRI AI Engine */}
          <button
            onClick={() => setActiveModule('tanya-simetri')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
              activeModule === 'tanya-simetri'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_4px_12px_rgba(6,182,212,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-cyan-200 border border-cyan-200'
                : 'bg-slate-800 text-cyan-300 hover:text-white hover:bg-slate-700/90 border border-slate-700/80 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span>TANYA SIMETRI AI</span>
            <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 text-[9px] rounded-full font-mono uppercase font-black border border-cyan-500/40">
              AI
            </span>
          </button>

          {/* Menu 1: Upload Gangguan APP (Yantek & Billman) */}
          {canAccessGangguan && (
            <button
              onClick={() => setActiveModule('gangguan')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
                activeModule === 'gangguan'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-amber-200 border border-amber-200'
                  : 'bg-slate-800 text-amber-300 hover:text-white hover:bg-slate-700/90 border border-slate-700/80 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">UPLOAD GANGGUAN APP (YANTEK & BILLMAN)</span>
              <span className="md:hidden">GANGGUAN APP</span>
              {gangguanCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded-full font-mono border border-amber-500/40">
                  {gangguanCount}
                </span>
              )}
            </button>
          )}

          {/* Menu 2: Penyelesaian P2TL (Yanbung) */}
          {canAccessP2tl && (
            <button
              onClick={() => setActiveModule('p2tl')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
                activeModule === 'p2tl'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-blue-300 border border-blue-300'
                  : 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700/90 border border-slate-700/80 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
              <span className="hidden md:inline">PENYELESAIAN P2TL (YANBUNG)</span>
              <span className="md:hidden">P2TL YANBUNG</span>
            </button>
          )}

          {/* Menu 3: Ganti kWh Meter Pra-Pasca (Gamet) */}
          {canAccessGamet && (
            <button
              onClick={() => setActiveModule('gamet')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
                activeModule === 'gamet'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-emerald-300 border border-emerald-300'
                  : 'bg-slate-800 text-emerald-300 hover:text-white hover:bg-slate-700/90 border border-slate-700/80 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">GANTI KWH METER PRA-PASCA (GAMET)</span>
              <span className="md:hidden">GAMET METER</span>
              {gametCount > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-200 text-[10px] rounded-full font-mono border border-emerald-500/40">
                  {gametCount}
                </span>
              )}
            </button>
          )}

          {/* Menu 4: Management User (Pembuatan & Pendaftaran User) */}
          {canAccessUsers && (
            <button
              onClick={() => setActiveModule('users')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
                activeModule === 'users'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_4px_12px_rgba(147,51,234,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-purple-300 border border-purple-300'
                  : 'bg-slate-800 text-purple-300 hover:text-white hover:bg-slate-700/90 border border-slate-700/80 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
              <span className="hidden md:inline">MANAGEMENT USER</span>
              <span className="md:hidden">USER AKUN</span>
            </button>
          )}
        </div>

        {/* Sub-Navigation Bar for MODULE 1: Upload Gangguan APP (PERMISSIONS FILTERED) */}
        {activeModule === 'gangguan' && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-2 border-t border-slate-800/60 text-xs font-bold">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider shrink-0 pr-1">
              Sub-Menu Gangguan:
            </span>

            {canAccessGangguanInput && (
              <button
                onClick={() => setActiveGangguanTab('input')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGangguanTab === 'input'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Input kWh Gangguan
              </button>
            )}

            {canAccessGangguanList && (
              <button
                onClick={() => setActiveGangguanTab('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGangguanTab === 'list'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" /> Monitoring Laporan ({gangguanCount})
              </button>
            )}

            {canAccessGangguanCustDb && (
              <button
                onClick={() => setActiveGangguanTab('custdb')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGangguanTab === 'custdb'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Upload Pelanggan ({customerCount})
              </button>
            )}

            {canAccessGangguanUpload && (
              <button
                onClick={() => setActiveGangguanTab('upload')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGangguanTab === 'upload'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Rekap Gangguan
              </button>
            )}

            {canAccessGangguanAnalytics && (
              <button
                onClick={() => setActiveGangguanTab('analytics')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGangguanTab === 'analytics'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics Gangguan
              </button>
            )}
          </div>
        )}

        {/* Sub-Navigation Bar for MODULE 2: Penyelesaian P2TL (Yanbung) (PERMISSIONS FILTERED) */}
        {activeModule === 'p2tl' && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-2 border-t border-slate-800/60 text-xs font-bold">
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider shrink-0 pr-1">
              Sub-Menu P2TL:
            </span>

            {canAccessP2tlForm && (
              <button
                onClick={() => setActiveP2tlTab('form')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeP2tlTab === 'form'
                    ? 'bg-blue-600 text-white font-extrabold shadow-md ring-1 ring-blue-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Input Ganti Meter
              </button>
            )}

            {canAccessP2tlSupervisor && (
              <button
                onClick={() => setActiveP2tlTab('supervisor')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeP2tlTab === 'supervisor'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-amber-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload WO ({pendingWoCount})
              </button>
            )}

            {canAccessP2tlHistory && (
              <button
                onClick={() => setActiveP2tlTab('history')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeP2tlTab === 'history'
                    ? 'bg-blue-600 text-white font-extrabold shadow-md ring-1 ring-blue-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Riwayat & BA ({recordCount})
              </button>
            )}

            {canAccessP2tlDashboard && (
              <button
                onClick={() => setActiveP2tlTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeP2tlTab === 'dashboard'
                    ? 'bg-blue-600 text-white font-extrabold shadow-md ring-1 ring-blue-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics P2TL
              </button>
            )}
          </div>
        )}

        {/* Sub-Navigation Bar for MODULE 3: Ganti kWh Meter Pra-Pasca (Gamet) (PERMISSIONS FILTERED) */}
        {activeModule === 'gamet' && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-2 border-t border-slate-800/60 text-xs font-bold">
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider shrink-0 pr-1">
              Sub-Menu Gamet:
            </span>

            {canAccessGametForm && (
              <button
                onClick={() => setActiveGametTab('form')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGametTab === 'form'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-md ring-1 ring-emerald-300'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Input Ganti Meter
              </button>
            )}

            <button
              onClick={() => setActiveGametTab('monitoring')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                activeGametTab === 'monitoring'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-md ring-1 ring-emerald-300'
                  : 'bg-slate-800/80 text-emerald-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Monitoring WO & Tagsus ({pendingGametWoCount})
            </button>

            {canAccessGametSupervisor && (
              <button
                onClick={() => setActiveGametTab('supervisor')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                  activeGametTab === 'supervisor'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-800/80 text-amber-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload WO Gamet ({pendingGametWoCount})
              </button>
            )}

            {canAccessGametHistory && (
              <button
                onClick={() => setActiveGametTab('history')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  activeGametTab === 'history'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Riwayat & BA ({gametCount})
              </button>
            )}

            {canAccessGametDashboard && (
              <button
                onClick={() => setActiveGametTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  activeGametTab === 'dashboard'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics Gamet
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
