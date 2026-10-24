import React, { useState } from "react";
import { TeamMember, UserRole } from "../types";
import { Users, UserPlus, Shield, Sparkles, UserCheck, AlertTriangle, Trash2 } from "lucide-react";

interface TeamModuleProps {
  members: TeamMember[];
  userMember: TeamMember | null;
  onAddMember: (member: TeamMember) => void;
  onUpdateRole: (email: string, role: UserRole, division: string) => void;
  onDeleteMember: (email: string) => void; 
}

export default function TeamModule({ members, userMember, onAddMember, onUpdateRole, onDeleteMember }: TeamModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.MEMBER);
  const [division, setDivision] = useState("Tech");

  const isAuthorizedAdmin = userMember?.role === UserRole.ADMIN;

  const divisions = ["Tech", "Marketing", "Design", "HR", "Sales", "Finance", "Admin", "Operational"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      alert("Nama dan Email wajib diisi!");
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      alert("Email anggota tim sudah terdaftar!");
      return;
    }

    const newMember: TeamMember = {
      email: email.toLowerCase(),
      name,
      role,
      division,
      points: 10, // Initial onboarding points
    };

    onAddMember(newMember);
    setEmail("");
    setName("");
    setRole(UserRole.MEMBER);
    setDivision("Tech");
    setShowAddForm(false);
    alert("Anggota tim berhasil ditambahkan dengan +10 poin awal! 🚀");
  };

  const handleRoleChange = (email: string, newRole: UserRole, div: string) => {
    if (!isAuthorizedAdmin) {
      alert("Hanya Admin / Kepala Divisi yang diizinkan mengubah hak akses!");
      return;
    }
    onUpdateRole(email, newRole, div);
    alert(`Sukses mengubah peran ${email} menjadi ${newRole} (${div})!`);
  };

  // const canDeleteMember = (targetMember: TeamMember) => {
  //   const isCurrentUser = targetMember.email.toLowerCase() === userMember?.email?.toLowerCase();
  //   if (isCurrentUser) return false;

  //   if (isAuthorizedAdmin) {
  //     return targetMember.role !== UserRole.ADMIN;
  //   }

  //   return false;
  // };

  // const handleDeleteClick = (targetMember: TeamMember) => {
  //   const confirmDelete = window.confirm(
  //     `Apakah Anda yakin ingin menghapus ${targetMember.name} (${targetMember.email}) dari tim? Tindakan ini tidak dapat dibatalkan.`
  //   );

  //   if (confirmDelete) {
  //     onDeleteMember(targetMember.email);
  //   }
  // };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Description and Add Member Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">Kolaborasi Struktur Tim</h3>
          <p className="text-xs text-gray-400 mt-0.5">Atur hak akses divisi dan peran keamanan sistem untuk kolaborasi terstruktur.</p>
        </div>
        {isAuthorizedAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer transition-all duration-150"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Anggota Baru</span>
          </button>
        )}
      </div>

      {/* Security alert for non-admins */}
      {!isAuthorizedAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Mode Terbatas (RBAC):</span> Anda saat ini masuk sebagai peran <strong className="text-slate-800">{userMember?.role || "Viewer"}</strong>. Fitur menambah anggota atau mengubah peran divisi tidak diaktifkan demi menjaga privasi dan keamanan divisi Anda.
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && isAuthorizedAdmin && (
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-indigo-600" /> Form Tambah Anggota Divisi
          </h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: Siti Aminah"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Email Google *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cth: siti.aminah@gmail.com"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Peran Akses (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                <option value={UserRole.MEMBER}>{UserRole.MEMBER}</option>
                <option value={UserRole.VIEWER}>{UserRole.VIEWER}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Divisi Utama</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    Divisi {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tambah & Berikan Poin Onboarding
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const isCurrentUser = member.email.toLowerCase() === userMember?.email?.toLowerCase();

          return (
            <div
              key={member.email}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all duration-150 ${
                isCurrentUser
                  ? "border-indigo-500 shadow-md ring-2 ring-indigo-500/10"
                  : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="space-y-4">
                {/* Header profile photo placeholder */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-gray-800 truncate block">
                      {member.name} {isCurrentUser && <span className="text-[10px] text-indigo-500 font-semibold">(Saya)</span>}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate block">{member.email}</span>
                  </div>
                  {/* TOMBOL HAPUS BARU */}
                  {/*
                  {canDeleteMember(member) && (
                    <button
                      onClick={() => handleDeleteClick(member)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Hapus ${member.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                    */}
                </div>

                {/* Info block */}
                <div className="space-y-2 pt-3 border-t border-gray-50 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold">Divisi Utama</span>
                    <span className="font-bold text-gray-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg uppercase text-[10px]">
                      {member.division}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold">Poin Performa</span>
                    <span className="font-bold text-indigo-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {member.points} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles Setting Dropdown */}
              <div className="mt-5 pt-3 border-t border-gray-100">
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Peran Divisi & Privasi</label>
                {isAuthorizedAdmin && !isCurrentUser ? (
                  <div className="flex gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.email, e.target.value as UserRole, member.division)}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:bg-white"
                    >
                      <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                      <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                      <option value={UserRole.MEMBER}>{UserRole.MEMBER}</option>
                      <option value={UserRole.VIEWER}>{UserRole.VIEWER}</option>
                    </select>

                    <select
                      value={member.division}
                      onChange={(e) => handleRoleChange(member.email, member.role, e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:bg-white"
                    >
                      {divisions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase w-fit leading-none">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.role} • Divisi {member.division}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
