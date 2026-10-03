import React, { useState, useMemo } from "react";
import {
  Project,
  Task,
  TeamMember,
  TimeLog,
  FinancialTransaction,
  UserRole,
  TaskStatus,
} from "../types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Settings,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  Briefcase,
  CheckSquare,
  Users,
  Percent,
  Sliders,
  Filter,
  X,
  Printer,
  ShieldCheck,
  Building2,
  FileCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { formatIDR } from "./FinanceModule";
import { formatWorkDuration, formatWorkDurationShort, hoursToMandays } from "../lib/timeUtils";
import ProjectPDFModal from "../components/ProjectPDFModal";

interface ReportsModuleProps {
  activeProject: Project | null;
  projects?: Project[];
  tasks: Task[];
  members: TeamMember[];
  timeLogs?: TimeLog[];
  transactions?: FinancialTransaction[];
  userMember?: TeamMember | null;
  onSelectProject?: (projectId: string) => void;
}

export default function ReportsModule({
  activeProject,
  projects = [],
  tasks,
  members,
  timeLogs = [],
  transactions = [],
  userMember,
  onSelectProject,
}: ReportsModuleProps) {
  // S-Curve progress points for 5 Weeks
  const [sCurveData, setSCurveData] = useState([
    { name: "Minggu 1", Rencana: 15, Realisasi: 15 },
    { name: "Minggu 2", Rencana: 40, Realisasi: 35 },
    { name: "Minggu 3", Rencana: 65, Realisasi: 55 },
    { name: "Minggu 4", Rencana: 85, Realisasi: 80 },
    { name: "Minggu 5", Rencana: 100, Realisasi: 95 },
  ]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(2); // Default to Week 3
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "scurve" | "finance" | "tasks">("overview");

  // Export & PDF Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [exportScope, setExportScope] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [managerNotes, setManagerNotes] = useState<string>(
    "Proyek secara umum berjalan optimal. Target margin profit dan sisa pagu anggaran operasional berada dalam batas aman terkontrol."
  );

  const [exportSections, setExportSections] = useState({
    executive: true,
    scurve: true,
    financial: true,
    tasks: true,
    transactions: true,
    team: true,
  });

  const isAuthorizedManager =
    userMember?.role === UserRole.ADMIN || userMember?.role === UserRole.MANAGER;

  // Available months derived from transactions & task dates
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        monthSet.add(tx.date.substring(0, 7));
      }
    });
    tasks.forEach((t) => {
      if (t.due_date && t.due_date.length >= 7) {
        monthSet.add(t.due_date.substring(0, 7));
      }
    });
    // Add current month if empty
    monthSet.add("2026-08");
    monthSet.add("2026-07");
    return Array.from(monthSet).sort().reverse();
  }, [transactions, tasks]);

  // Filtered transactions based on active project & month
  const projectTransactions = useMemo(() => {
    let list = transactions;
    if (exportScope === "ACTIVE" && activeProject) {
      list = list.filter((t) => t.project_id === activeProject.id);
    }
    if (selectedMonth !== "ALL") {
      list = list.filter((t) => t.date && t.date.startsWith(selectedMonth));
    }
    return list;
  }, [transactions, activeProject, exportScope, selectedMonth]);

  // Filtered tasks based on active project
  const projectTasks = useMemo(() => {
    if (exportScope === "ACTIVE" && activeProject) {
      return tasks.filter((t) => t.project_id === activeProject.id);
    }
    return tasks;
  }, [tasks, activeProject, exportScope]);

  // Financial calculations
  const contractValue = activeProject?.contract_value || 150000000;
  const targetMarginPct = activeProject?.target_margin_pct || 30;
  const targetMarginAmount =
    activeProject?.target_margin_amount ||
    Math.round((contractValue * targetMarginPct) / 100);
  const budgetCap = contractValue - targetMarginAmount;

  const totalInflow = useMemo(() => {
    return projectTransactions
      .filter((t) => t.type === "IN")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [projectTransactions]);

  const totalOutflow = useMemo(() => {
    return projectTransactions
      .filter((t) => t.type === "OUT")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [projectTransactions]);

  const netCashflow = totalInflow - totalOutflow;
  const realizedMarginAmount = netCashflow;
  const realizedMarginPct =
    totalInflow > 0 ? Math.round((netCashflow / totalInflow) * 100) : 0;
  const remainingBudget = budgetCap - totalOutflow;

  // Health Status
  const financialHealth = useMemo(() => {
    if (totalOutflow > budgetCap || netCashflow < 0) {
      return {
        status: "Kritis / Defisit",
        color: "text-rose-600 bg-rose-50 border-rose-200",
        badge: "🔴 Defisit",
        desc: "Total pengeluaran melebihi batas anggaran yang direncanakan.",
      };
    }
    if (remainingBudget < budgetCap * 0.15 || realizedMarginPct < targetMarginPct * 0.7) {
      return {
        status: "Perlu Perhatian",
        color: "text-amber-600 bg-amber-50 border-amber-200",
        badge: "🟡 Warning",
        desc: "Sisa pagu anggaran menipis di bawah 15% atau margin tertekan.",
      };
    }
    return {
      status: "Sehat / Optimal",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      badge: "🟢 Optimal",
      desc: "Arus kas surplus dan margin laba sesuai dengan target rencana.",
    };
  }, [totalOutflow, budgetCap, netCashflow, remainingBudget, realizedMarginPct, targetMarginPct]);

  // Tasks statistics
  const doneTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
  const doingTasks = projectTasks.filter((t) => t.status === TaskStatus.DOING).length;
  const todoTasks = projectTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const totalTasksCount = projectTasks.length;
  const taskCompletionRate =
    totalTasksCount > 0 ? Math.round((doneTasks / totalTasksCount) * 100) : 0;

  const totalEstHours = projectTasks.reduce((sum, t) => sum + (t.est_hours || 0), 0);
  const totalLoggedHours = projectTasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0);

  // S-Curve Variance
  const plannedProgress = sCurveData[selectedWeekIdx].Rencana;
  const realizedProgress = sCurveData[selectedWeekIdx].Realisasi;
  const variance = realizedProgress - plannedProgress;

  const handleUpdateSCurveValue = (field: "Rencana" | "Realisasi", val: number) => {
    const newData = [...sCurveData];
    newData[selectedWeekIdx] = {
      ...newData[selectedWeekIdx],
      [field]: val,
    };
    setSCurveData(newData);
  };

  // -------------------------------------------------------------
  // EXPORT TO EXCEL (.CSV with UTF-8 BOM for Indonesian Character & Currency Encoding)
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    if (!activeProject) return;

    const reportTitle =
      exportScope === "ACTIVE"
        ? `Laporan_Performa_dan_Keuangan_${activeProject.name.replace(/\s+/g, "_")}`
        : `Laporan_Performa_dan_Keuangan_Global_Semua_Proyek`;

    const periodLabel =
      selectedMonth === "ALL" ? "Seluruh Periode Proyek (All-Time)" : `Bulan ${selectedMonth}`;

    let csv = "\uFEFF"; // UTF-8 BOM for Excel

    // HEADER SECTION
    csv += `EXVEN PROJECT MANAJEMEN BY KELOLAKAN - LAPORAN PERFORMA & KEUANGAN BULANAN\r\n`;
    csv += `Tanggal Dihasilkan,${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}\r\n`;
    csv += `Periode Laporan,${periodLabel}\r\n`;
    csv += `Nama Proyek,${exportScope === "ACTIVE" ? activeProject.name : "Semua Portofolio Proyek"}\r\n`;
    csv += `Divisi Penanggung Jawab,${exportScope === "ACTIVE" ? activeProject.division : "Lintas Divisi"}\r\n`;
    csv += `Manajer Proyek,${userMember?.name || "System Manager"} (${userMember?.email || "kelolakan@gmail.com"})\r\n`;
    csv += `Status Kesehatan Finansial,${financialHealth.status}\r\n`;
    csv += `Catatan Manajer,"${managerNotes.replace(/"/g, '""')}"\r\n\r\n`;

    // EXECUTIVE & FINANCIAL SUMMARY
    if (exportSections.executive || exportSections.financial) {
      csv += `--- RINGKASAN METRIK KEUANGAN & MARGIN ---\r\n`;
      csv += `Indikator Keuangan,Nilai Nominal / Persentase,Keterangan\r\n`;
      csv += `Nilai Kontrak Proyek,"Rp ${contractValue.toLocaleString("id-ID")}","Total nilai kontrak disepakati"\r\n`;
      csv += `Target Profit Margin (%),"${targetMarginPct}%","Target laba bersih yang ditetapkan"\r\n`;
      csv += `Target Nominal Margin,"Rp ${targetMarginAmount.toLocaleString("id-ID")}","Plafon profit yang diharapkan"\r\n`;
      csv += `Pagu Anggaran Operasional (Cap),"Rp ${budgetCap.toLocaleString("id-ID")}","Batas maksimal pengeluaran beban"\r\n`;
      csv += `Realisasi Kas Masuk (Inflow),"Rp ${totalInflow.toLocaleString("id-ID")}","Total penerimaan termin klien"\r\n`;
      csv += `Realisasi Kas Keluar (Outflow),"Rp ${totalOutflow.toLocaleString("id-ID")}","Total beban operasional terealisasi"\r\n`;
      csv += `Kas Bersih / Net Surplus,"Rp ${netCashflow.toLocaleString("id-ID")}","Selisih kas masuk vs kas keluar"\r\n`;
      csv += `Margin Aktual Terealisasi (%),"${realizedMarginPct}%","Margin terhadap penerimaan kas masuk"\r\n`;
      csv += `Sisa Pagu Anggaran Operasional,"Rp ${remainingBudget.toLocaleString("id-ID")}","Sisa kapasitas pengeluaran biaya"\r\n\r\n`;
    }

    // S-CURVE PHYSICAL PERFORMANCE
    if (exportSections.scurve) {
      csv += `--- ANALISIS KURVA S & PROGRES FISIK MINGGUAN ---\r\n`;
      csv += `Minggu Evaluasi,Target Rencana (%),Realisasi Aktual (%),Deviasi Variance (%),Status Keterlambatan\r\n`;
      sCurveData.forEach((row) => {
        const diff = row.Realisasi - row.Rencana;
        const status = diff >= 0 ? "Ahead / On Track" : "Behind Schedule (Delay)";
        csv += `${row.name},${row.Rencana}%,${row.Realisasi}%,${diff >= 0 ? "+" : ""}${diff}%,${status}\r\n`;
      });
      csv += `\r\n`;
    }

    // TASK PRODUCTIVITY & HOURS
    if (exportSections.tasks) {
      csv += `--- REKAPITULASI PRODUKTIVITAS TUGAS & WAKTU KERJA (1 HARI = 8 JAM) ---\r\n`;
      csv += `Total Tugas,Tugas Selesai (Done),Tugas Dikerjakan (Doing),Tugas Antrean (Todo),Tingkat Penyelesaian (%),Total Estimasi (Jam),Total Estimasi (Hari),Total Aktual (Jam),Total Aktual (Hari)\r\n`;
      csv += `${totalTasksCount},${doneTasks},${doingTasks},${todoTasks},${taskCompletionRate}%,${totalEstHours} Jam,${hoursToMandays(totalEstHours)} Hari,${totalLoggedHours} Jam,${hoursToMandays(totalLoggedHours)} Hari\r\n\r\n`;

      csv += `--- DAFTAR RINCIAN TUGAS & MILESTONE ---\r\n`;
      csv += `ID Tugas,Judul Tugas,Assignee,Prioritas,Status,Estimasi (Jam),Estimasi (Hari Kerja),Aktual (Jam),Aktual (Hari Kerja),Tenggat Waktu\r\n`;
      projectTasks.forEach((t) => {
        csv += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.assignee_name}","${t.priority}","${t.status}",${t.est_hours || 0},${hoursToMandays(t.est_hours || 0)},${t.logged_hours || 0},${hoursToMandays(t.logged_hours || 0)},"${t.due_date}"\r\n`;
      });
      csv += `\r\n`;
    }

    // FINANCIAL TRANSACTIONS LEDGER
    if (exportSections.transactions) {
      csv += `--- BUKU BESAR RINCIAN TRANSAKSI KEUANGAN ---\r\n`;
      csv += `ID Transaksi,Tanggal,Jenis Kas,Kategori,Jumlah (IDR),Deskripsi,No. Referensi / Invoice,Dibuat Oleh\r\n`;
      projectTransactions.forEach((tx) => {
        const typeLabel = tx.type === "IN" ? "KAS MASUK (IN)" : "KAS KELUAR (OUT)";
        csv += `"${tx.id}","${tx.date}","${typeLabel}","${tx.category}","Rp ${tx.amount.toLocaleString("id-ID")}","${tx.description.replace(/"/g, '""')}","${tx.reference || "-"}","${tx.created_by}"\r\n`;
      });
      csv += `\r\n`;
    }

    // SIGNATURE & FOOTER
    csv += `--- PENGESAHAN LAPORAN ---\r\n`;
    csv += `Dibuat Oleh,Project Manager / Admin: ${userMember?.name || "kelolakan@gmail.com"}\r\n`;
    csv += `Disetujui Oleh,Division Head / Management\r\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${reportTitle}_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // PDF EXPORT / PRINT HANDLER
  // -------------------------------------------------------------
  const handlePrintPDF = () => {
    window.print();
  };

  if (!activeProject && projects.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <TrendingUp className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan buka modul **Projects** terlebih dahulu dan buat atau pilih salah satu proyek aktif untuk mulai melihat laporan performa dan data keuangan.
        </p>
      </div>
    );
  }

  const currentProject = activeProject || projects[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* Top Header & Export Action Hub (Hidden when printing PDF) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-800">Laporan & Analisis Performa Proyek</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Reports Hub
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Evaluasi kinerja bulanan, deviasi Kurva-S, dan rekapitulasi data keuangan & margin proyek.
            </p>
          </div>
        </div>

        {/* Action Buttons: Export Report & Quick Print */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Switcher if available */}
          {projects.length > 1 && onSelectProject && (
            <div className="relative">
              <select
                value={currentProject?.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-gray-700 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.division})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          )}

          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-gray-700 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            >
              <option value="ALL">Semua Bulan (All-Time)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Quick 1-Click Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            title="Unduh langsung ringkasan ke format Excel (.CSV)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Quick 1-Click PDF */}
          <button
            onClick={() => setShowPDFModal(true)}
            className="px-3.5 py-2 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            title="Cetak dan kustomisasi laporan performa proyek ke format PDF"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Cetak PDF</span>
          </button>

          {/* Main "Export Report" Master Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
            {isAuthorizedManager && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* Printable Project Header for PDF Generation (Visible ONLY when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">EXVEN PROJECT MANAJEMEN</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">by Kelolakan</p>
            <h2 className="text-sm font-bold text-indigo-700 mt-1 uppercase tracking-wide">
              Laporan Resmi Kinerja Bulanan & Pengendalian Keuangan Proyek
            </h2>
          </div>
          <div className="text-right text-[10px] text-gray-500">
            <p className="font-bold text-slate-800">Tanggal Dihasilkan: {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
            <p>Periode: {selectedMonth === "ALL" ? "Seluruh Masa Proyek" : `Bulan ${selectedMonth}`}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-gray-200 text-xs">
          <div>
            <span className="text-gray-400 text-[10px] font-bold uppercase block">Nama Proyek</span>
            <span className="font-bold text-slate-800">{currentProject.name}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] font-bold uppercase block">Divisi Penanggung Jawab</span>
            <span className="font-bold text-slate-800">Divisi {currentProject.division}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] font-bold uppercase block">Tenggat Waktu</span>
            <span className="font-bold text-slate-800">{currentProject.start_date} s/d {currentProject.end_date}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] font-bold uppercase block">Status Finansial</span>
            <span className="font-bold text-emerald-700">{financialHealth.status}</span>
          </div>
        </div>

        {managerNotes && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block text-[10px] uppercase">Catatan Eksekutif Manajer:</span>
            <p className="text-slate-600 mt-0.5 italic">{managerNotes}</p>
          </div>
        )}
      </div>

      {/* KPI Performance Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Contract Value & Target Margin */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nilai Kontrak Proyek</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black text-gray-900">{formatIDR(contractValue)}</span>
            <p className="text-[10px] text-purple-700 font-semibold mt-0.5">
              Target Margin: {targetMarginPct}% ({formatIDR(targetMarginAmount)})
            </p>
          </div>
        </div>

        {/* Metric 2: Realized Inflow */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Termin Masuk (Inflow)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black text-emerald-600">{formatIDR(totalInflow)}</span>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Realisasi: {contractValue > 0 ? Math.round((totalInflow / contractValue) * 100) : 0}% dari kontrak
            </p>
          </div>
        </div>

        {/* Metric 3: Realized Outflow & Budget Cap */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kas Keluar (Beban Biaya)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black text-rose-600">{formatIDR(totalOutflow)}</span>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Pagu Anggaran: {formatIDR(budgetCap)}
            </p>
          </div>
        </div>

        {/* Metric 4: Net Surplus & Margin Health */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Surplus Kas & Margin</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className={`text-lg font-black ${netCashflow >= 0 ? "text-purple-700" : "text-rose-600"}`}>
              {formatIDR(netCashflow)}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${financialHealth.color}`}>
                {financialHealth.badge}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Margin {realizedMarginPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Hidden when printing) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "overview"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Kurva S & Analisis Fisik</span>
        </button>

        <button
          onClick={() => setActiveSubTab("finance")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "finance"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Rekapitulasi Keuangan & Margin</span>
        </button>

        <button
          onClick={() => setActiveSubTab("tasks")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "tasks"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Produktivitas Tugas & Tim</span>
        </button>
      </div>

      {/* VIEW 1: S-CURVE & PHYSICAL PROGRESS */}
      {(activeSubTab === "overview" || activeSubTab === "scurve") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* S-Curve Chart Area */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4 print:border-slate-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Grafik Akumulatif Progress Fisik (%)</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Membandingkan garis target rencana terhadap realisasi kemajuan pekerjaan aktual</p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${variance >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                Deviasi: {variance >= 0 ? `+${variance}% (Ahead)` : `${variance}% (Delay)`}
              </span>
            </div>

            <div className="h-72 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRencana" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRealisasi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="Rencana"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRencana)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Realisasi"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRealisasi)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* S-Curve Printable Data Table */}
            <div className="pt-3 border-t border-gray-100">
              <h5 className="text-xs font-bold text-gray-700 mb-2">Tabel Rekapitulasi Deviasi Mingguan</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                      <th className="py-2">Minggu</th>
                      <th className="py-2">Rencana (%)</th>
                      <th className="py-2">Realisasi (%)</th>
                      <th className="py-2">Deviasi (Variance)</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sCurveData.map((w, idx) => {
                      const diff = w.Realisasi - w.Rencana;
                      return (
                        <tr key={idx} className={selectedWeekIdx === idx ? "bg-indigo-50/50 font-semibold" : ""}>
                          <td className="py-2 font-bold text-gray-800">{w.name}</td>
                          <td className="py-2 text-indigo-600">{w.Rencana}%</td>
                          <td className="py-2 text-emerald-600">{w.Realisasi}%</td>
                          <td className={`py-2 font-bold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {diff >= 0 ? `+${diff}%` : `${diff}%`}
                          </td>
                          <td className="py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${diff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {diff >= 0 ? "On Track" : "Delay"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Configuration Panel for Curve adjusting & Variance (Hidden when printing) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 print:hidden">
            <div>
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-indigo-500" /> Pengaturan Data Mingguan
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Sesuaikan parameter kurva s untuk simulasi evaluasi mingguan</p>
            </div>

            {/* Week Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Pilih Minggu Evaluasi</label>
              <div className="grid grid-cols-5 gap-1">
                {sCurveData.map((week, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedWeekIdx(idx)}
                    className={`py-2 rounded-xl text-center text-xs font-bold transition-all duration-150 cursor-pointer ${
                      selectedWeekIdx === idx
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                        : "bg-slate-50 border border-slate-100 hover:border-gray-300 text-slate-700"
                    }`}
                  >
                    M{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-3 border-t border-gray-100">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-semibold">Progress Rencana:</span>
                  <span className="font-bold text-indigo-600">{plannedProgress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={plannedProgress}
                  onChange={(e) => handleUpdateSCurveValue("Rencana", Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-semibold">Progress Realisasi:</span>
                  <span className="font-bold text-emerald-600">{realizedProgress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={realizedProgress}
                  onChange={(e) => handleUpdateSCurveValue("Realisasi", Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Analysis Variance Widget */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="block text-[9px] font-bold text-slate-400 uppercase">Deviasi Proyek (Variance)</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Status Pekerjaan:</span>
                <span className={`text-xs font-black uppercase ${variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {variance >= 0 ? "Sesuai / Lebih Cepat" : "Terlambat (Delay)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Selisih Kemajuan:</span>
                <span className={`text-sm font-black ${variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {variance >= 0 ? `+${variance}%` : `${variance}%`}
                </span>
              </div>
            </div>

            {/* Quick Export Trigger in side panel */}
            <div className="pt-2">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Laporan Bulanan (Export)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FINANCIAL & MARGIN RECAPITULATION */}
      {(activeSubTab === "finance" || activeSubTab === "overview") && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Rekapitulasi Buku Besar Keuangan Proyek</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Daftar transaksi termin pembayaran klien dan beban biaya operasional ({projectTransactions.length} transaksi)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  Total Arus Kas Masuk: <strong className="text-emerald-600">{formatIDR(totalInflow)}</strong>
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-xs font-semibold text-gray-500">
                  Total Kas Keluar: <strong className="text-rose-600">{formatIDR(totalOutflow)}</strong>
                </span>
              </div>
            </div>

            {projectTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-gray-400">
                Belum ada transaksi keuangan yang tercatat untuk periode atau proyek ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                      <th className="py-2.5">Tanggal</th>
                      <th className="py-2.5">Jenis</th>
                      <th className="py-2.5">Kategori</th>
                      <th className="py-2.5">Keterangan</th>
                      <th className="py-2.5">No. Ref</th>
                      <th className="py-2.5 text-right">Jumlah (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {projectTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 font-medium text-gray-600">{tx.date}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === "IN"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {tx.type === "IN" ? "Kas Masuk" : "Kas Keluar"}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-gray-800">{tx.category}</td>
                        <td className="py-2.5 text-gray-600 max-w-xs truncate">{tx.description}</td>
                        <td className="py-2.5 text-gray-400 font-mono text-[10px]">{tx.reference || "-"}</td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            tx.type === "IN" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {tx.type === "IN" ? `+${formatIDR(tx.amount)}` : `-${formatIDR(tx.amount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: TASK PRODUCTIVITY & TEAM PERFORMANCE */}
      {(activeSubTab === "tasks" || activeSubTab === "overview") && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-gray-800 text-sm">Produktivitas Tugas & Alokasi Waktu Kerja</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Monitoring penyelesaian milestone dan perbandingan estimasi vs realisasi kerja (Jam & Mandays: 8j/hari)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 font-medium">
                Penyelesaian: <strong className="text-indigo-600">{taskCompletionRate}%</strong> ({doneTasks}/{totalTasksCount} tugas)
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 font-medium">
                Total Waktu: <strong className="text-purple-600">{totalLoggedHours}j ({hoursToMandays(totalLoggedHours)}h)</strong> / {totalEstHours}j ({hoursToMandays(totalEstHours)}h)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Judul Tugas</th>
                  <th className="py-2.5">Assignee</th>
                  <th className="py-2.5">Prioritas</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Est. Waktu</th>
                  <th className="py-2.5">Realisasi Kerja</th>
                  <th className="py-2.5">Tenggat Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projectTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-gray-800">{t.title}</td>
                    <td className="py-2.5 text-gray-600">{t.assignee_name}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === "High"
                            ? "bg-rose-50 text-rose-700"
                            : t.priority === "Medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === TaskStatus.DONE
                            ? "bg-emerald-50 text-emerald-700"
                            : t.status === TaskStatus.DOING
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-600 font-medium">
                      <span>{t.est_hours || 0} Jam</span>
                      <span className="text-[10px] text-gray-400 block font-normal">
                        ({hoursToMandays(t.est_hours || 0)} Mandays)
                      </span>
                    </td>
                    <td className="py-2.5 text-purple-700 font-bold">
                      <span>{t.logged_hours || 0} Jam</span>
                      <span className="text-[10px] text-purple-400 block font-normal">
                        ({hoursToMandays(t.logged_hours || 0)} Mandays)
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">{t.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Sign-off block for PDF Print (Visible ONLY when printing) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-300 text-xs">
        <div className="text-center space-y-12">
          <p className="text-gray-500">Dibuat Oleh,</p>
          <div className="border-t border-gray-400 w-48 mx-auto pt-1 font-bold text-slate-800">
            {userMember?.name || "Project Manager"}
            <span className="block text-[10px] text-gray-400 font-normal">Project Manager / Division Lead</span>
          </div>
        </div>
        <div className="text-center space-y-12">
          <p className="text-gray-500">Disetujui Oleh,</p>
          <div className="border-t border-gray-400 w-48 mx-auto pt-1 font-bold text-slate-800">
            Head of Operations
            <span className="block text-[10px] text-gray-400 font-normal">Division Head / Executive Board</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPORT REPORT CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Export Report & Rekapitulasi Bulanan</h3>
                  <p className="text-xs text-indigo-200">
                    Konfigurasi parameter unduhan laporan proyek ke format Excel (CSV) dan PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Form */}
            <div className="p-6 space-y-5 text-xs text-gray-700">
              {/* Row 1: Scope & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px]">Cakupan Proyek</label>
                  <select
                    value={exportScope}
                    onChange={(e) => setExportScope(e.target.value as "ACTIVE" | "ALL")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Proyek Aktif Saat Ini ({currentProject.name})</option>
                    <option value="ALL">Semua Portofolio Proyek (Global Overview)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px]">Periode Laporan</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Seluruh Periode Proyek (All-Time)</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        Bulan {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Sections to Include */}
              <div className="space-y-2">
                <label className="font-bold text-gray-500 uppercase text-[10px] block">Komponen Laporan yang Disertakan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.executive}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, executive: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Ringkasan Eksekutif</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.financial}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, financial: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Kinerja Finansial & Margin</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.scurve}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, scurve: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Kurva-S & Deviasi Fisik</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.transactions}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, transactions: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Buku Besar Transaksi</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.tasks}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, tasks: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Daftar Rincian Tugas</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSections.team}
                      onChange={(e) =>
                        setExportSections({ ...exportSections, team: e.target.checked })
                      }
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-gray-700">Jam Kerja Tim</span>
                  </label>
                </div>
              </div>

              {/* Row 3: Manager Executive Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-500 uppercase text-[10px]">
                  Catatan / Rekomendasi Manajer Proyek (Akan dicetak pada Laporan)
                </label>
                <textarea
                  rows={3}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Tuliskan catatan evaluasi manajerial atau rekomendasi untuk direksi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Live Preview Summary Card inside Modal */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span>Pratinjau Ringkasan Laporan:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${financialHealth.color}`}>
                    {financialHealth.badge}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1">
                  <div>
                    <span className="text-gray-400 block text-[9px]">Nilai Kontrak:</span>
                    <strong>{formatIDR(contractValue)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px]">Net Surplus Kas:</span>
                    <strong className="text-emerald-700">{formatIDR(netCashflow)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px]">Progress Fisik (S-Curve):</span>
                    <strong className="text-indigo-700">{realizedProgress}% (Dev: {variance >= 0 ? `+${variance}%` : `${variance}%`})</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    setShowPDFModal(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Kustomisasi & Cetak PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel();
                    setShowExportModal(false);
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/20"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Excel (.CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Professional FTTH/Construction PDF Report & Print Modal */}
      {currentProject && (
        <ProjectPDFModal
          isOpen={showPDFModal}
          onClose={() => setShowPDFModal(false)}
          activeProject={currentProject}
          projects={projects}
          tasks={tasks}
          members={members}
          transactions={transactions}
          userMember={userMember}
          sCurveData={sCurveData}
          selectedWeekIdx={selectedWeekIdx}
          onExportExcel={handleExportExcel}
        />
      )}
    </div>
  );
}
