import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, User, Eye, EyeOff, LogIn, Sparkles, CheckCircle2, Zap, Users, AlertCircle, X, Activity } from 'lucide-react';
import { SimetriLogo } from './SimetriLogo';
import { UserAccount, SystemRole } from '../types';
import plnProcessBg from '../assets/images/pln_business_process_1785493427018.jpg';

interface LoginModalProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  userAccounts = [],
  onLoginSuccess,
  onClose,
  isModal = false
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRolePreview, setSelectedRolePreview] = useState<SystemRole | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const foundUser = userAccounts.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundUser) {
      setErrorMsg('Username tidak ditemukan di database SIMETRI.');
      return;
    }

    if (!foundUser.statusActive) {
      setErrorMsg('Akun pengguna ini sedang dinonaktifkan oleh Admin.');
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setErrorMsg('Password yang Anda masukkan salah.');
      return;
    }

    onLoginSuccess(foundUser);
  };

  const handleQuickDemoLogin = (role: SystemRole) => {
    const demoUser = userAccounts.find((u) => u.role === role);
    if (demoUser) {
      setUsername(demoUser.username);
      setPassword(demoUser.password || `${role.toLowerCase()}123`);
      onLoginSuccess(demoUser);
    }
  };

  const getRoleDescription = (role: SystemRole) => {
    switch (role) {
      case 'Admin':
        return 'Akses Penuh Seluruh Menu & Manajemen User';
      case 'Yantek':
        return 'Menu Upload Gangguan APP & Sub-Menu Input kWh Gangguan';
      case 'Billman':
        return 'Menu Upload Gangguan APP & Sub-Menu Input kWh Gangguan';
      case 'Yanbung':
        return 'Menu Penyelesaian P2TL & Sub-Menu Input Ganti Meter';
      case 'Gamet':
        return 'Menu Ganti kWh Meter Pra-Pasca (Gamet)';
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${
        isModal
          ? 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4'
          : 'min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-4'
      }`}
    >
      {/* Cartoon Background Illustration with Dark Gradient Overlay */}
      <div className="absolute inset-0 z-0 opacity-25 bg-cover bg-center pointer-events-none filter saturate-150 contrast-125" style={{ backgroundImage: `url(${plnProcessBg})` }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/70 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 my-auto"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding & Cartoon Business Process Banner */}
        <div className="p-4 sm:p-7 border-b border-slate-800 text-center relative bg-slate-900/90">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex justify-center mb-2 sm:mb-3">
            <SimetriLogo size="lg" layout="vertical" showText={false} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 sm:mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> UID Jatim - UP3 Jember
          </span>

          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase">
            SIMETRI
          </h2>
          <p className="text-[11px] sm:text-xs font-extrabold text-cyan-400 mt-0.5">
            Sistem Ganti Meter Terintegrasi Berbasis AI
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            PT. PLN (Persero)
          </p>

          {/* Kartun Ilustrasi Alur Proses Bisnis PLN */}
          <div className="mt-3 sm:mt-4 rounded-xl sm:rounded-2xl overflow-hidden border border-cyan-500/30 shadow-lg relative group">
            <img
              src={plnProcessBg}
              alt="Ilustrasi Kartun Proses Bisnis PLN"
              referrerPolicy="no-referrer"
              className="w-full h-24 sm:h-32 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-2 sm:p-2.5">
              <div className="flex items-center gap-2 text-left">
                <div className="p-1 bg-cyan-500/20 rounded-lg border border-cyan-400/40 backdrop-blur-xs">
                  <Activity className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl sm:rounded-2xl text-rose-200 text-xs font-semibold flex items-center gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            {/* Username Input */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs font-extrabold text-slate-300 flex items-center justify-between">
                <span>Username Akun</span>
                <span className="text-[10px] text-slate-400">ID Petugas/Sistem</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan username (e.g. admin, yantek)..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs font-extrabold text-slate-300 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-400">Kata Sandi Akun</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <LogIn className="w-4 h-4 text-slate-950" /> Masuk
            </motion.button>
          </form>

          {/* Quick Role Tester / Demo Accounts Section */}
          <div className="pt-3 sm:pt-4 border-t border-slate-800/80 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Uji Login Langsung (5 Role Pengguna):
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {(['Admin', 'Yantek', 'Billman', 'Yanbung', 'Gamet'] as SystemRole[]).map((r) => (
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -1 }}
                  whileTap={{ scale: 0.97 }}
                  key={r}
                  type="button"
                  onClick={() => handleQuickDemoLogin(r)}
                  className="p-2 sm:p-2.5 bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-300 group-hover:text-cyan-200">{r}</span>
                    <span className="text-[9px] font-mono bg-slate-800 text-slate-400 group-hover:bg-cyan-950 group-hover:text-cyan-300 px-1 py-0.5 rounded">
                      Demo
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-medium">
                    {getRoleDescription(r)}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 text-center border-t border-slate-800 text-[9px] sm:text-[10px] text-slate-500 font-semibold">
          SIMETRI v2.5 • PT PLN (Persero) System Integration Portal
        </div>
      </motion.div>
    </div>
  );
};
