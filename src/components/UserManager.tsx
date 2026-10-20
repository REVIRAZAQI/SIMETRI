import React, { useState } from 'react';
import { Users, UserPlus, Search, ShieldCheck, Lock, CheckCircle2, Trash2, Edit3, Key, Building, Check, X, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { UserAccount, SystemRole } from '../types';

interface UserManagerProps {
  userAccounts?: UserAccount[];
  users?: UserAccount[];
  currentUser: UserAccount | null;
  onAddUser: (newUser: UserAccount) => void;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  userAccounts,
  users = [],
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const activeUserList = userAccounts || users || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State for New/Edit User
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [role, setRole] = useState<SystemRole>('Yantek');
  const [unitKerja, setUnitKerja] = useState('ULP Semarang Tengah');
  const [statusActive, setStatusActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setNamaLengkap('');
    setRole('Yantek');
    setUnitKerja('ULP Semarang Tengah');
    setStatusActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword(u.password || '');
    setNamaLengkap(u.namaLengkap);
    setRole(u.role);
    setUnitKerja(u.unitKerja || '');
    setStatusActive(u.statusActive);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Username wajib diisi.');
      return;
    }

    // Check username duplicate if adding new or changing username
    const duplicate = activeUserList.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUser?.id
    );
    if (duplicate) {
      setFormError(`Username "${cleanUsername}" sudah digunakan oleh akun lain!`);
      return;
    }

    if (editingUser) {
      const updated: UserAccount = {
        ...editingUser,
        username: cleanUsername,
        password: password || editingUser.password,
        namaLengkap: namaLengkap.trim() || cleanUsername,
        role,
        unitKerja: unitKerja.trim(),
        statusActive
      };
      onUpdateUser(updated);
    } else {
      const newUser: UserAccount = {
        id: `USR-${Date.now()}`,
        username: cleanUsername,
        password: password.trim() || 'pln12345',
        namaLengkap: namaLengkap.trim() || cleanUsername,
        role,
        unitKerja: unitKerja.trim(),
        statusActive: true,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      onAddUser(newUser);
    }

    setShowModal(false);
  };

  const filteredUsers = activeUserList.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.unitKerja && u.unitKerja.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyle = (r: SystemRole) => {
    switch (r) {
      case 'Admin':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Yantek':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Billman':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Yanbung':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Gamet':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRolePrivilegesInfo = (r: SystemRole) => {
    switch (r) {
      case 'Admin':
        return 'Akses penuh seluruh menu (Gangguan APP, P2TL, Gamet & Management User).';
      case 'Yantek':
      case 'Billman':
        return 'Hanya dapat mengakses Menu Upload Gangguan APP & Sub-Menu Input kWh Gangguan.';
      case 'Yanbung':
        return 'Hanya dapat mengakses Menu Penyelesaian P2TL & Sub-Menu Input Ganti Meter.';
      case 'Gamet':
        return 'Hanya dapat mengakses Menu Ganti kWh Meter Pra-Pasca (Gamet).';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> SYSTEM USER MANAGEMENT
          </span>
          <h2 className="text-xl font-black tracking-tight">Manajemen User & Pendaftaran Akun SIMETRI</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Kelola akun pengguna, pembuatan pendaftaran user baru, pembagian 5 Role Pengguna (Admin, Yantek, Billman, Yanbung, Gamet), dan kontrol hak akses menu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer border border-purple-400/30 shrink-0"
        >
          <UserPlus className="w-4 h-4 text-white" /> BUAT / DAFTAR USER BARU
        </button>
      </div>

      {/* Role Access Rules Privilege Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(['Admin', 'Yantek', 'Billman', 'Yanbung', 'Gamet'] as SystemRole[]).map((r) => (
          <div key={r} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getRoleBadgeStyle(r)}`}>
                  {r}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {activeUserList.filter(u => u.role === r).length} Akun
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-2">
                {getRolePrivilegesInfo(r)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* User Table & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari Username / Nama / Unit Kerja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">👥 Semua Role Pengguna</option>
              <option value="Admin">Role: Admin</option>
              <option value="Yantek">Role: Yantek</option>
              <option value="Billman">Role: Billman</option>
              <option value="Yanbung">Role: Yanbung</option>
              <option value="Gamet">Role: Gamet</option>
            </select>
          </div>
        </div>

        {/* User List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Pengguna & Username</th>
                <th className="py-3 px-4">Role Hak Akses</th>
                <th className="py-3 px-4">Unit Kerja / Posko</th>
                <th className="py-3 px-4">Hak Akses Menu</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                    Tidak ada akun user terdaftar yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 font-black flex items-center justify-center shrink-0 uppercase text-xs">
                          {u.username.slice(0, 2)}
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black text-xs">{u.namaLengkap}</strong>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {u.unitKerja || '-'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-xs">
                      {getRolePrivilegesInfo(u.role)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onUpdateUser({ ...u, statusActive: !u.statusActive })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition cursor-pointer ${
                          u.statusActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        {u.statusActive ? 'AKTIF' : 'NONAKTIF'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                          title="Edit User"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus akun user "${u.username}"?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM: BUAT / EDIT USER */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black uppercase">
                  {editingUser ? 'Edit Akun Pengguna' : 'Pendaftaran User Baru SIMETRI'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Username Login *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: yantek_posko01 / admin_semarang"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Password Akun {editingUser ? '(Kosongkan jika tidak diubah)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder="Masukkan password akun..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nama Lengkap Petugas / Pengguna *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso (Petugas Yantek)"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Role Pengguna (Hak Akses) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as SystemRole)}
                  className="w-full px-3.5 py-2.5 bg-purple-50 border border-purple-300 rounded-xl text-xs font-black text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="Admin">Role: Admin (Akses Penuh Semua Menu)</option>
                  <option value="Yantek">Role: Yantek (Upload Gangguan APP & Input kWh Gangguan)</option>
                  <option value="Billman">Role: Billman (Upload Gangguan APP & Input kWh Gangguan)</option>
                  <option value="Yanbung">Role: Yanbung (Penyelesaian P2TL & Input Ganti Meter)</option>
                  <option value="Gamet">Role: Gamet (Ganti kWh Meter Pra-Pasca Gamet)</option>
                </select>
              </div>

              {/* Unit Kerja */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unit Kerja / Posko *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ULP Semarang Tengah / Posko Alpha"
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Informative summary box */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 font-medium">
                🔒 <strong>Aturan Role {role}:</strong> {getRolePrivilegesInfo(role)}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Daftarkan User Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
