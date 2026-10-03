import React, { useState } from "react";
import {
  Settings,
  Shield,
  Building,
  Sliders,
  Users,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Trash2,
  UserPlus,
  RefreshCw,
  Download,
  Upload,
  Lock,
  Sparkles,
  DollarSign,
  Award,
  MessageSquare,
  Folder,
  TrendingUp,
  Clock,
  Percent,
  Check,
  X,
  FileCheck
} from "lucide-react";
import { SystemSettings, TeamMember, UserRole, Project, Task, FinancialTransaction } from "../types";
import {
  apiUpdateSettings,
  apiAdminResetPassword,
  apiAdminSaveMember,
  apiAdminDeleteMember,
  apiAdminRestoreDb,
  apiAdminResetDb
} from "../lib/apiClient";

interface SettingsModuleProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  userMember: TeamMember | null;
  members: TeamMember[];
  onRefreshData: () => Promise<void>;
  projects: Project[];
  tasks: Task[];
  transactions: FinancialTransaction[];
}

export default function SettingsModule({
  settings,
  onUpdateSettings,
  userMember,
  members,
  onRefreshData,
  projects,
  tasks,
  transactions
}: SettingsModuleProps) {
  const isAdmin = userMember?.role === UserRole.ADMIN || userMember?.role === "Admin / Division Head";

  // Tab State
  const [activeTab, setActiveTab] = useState<"general" | "features" | "users" | "database">("general");

  // Form States for General
  const [generalForm, setGeneralForm] = useState<SystemSettings>({ ...settings });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Form States for Features
  const [featureForm, setFeatureForm] = useState<SystemSettings>({ ...settings });
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [featureSuccess, setFeatureSuccess] = useState<string | null>(null);

  // Modal States for User Management
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [targetUserName, setTargetUserName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [userActionFeedback, setUserActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States for Add User
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    division: "FTTH Rollout / OSP",
    role: UserRole.MEMBER,
    password: "exven2026"
  });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Database Danger Zone State
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [dbActionFeedback, setDbActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security Access Guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 mb-4 shadow-xl shadow-red-500/10">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Terbatas: Khusus Super Admin</h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Modul Pengaturan Sistem hanya dapat diakses oleh peran <strong>Admin / Division Head (Project Director)</strong>.
          Silakan hubungi administrator Kelolakan jika Anda memerlukan perubahan konfigurasi sistem.
        </p>
      </div>
    );
  }

  // 1. Handle General Settings Save
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralSuccess(null);
    setGeneralError(null);
    try {
      const updated = await apiUpdateSettings(generalForm);
      onUpdateSettings(updated);
      setGeneralSuccess("Pengaturan identitas & operasional berhasil disimpan ke server!");
      setTimeout(() => setGeneralSuccess(null), 4000);
    } catch (err: any) {
      setGeneralError(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // 2. Handle Feature Toggles Save
  const handleSaveFeatures = async (newFeatures: SystemSettings) => {
    setFeatureForm(newFeatures);
    setIsSavingFeatures(true);
    setFeatureSuccess(null);
    try {
      const updated = await apiUpdateSettings(newFeatures);
      onUpdateSettings(updated);
      setFeatureSuccess("Konfigurasi fitur & modul berhasil diperbarui!");
      setTimeout(() => setFeatureSuccess(null), 3000);
    } catch (err: any) {
      alert("Gagal memperbarui fitur: " + err.message);
    } finally {
      setIsSavingFeatures(false);
    }
  };

  // 3. Handle Admin Reset Password
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 6) {
      setUserActionFeedback({ type: "error", text: "Password minimal 6 karakter." });
      return;
    }
    setIsResettingPassword(true);
    setUserActionFeedback(null);
    try {
      await apiAdminResetPassword(targetUserEmail, newAdminPassword);
      setUserActionFeedback({ type: "success", text: `Kata sandi untuk ${targetUserName} berhasil diperbarui!` });
      setTimeout(() => {
        setIsResetPassModalOpen(false);
        setNewAdminPassword("");
        setUserActionFeedback(null);
      }, 2000);
    } catch (err: any) {
      setUserActionFeedback({ type: "error", text: err.message || "Gagal mereset kata sandi." });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 4. Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      setUserActionFeedback({ type: "error", text: "Nama dan email wajib diisi." });
      return;
    }
    setIsAddingUser(true);
    try {
      await apiAdminSaveMember({
        name: newUserForm.name,
        email: newUserForm.email,
        division: newUserForm.division,
        role: newUserForm.role,
        password: newUserForm.password,
        points: 100
      });
      await onRefreshData();
      setUserActionFeedback({ type: "success", text: `Akun baru ${newUserForm.name} berhasil ditambahkan!` });
      setTimeout(() => {
        setIsAddUserModalOpen(false);
        setNewUserForm({
          name: "",
          email: "",
          division: "FTTH Rollout / OSP",
          role: UserRole.MEMBER,
          password: "exven2026"
        });
        setUserActionFeedback(null);
      }, 2000);
    } catch (err: any) {
      setUserActionFeedback({ type: "error", text: err.message || "Gagal menambah user." });
    } finally {
      setIsAddingUser(false);
    }
  };

  // 5. Handle Delete Member
  const handleDeleteMember = async (email: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${name} (${email}) dari database?`)) {
      return;
    }
    try {
      await apiAdminDeleteMember(email);
      await onRefreshData();
      setUserActionFeedback({ type: "success", text: `Akun ${name} berhasil dihapus.` });
      setTimeout(() => setUserActionFeedback(null), 3000);
    } catch (err: any) {
      setUserActionFeedback({ type: "error", text: err.message || "Gagal menghapus user." });
    }
  };

  // 6. Handle Database Backup Export
  const handleDownloadBackup = () => {
    window.open("/api/admin/backup-db", "_blank");
  };

  // 7. Handle Database Restore from JSON File
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.projects || !json.members) {
          throw new Error("File JSON tidak memiliki struktur database Exven yang valid.");
        }
        if (!window.confirm("Restore database akan menimpa seluruh data yang ada saat ini. Lanjutkan?")) {
          return;
        }
        await apiAdminRestoreDb(json);
        await onRefreshData();
        setDbActionFeedback({ type: "success", text: "Database berhasil direstore dari file backup!" });
      } catch (err: any) {
        setDbActionFeedback({ type: "error", text: "Gagal restore file: " + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 8. Handle Reset Database to Factory Defaults
  const handleResetDatabase = async () => {
    if (resetConfirmInput !== "RESET") {
      alert("Harap ketik kata 'RESET' untuk mengonfirmasi.");
      return;
    }
    setIsResettingDb(true);
    try {
      await apiAdminResetDb();
      await onRefreshData();
      setIsResetDbModalOpen(false);
      setResetConfirmInput("");
      setDbActionFeedback({ type: "success", text: "Database telah berhasil direset ke konfigurasi awal!" });
    } catch (err: any) {
      setDbActionFeedback({ type: "error", text: "Gagal mereset database: " + err.message });
    } finally {
      setIsResettingDb(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white shrink-0">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Pusat Kontrol & Pengaturan Sistem</h1>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kelola identitas sistem, kontrol modul aktif, reset kata sandi tim PT. Exven Mitra Solusindo, dan cadangkan database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefreshData()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Data Server</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Identitas & Operasional</span>
          </button>

          <button
            onClick={() => setActiveTab("features")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "features"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Kontrol Modul & Fitur</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manajemen Akun & Reset Sandi</span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "database"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database & Cadangan (Backup)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: IDENTITAS & OPERASIONAL */}
      {/* ========================================================================= */}
      {activeTab === "general" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Identitas Aplikasi & Standar Operasional</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi penamaan brand perusahaan mitra, penyedia sistem, serta parameter kalkulasi otomatis.
              </p>
            </div>
          </div>

          {generalSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{generalSuccess}</span>
            </div>
          )}

          {generalError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Nama Aplikasi</label>
                <input
                  type="text"
                  required
                  value={generalForm.appName}
                  onChange={(e) => setGeneralForm({ ...generalForm, appName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Perusahaan Mitra Pengguna</label>
                <input
                  type="text"
                  required
                  value={generalForm.companyName}
                  onChange={(e) => setGeneralForm({ ...generalForm, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Penyedia Sistem / Developer</label>
                <input
                  type="text"
                  required
                  value={generalForm.providerName}
                  onChange={(e) => setGeneralForm({ ...generalForm, providerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Tagline / Deskripsi Singkat</label>
                <input
                  type="text"
                  value={generalForm.tagline}
                  onChange={(e) => setGeneralForm({ ...generalForm, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Parameter Kalkulasi Otomatis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jam Kerja Standar per Hari</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Digunakan untuk konversi estimasi durasi tugas di Kanban & S-Curve.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={24}
                      required
                      value={generalForm.standardWorkHoursPerDay}
                      onChange={(e) => setGeneralForm({ ...generalForm, standardWorkHoursPerDay: Number(e.target.value) })}
                      className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Jam / Hari</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Target Margin Finansial Default (%)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Persentase margin laba kotor standar untuk proyek baru.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={generalForm.targetMarginPercent}
                      onChange={(e) => setGeneralForm({ ...generalForm, targetMarginPercent: Number(e.target.value) })}
                      className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <span className="text-xs text-slate-500 font-semibold">% dari Nilai Kontrak</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingGeneral}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:bg-slate-300"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingGeneral ? "Menyimpan Perubahan..." : "Simpan Pengaturan"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KONTROL MODUL & FITUR (FEATURE FLAGS) */}
      {/* ========================================================================= */}
      {activeTab === "features" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kontrol Visibilitas Modul Aplikasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aktifkan atau nonaktifkan modul tertentu sesuai kebutuhan operasional tim PT. Exven Mitra Solusindo.
              </p>
            </div>
          </div>

          {featureSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{featureSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Modul Finansial */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul Finance & Margin</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Kontrol nilai kontrak proyek, margin keuntungan, arus kas uang masuk/keluar, dan Kurva S finansial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableFinanceModule: !featureForm.enableFinanceModule })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableFinanceModule ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableFinanceModule ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 1b. Modul Dokumen & Tagihan Resmi */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul Dokumen & Tagihan Resmi</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Penerbitan dan cetak format A4 resmi untuk Invoice Klien, Berita Acara (BAST), dan Voucher Pembayaran Vendor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableDocumentsModule: !(featureForm.enableDocumentsModule ?? true) })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  (featureForm.enableDocumentsModule ?? true) ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    (featureForm.enableDocumentsModule ?? true) ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 2. Modul Gamifikasi & Poin */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul Riwayat Poin Performa</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Sistem papan peringkat produktivitas dan reward poin untuk tim SITAC, OSP, dan teknisi lapangan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableGamification: !featureForm.enableGamification })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableGamification ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableGamification ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 3. Modul Diskusi & Pesan */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul Diskusi & Pesan Kolaborasi</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Fitur obrolan internal langsung per proyek untuk koordinasi cepat antar pimpinan divisi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableMessages: !featureForm.enableMessages })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableMessages ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableMessages ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 4. Modul File & Dokumentasi */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul File & Berkas Proyek</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Penyimpanan dokumen perizinan, kurva S, dan foto lapangan langsung ke disk penyimpanan server VPS.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableFiles: !featureForm.enableFiles })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableFiles ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableFiles ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 5. Modul Laporan Kurva S */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modul Laporan S-Curve</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Visualisasi perbandingan kemajuan rencana kumulatif terhadap realisasi aktual mingguan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableReports: !featureForm.enableReports })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableReports ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableReports ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>

            {/* 6. AI Analitik Gemini */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-indigo-50/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Analitik AI Gemini</h3>
                    <span className="px-2 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                      AI Powered
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Analisis risiko keterlambatan proyek, rekomendasi alokasi beban kerja, dan ringkasan eksekutif via Google Gemini AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveFeatures({ ...featureForm, enableGeminiAI: !featureForm.enableGeminiAI })}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  featureForm.enableGeminiAI ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                    featureForm.enableGeminiAI ? "right-1" : "left-1"
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAJEMEN AKUN & RESET PASSWORD */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Akun Tim & Akses Super Admin</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sebagai Super Admin, Anda dapat menambah akun baru atau mereset langsung password anggota tim jika lupa kata sandi.
              </p>
            </div>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Anggota Tim</span>
            </button>
          </div>

          {userActionFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
                userActionFeedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {userActionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{userActionFeedback.text}</span>
            </div>
          )}

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 rounded-l-xl">Nama Pengguna</th>
                  <th className="py-3 px-4">Username / Email</th>
                  <th className="py-3 px-4">Divisi Kerja</th>
                  <th className="py-3 px-4">Role / Peran</th>
                  <th className="py-3 px-4 text-center">Poin</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isMasterAdmin = m.email.toLowerCase() === "kelolakan@gmail.com";
                  return (
                    <tr key={m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <span>{m.name}</span>
                          {isMasterAdmin && (
                            <span className="block text-[10px] text-indigo-600 font-semibold">Master Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.division}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.role === UserRole.ADMIN
                              ? "bg-indigo-100 text-indigo-700"
                              : m.role === UserRole.MANAGER
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-600">{m.points}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setTargetUserEmail(m.email);
                              setTargetUserName(m.name);
                              setNewAdminPassword("");
                              setIsResetPassModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-semibold rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                            title="Reset Kata Sandi Pengguna"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Sandi</span>
                          </button>

                          {!isMasterAdmin && (
                            <button
                              onClick={() => handleDeleteMember(m.email, m.name)}
                              className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATABASE & PEMELIHARAAN BACKUP */}
      {/* ========================================================================= */}
      {activeTab === "database" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Manajemen Database & Pemeliharaan Server</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadangkan seluruh data proyek ke format JSON, restore cadangan sebelumnya, atau reset sistem.
              </p>
            </div>
          </div>

          {dbActionFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
                dbActionFeedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {dbActionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{dbActionFeedback.text}</span>
            </div>
          )}

          {/* Database Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Proyek</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{projects.length}</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Tugas</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{tasks.length}</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Transaksi Finansial</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{transactions.length}</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Akun Anggota</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{members.length}</span>
            </div>
          </div>

          {/* Backup & Restore Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Download Backup */}
            <div className="p-6 border border-slate-200 rounded-3xl bg-slate-50/40 space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Unduh Salinan Cadangan (Backup JSON)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ekspor seluruh basis data proyek, tugas, log waktu, tim, dan finansial ke dalam 1 file JSON mandiri untuk arsip offline.
                </p>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Backup Database (.json)</span>
              </button>
            </div>

            {/* Restore Backup */}
            <div className="p-6 border border-slate-200 rounded-3xl bg-slate-50/40 space-y-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pulihkan Data (Restore Backup)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pulihkan basis data dari file cadangan JSON yang pernah Anda unduh sebelumnya.
                </p>
              </div>
              <label className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Pilih File Backup JSON untuk Restore</span>
                <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
              </label>
            </div>
          </div>

          {/* Danger Zone: Reset to Factory Defaults */}
          <div className="p-6 border border-red-200 rounded-3xl bg-red-50/20 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Zona Bahaya (Danger Zone): Reset ke Pengaturan Awal</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghapus modifikasi proyek baru dan mereset basis data kembali ke konfigurasi proyek FTTH awal PT. Exven Mitra Solusindo. Pastikan Anda telah mengunduh backup sebelum melakukan reset.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsResetDbModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Database ke Default Pabrik...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN RESET USER PASSWORD */}
      {/* ========================================================================= */}
      {isResetPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Kata Sandi Pengguna</h3>
                  <p className="text-[11px] text-slate-500">{targetUserName} ({targetUserEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userActionFeedback && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userActionFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetPassword} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masukkan Kata Sandi Baru
                </label>
                <input
                  type="text"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Minimal 6 karakter (misal: exven2026)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:bg-slate-300"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isResettingPassword ? "Menyimpan..." : "Simpan Password Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH USER BARU */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Akun Anggota Tim</h3>
                  <p className="text-[11px] text-slate-500">Buat akses baru untuk personel PT. Exven Mitra Solusindo</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Username Login</label>
                <input
                  type="text"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="budi.osp@exven.co.id"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Divisi Kerja</label>
                  <select
                    value={newUserForm.division}
                    onChange={(e) => setNewUserForm({ ...newUserForm, division: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="FTTH Rollout / OSP">FTTH Rollout / OSP</option>
                    <option value="SITAC & Perizinan DKI">SITAC & Perizinan DKI</option>
                    <option value="Civil & Joint Pole">Civil & Joint Pole</option>
                    <option value="Splicing & Testing">Splicing & Testing</option>
                    <option value="QA/QC & ATP">QA/QC & ATP</option>
                    <option value="Finance & Legal">Finance & Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran (Role)</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value={UserRole.MEMBER}>Team Member</option>
                    <option value={UserRole.MANAGER}>Project Manager</option>
                    <option value={UserRole.ADMIN}>Admin / Division Head</option>
                    <option value={UserRole.VIEWER}>Viewer / Client</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Awal</label>
                <input
                  type="text"
                  required
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="exven2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:bg-slate-300"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingUser ? "Menambahkan..." : "Tambah Pengguna"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET DATABASE CONFIRMATION */}
      {/* ========================================================================= */}
      {isResetDbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Reset Database</h3>
                <p className="text-[11px] text-red-500">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Semua data transaksi kustom, tugas, dan file baru akan dihapus dan dikembalikan ke database default FTTH awal.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Ketik kata <strong className="text-red-600 font-mono">RESET</strong> untuk melanjutkan:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="Ketik RESET"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetDbModalOpen(false);
                  setResetConfirmInput("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetConfirmInput !== "RESET" || isResettingDb}
                onClick={handleResetDatabase}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isResettingDb ? "Mereset..." : "Ya, Reset Sekarang"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
