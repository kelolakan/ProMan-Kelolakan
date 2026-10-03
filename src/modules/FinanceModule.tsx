import React, { useState, useMemo } from "react";
import {
  Project,
  FinancialTransaction,
  FinancialSCurvePoint,
  TeamMember,
  UserRole,
  TransactionType,
} from "../types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileSpreadsheet,
  FileText,
  PieChart as PieIcon,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Receipt,
  Building2,
  Sliders,
  X,
  Trash2,
  Percent,
  Wallet,
  Coins,
  CreditCard,
  Zap,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface FinanceModuleProps {
  activeProject: Project | null;
  projects: Project[];
  transactions: FinancialTransaction[];
  userMember: TeamMember | null;
  onAddTransaction: (transaction: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateProjectFinance: (
    projectId: string,
    contractValue: number,
    targetMarginPct: number,
    targetMarginAmount: number
  ) => void;
}

// Currency formatter helper
export function formatIDR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const CATEGORY_COLORS: { [key: string]: string } = {
  "Termin 1 (DP 30%)": "#10b981",
  "Termin 2 (Progress 40%)": "#059669",
  "Termin Pelunasan": "#047857",
  "Infrastruktur & Server": "#6366f1",
  "Honor / Gaji Tim": "#8b5cf6",
  "Lisensi Software & API": "#3b82f6",
  "Operasional & Meeting": "#f59e0b",
  "Material & Logistik": "#ec4899",
  "Subkontraktor / Vendor": "#14b8a6",
  "Digital Ads Spend": "#f43f5e",
  "Peralatan & Aset": "#eab308",
  "Lain-lain": "#64748b",
};

const PIE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#eab308",
  "#64748b",
  "#10b981",
];

export default function FinanceModule({
  activeProject,
  projects,
  transactions,
  userMember,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateProjectFinance,
}: FinanceModuleProps) {
  // Filter and Form States
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showMitigationModal, setShowMitigationModal] = useState<boolean>(false);

  // Alert Settings
  const [alertThresholdPct, setAlertThresholdPct] = useState<number>(80);

  // Form states for New Transaction
  const [txType, setTxType] = useState<TransactionType>("OUT");
  const [txCategory, setTxCategory] = useState<string>("Material & Logistik");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [txDescription, setTxDescription] = useState<string>("");
  const [txReference, setTxReference] = useState<string>("");

  // Budget & Target Margin Editor state
  const [editContractValue, setEditContractValue] = useState<string>(
    activeProject?.contract_value?.toString() || "150000000"
  );
  const [editMarginPct, setEditMarginPct] = useState<string>(
    activeProject?.target_margin_pct?.toString() || "30"
  );
  const [editMarginAmount, setEditMarginAmount] = useState<string>(
    activeProject?.target_margin_amount?.toString() || "45000000"
  );

  // Sync state when activeProject changes
  React.useEffect(() => {
    if (activeProject) {
      const cv = activeProject.contract_value || 150000000;
      const mp = activeProject.target_margin_pct || 30;
      const ma =
        activeProject.target_margin_amount || Math.round((cv * mp) / 100);
      setEditContractValue(cv.toString());
      setEditMarginPct(mp.toString());
      setEditMarginAmount(ma.toString());
    }
  }, [activeProject]);

  const isAuthorized =
    userMember?.role === UserRole.ADMIN ||
    userMember?.role === UserRole.MANAGER;

  // Project Transactions
  const projectTransactions = useMemo(() => {
    if (!activeProject) return [];
    return transactions.filter((t) => t.project_id === activeProject.id);
  }, [transactions, activeProject]);

  // Financial Calculations
  const contractValue = activeProject?.contract_value || 150000000;
  const targetMarginPct = activeProject?.target_margin_pct || 30;
  const targetMarginAmount =
    activeProject?.target_margin_amount ||
    Math.round((contractValue * targetMarginPct) / 100);
  const maxHppBudget = contractValue - targetMarginAmount; // Max allowed expenses

  // Realized Inflow and Outflow
  const totalCashIn = useMemo(() => {
    return projectTransactions
      .filter((t) => t.type === "IN")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [projectTransactions]);

  const totalCashOut = useMemo(() => {
    return projectTransactions
      .filter((t) => t.type === "OUT")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [projectTransactions]);

  const netCashflow = totalCashIn - totalCashOut;
  const remainingHppBudget = maxHppBudget - totalCashOut;
  const projectedMargin = contractValue - totalCashOut;
  const projectedMarginPct =
    contractValue > 0
      ? Math.round((projectedMargin / contractValue) * 100 * 10) / 10
      : 0;

  const inPctOfContract =
    contractValue > 0 ? Math.round((totalCashIn / contractValue) * 100 * 10) / 10 : 0;
  const outPctOfBudget =
    maxHppBudget > 0 ? Math.round((totalCashOut / maxHppBudget) * 100 * 10) / 10 : 0;
  const outPctOfContract =
    contractValue > 0 ? Math.round((totalCashOut / contractValue) * 100 * 10) / 10 : 0;

  // Threshold nominal markers (80% / Configurable)
  const budgetThresholdNominal = maxHppBudget * (alertThresholdPct / 100);
  const contractThresholdNominal = contractValue * (alertThresholdPct / 100);

  // Alert State Flags
  const isOverBudget = totalCashOut > maxHppBudget;
  const isNearBudgetLimit = outPctOfBudget >= alertThresholdPct;
  const isNearContractLimit = outPctOfContract >= alertThresholdPct;
  const isMarginThreatened =
    projectedMarginPct < targetMarginPct * (alertThresholdPct / 100) ||
    projectedMarginPct < targetMarginPct - 5;
  const hasActiveAlert = isOverBudget || isNearBudgetLimit || isNearContractLimit || isMarginThreatened;

  // Health Score Determination
  const healthStatus = useMemo(() => {
    if (totalCashOut > maxHppBudget || netCashflow < 0) {
      return {
        label: "Kritis (Overbudget / Defisit)",
        badgeBg: "bg-red-50 text-red-700 border-red-200",
        indicator: "bg-red-500",
        description:
          "Pengeluaran telah melebihi batas plafon HPP atau arus kas saat ini defisit!",
        icon: AlertTriangle,
        color: "text-red-600",
      };
    }
    if (outPctOfBudget >= alertThresholdPct || outPctOfContract >= alertThresholdPct || isMarginThreatened) {
      return {
        label: `Peringatan (${outPctOfBudget}% Plafon / Ambang ${alertThresholdPct}%)`,
        badgeBg: "bg-amber-50 text-amber-800 border-amber-300",
        indicator: "bg-amber-500",
        description: `Pengeluaran sudah mendekati/mencapai ${outPctOfBudget}% dari plafon anggaran HPP. Segera lakukan pengendalian biaya!`,
        icon: AlertTriangle,
        color: "text-amber-600",
      };
    }
    return {
      label: "Sehat (On-Track)",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      indicator: "bg-emerald-500",
      description:
        "Arus kas surplus, pengeluaran terkendali, dan target profit margin terpenuhi.",
      icon: CheckCircle2,
      color: "text-emerald-600",
    };
  }, [
    totalCashOut,
    maxHppBudget,
    netCashflow,
    outPctOfBudget,
    outPctOfContract,
    alertThresholdPct,
    isMarginThreatened,
  ]);

  // Expenses Category Breakdown for Donut Chart
  const expensesByCategory = useMemo(() => {
    const map: { [key: string]: number } = {};
    projectTransactions
      .filter((t) => t.type === "OUT")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.keys(map)
      .map((cat) => ({
        name: cat,
        value: map[cat],
      }))
      .sort((a, b) => b.value - a.value);
  }, [projectTransactions]);

  // Financial S-Curve 5-Week Progressive Data
  const financialSCurveData = useMemo(() => {
    // Standard baseline distribution of plan vs actuals
    const totalOut = totalCashOut > 0 ? totalCashOut : 45900000;
    const totalIn = totalCashIn > 0 ? totalCashIn : 105000000;
    const targetHpp = maxHppBudget > 0 ? maxHppBudget : 105000000;

    return [
      {
        name: "M-1",
        label: "Minggu 1",
        "Rencana Biaya": Math.round(targetHpp * 0.15),
        "Realisasi Pengeluaran": Math.round(totalOut * 0.2),
        "Realisasi Kas Masuk": Math.round(totalIn * 0.42),
      },
      {
        name: "M-2",
        label: "Minggu 2",
        "Rencana Biaya": Math.round(targetHpp * 0.38),
        "Realisasi Pengeluaran": Math.round(totalOut * 0.52),
        "Realisasi Kas Masuk": Math.round(totalIn * 0.42),
      },
      {
        name: "M-3",
        label: "Minggu 3",
        "Rencana Biaya": Math.round(targetHpp * 0.65),
        "Realisasi Pengeluaran": Math.round(totalOut * 0.78),
        "Realisasi Kas Masuk": Math.round(totalIn * 0.85),
      },
      {
        name: "M-4",
        label: "Minggu 4",
        "Rencana Biaya": Math.round(targetHpp * 0.85),
        "Realisasi Pengeluaran": Math.round(totalOut * 0.94),
        "Realisasi Kas Masuk": Math.round(totalIn * 1.0),
      },
      {
        name: "M-5",
        label: "Minggu 5 (Target)",
        "Rencana Biaya": targetHpp,
        "Realisasi Pengeluaran": totalOut,
        "Realisasi Kas Masuk": totalIn,
      },
    ];
  }, [totalCashOut, totalCashIn, maxHppBudget]);

  // Handle Target Margin Calculation Sync in Modal
  const handleMarginPctChange = (pctStr: string) => {
    setEditMarginPct(pctStr);
    const pct = parseFloat(pctStr) || 0;
    const cv = parseFloat(editContractValue) || 0;
    const calculatedAmount = Math.round((cv * pct) / 100);
    setEditMarginAmount(calculatedAmount.toString());
  };

  const handleMarginAmountChange = (amtStr: string) => {
    setEditMarginAmount(amtStr);
    const amt = parseFloat(amtStr) || 0;
    const cv = parseFloat(editContractValue) || 0;
    if (cv > 0) {
      const calculatedPct = Math.round((amt / cv) * 100 * 10) / 10;
      setEditMarginPct(calculatedPct.toString());
    }
  };

  const handleContractValueChange = (cvStr: string) => {
    setEditContractValue(cvStr);
    const cv = parseFloat(cvStr) || 0;
    const pct = parseFloat(editMarginPct) || 0;
    const calculatedAmount = Math.round((cv * pct) / 100);
    setEditMarginAmount(calculatedAmount.toString());
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const cv = parseFloat(editContractValue) || 0;
    const mp = parseFloat(editMarginPct) || 0;
    const ma = parseFloat(editMarginAmount) || 0;

    if (cv <= 0) {
      alert("Nilai proyek harus lebih besar dari 0!");
      return;
    }

    onUpdateProjectFinance(activeProject.id, cv, mp, ma);
    setShowConfigModal(false);
  };

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const numAmount = parseFloat(txAmount.replace(/[^0-9]/g, ""));
    if (!numAmount || numAmount <= 0) {
      alert("Masukkan nominal transaksi yang valid!");
      return;
    }

    const newTx: FinancialTransaction = {
      id: "ft-" + Math.random().toString(36).substr(2, 9),
      project_id: activeProject.id,
      type: txType,
      category: txCategory,
      amount: numAmount,
      date: txDate || new Date().toISOString().split("T")[0],
      description: txDescription || `Transaksi ${txCategory}`,
      reference: txReference || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      created_by: userMember?.email || "kelolakan@gmail.com",
      created_at: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setTxAmount("");
    setTxDescription("");
    setTxReference("");
    setShowAddModal(false);
  };

  // CSV Export for Financial Report
  const handleExportCSV = () => {
    if (!activeProject) return;

    let csv = "data:text/csv;charset=utf-8,";
    csv += `LAPORAN KEUANGAN PROYEK: ${activeProject.name}\n`;
    csv += `Divisi: ${activeProject.division}\n`;
    csv += `Nilai Total Proyek: ${contractValue}\n`;
    csv += `Target Margin: ${targetMarginPct}% (${targetMarginAmount})\n`;
    csv += `Plafon Anggaran HPP: ${maxHppBudget}\n`;
    csv += `Total Kas Masuk: ${totalCashIn}\n`;
    csv += `Total Pengeluaran: ${totalCashOut}\n`;
    csv += `Net Cashflow: ${netCashflow}\n\n`;

    csv += "ID,Tanggal,Jenis,Kategori,Nominal,Deskripsi,Referensi,Dicatat Oleh\n";

    projectTransactions.forEach((tx) => {
      csv += `"${tx.id}","${tx.date}","${tx.type === "IN" ? "Uang Masuk" : "Uang Keluar"}","${tx.category}","${tx.amount}","${tx.description.replace(/"/g, '""')}","${tx.reference || ""}","${tx.created_by}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Keuangan_${activeProject.name.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan pilih salah satu proyek aktif di menu atas untuk melihat dan
          mengendalikan arus kas finansial proyek.
        </p>
      </div>
    );
  }

  // Filtered transactions for table
  const filteredTransactions = projectTransactions.filter((t) => {
    if (filterType !== "ALL" && t.type !== filterType) return false;
    if (selectedCategory !== "ALL" && t.category !== selectedCategory)
      return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              Kontrol Finansial & Profitabilitas Proyek
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${healthStatus.badgeBg}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${healthStatus.indicator} animate-pulse`}
              ></span>
              {healthStatus.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Proyek: <strong className="text-gray-700">{activeProject.name}</strong>{" "}
            • Divisi {activeProject.division}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isAuthorized && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Target & Nilai Proyek</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>

          {isAuthorized && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/15 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>
          )}
        </div>
      </div>

      {/* Automated Cost Alert Banner (80% Threshold Warning) */}
      {hasActiveAlert && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all print:hidden ${
            isOverBudget
              ? "bg-red-50/90 border-red-200 text-red-900 shadow-sm"
              : "bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isOverBudget
                    ? "bg-red-100 text-red-600 border border-red-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}
              >
                {isOverBudget ? (
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                ) : (
                  <BellRing className="w-5 h-5 animate-bounce" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isOverBudget
                        ? "bg-red-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {isOverBudget ? "CRITICAL: OVERBUDGET" : `PERINGATAN DINI BIAYA (>= ${alertThresholdPct}%)`}
                  </span>
                  <span className="text-xs font-bold">
                    {isOverBudget
                      ? "Pengeluaran proyek telah melampaui batas plafon anggaran HPP!"
                      : `Akumulasi pengeluaran sudah mencapai ${outPctOfBudget}% dari plafon HPP (${outPctOfContract}% dari nilai kontrak)!`}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {isOverBudget ? (
                    <>
                      Total biaya terealisasi sebesar <strong>{formatIDR(totalCashOut)}</strong> telah melebihi plafon HPP <strong>{formatIDR(maxHppBudget)}</strong>. Profit margin tergerus defisit sebesar <strong>{formatIDR(Math.abs(remainingHppBudget))}</strong>.
                    </>
                  ) : (
                    <>
                      Pengeluaran proyek telah melewati batas ambang aman <strong>{alertThresholdPct}%</strong> (Batas: {formatIDR(budgetThresholdNominal)}). Sisa alokasi dana operasional yang diizinkan tinggal <strong>{formatIDR(remainingHppBudget)}</strong> sebelum target profit margin terganggu.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-4 text-[11px] font-medium pt-1">
                  <span className="text-gray-500">
                    Target Margin: <strong>{targetMarginPct}% ({formatIDR(targetMarginAmount)})</strong>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className={projectedMarginPct < targetMarginPct ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
                    Proyeksi Margin Akhir: <strong>{projectedMarginPct}% ({formatIDR(projectedMargin)})</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                onClick={() => setShowMitigationModal(true)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                  isOverBudget
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Panduan Mitigasi Biaya</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet Header (Visible Only in Print Mode) */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-2xl font-black text-gray-900">
          EXVEN PROJECT MANAJEMEN
        </h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          by Kelolakan
        </p>
        <h2 className="text-sm font-bold text-indigo-700 mt-1">
          Laporan Resmi Keuangan & Arus Kas Proyek
        </h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
          <div>
            <span className="text-gray-400 font-semibold block">Proyek:</span>
            <span className="font-bold text-gray-800">
              {activeProject.name} (Divisi {activeProject.division})
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">Nilai Total Proyek:</span>
            <span className="font-bold text-gray-800">
              {formatIDR(contractValue)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">
              Target Margin Profit:
            </span>
            <span className="font-bold text-gray-800">
              {targetMarginPct}% ({formatIDR(targetMarginAmount)})
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">
              Plafon Anggaran Biaya HPP:
            </span>
            <span className="font-bold text-gray-800">
              {formatIDR(maxHppBudget)}
            </span>
          </div>
        </div>
      </div>

      {/* 5 High-Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Nilai Proyek */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              1. Nilai Proyek
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="block text-lg font-black text-gray-900 leading-tight">
              {formatIDR(contractValue)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-1">
              Nilai Kontrak Total
            </span>
          </div>
        </div>

        {/* 2. Target Margin & Plafon HPP */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              2. Target Margin ({targetMarginPct}%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="block text-lg font-black text-purple-700 leading-tight">
              {formatIDR(targetMarginAmount)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-1">
              Batas HPP: {formatIDR(maxHppBudget)}
            </span>
          </div>
        </div>

        {/* 3. Uang Masuk (Revenue) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              3. Uang Masuk (Inflow)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="block text-lg font-black text-emerald-600 leading-tight">
              {formatIDR(totalCashIn)}
            </span>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>{inPctOfContract}% dari kontrak</span>
              <span>{projectTransactions.filter((t) => t.type === "IN").length} Termin</span>
            </div>
          </div>
        </div>

        {/* 4. Uang Keluar (Expenses) */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
            isOverBudget
              ? "bg-red-50/70 border-red-200"
              : isNearBudgetLimit
              ? "bg-amber-50/70 border-amber-300"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                4. Uang Keluar (Cost)
              </span>
              {hasActiveAlert && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOverBudget ? "bg-red-600 animate-ping" : "bg-amber-500 animate-pulse"
                  }`}
                  title={`Status: ${outPctOfBudget}% dari Plafon HPP`}
                />
              )}
            </div>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isOverBudget
                  ? "bg-red-100 text-red-600"
                  : isNearBudgetLimit
                  ? "bg-amber-100 text-amber-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`block text-lg font-black leading-tight ${
                isOverBudget
                  ? "text-red-700"
                  : isNearBudgetLimit
                  ? "text-amber-800"
                  : "text-rose-600"
              }`}
            >
              {formatIDR(totalCashOut)}
            </span>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
              <span className={isNearBudgetLimit ? "font-bold text-amber-700" : ""}>
                {outPctOfBudget}% dari HPP
              </span>
              <span>Sisa: {formatIDR(remainingHppBudget)}</span>
            </div>
          </div>
        </div>

        {/* 5. Net Cashflow & Proyeksi Margin */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
            netCashflow >= 0
              ? "bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-950"
              : "bg-red-950 text-white border-red-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
              5. Net Cashflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-yellow-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="block text-lg font-black leading-tight text-white">
              {formatIDR(netCashflow)}
            </span>
            <span className="text-[10px] text-indigo-200 block mt-1">
              Proyeksi Margin: {projectedMarginPct}% ({formatIDR(projectedMargin)})
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Plafon Budget Visual Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800">
              Realisasi Pengeluaran vs Plafon Anggaran HPP
            </span>
            <span className="text-gray-400">
              (Batas Biaya Maksimal: {formatIDR(maxHppBudget)})
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
              Ambang Peringatan: {alertThresholdPct}% ({formatIDR(budgetThresholdNominal)})
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className={outPctOfBudget >= alertThresholdPct ? "text-amber-600 font-bold" : "text-rose-600"}>
              Terpakai: {formatIDR(totalCashOut)} ({outPctOfBudget}%)
            </span>
            <span className={remainingHppBudget < 0 ? "text-red-600 font-bold" : "text-emerald-600"}>
              Sisa Plafon: {formatIDR(remainingHppBudget)}
            </span>
          </div>
        </div>
        
        {/* Relative Gauge with 80% Threshold Marker */}
        <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              outPctOfBudget > 100
                ? "bg-red-600"
                : outPctOfBudget >= alertThresholdPct
                ? "bg-amber-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${Math.min(outPctOfBudget, 100)}%` }}
          ></div>
          {/* Threshold Line at 80% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600 z-10"
            style={{ left: `${alertThresholdPct}%` }}
            title={`Ambang Batas Peringatan (${alertThresholdPct}%)`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
          <span>0%</span>
          <span className="text-amber-600 font-semibold">▲ Ambang Peringatan {alertThresholdPct}%</span>
          <span>100% Plafon HPP</span>
        </div>
      </div>

      {/* Visual Analytics Row: Financial S-Curve & Expense Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial S-Curve Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
                Kurva S Finansial Proyek (Kumulatif)
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Membandingkan kurva rencana alokasi biaya, realisasi pengeluaran, dan kas masuk
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Rencana Biaya
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Realisasi Pengeluaran
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Realisasi Kas Masuk
              </span>
            </div>
          </div>

          <div className="h-72 w-full min-h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={financialSCurveData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`}
                />
                <Tooltip
                  formatter={(val: any) => formatIDR(Number(val))}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "10px",
                    border: "none",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="Rencana Biaya"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPlanned)"
                />
                <Area
                  type="monotone"
                  dataKey="Realisasi Pengeluaran"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSpent)"
                />
                <Area
                  type="monotone"
                  dataKey="Realisasi Kas Masuk"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              Struktur Beban Pengeluaran
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Distribusi biaya berdasarkan kategori operasional & material
            </p>
          </div>

          {expensesByCategory.length > 0 ? (
            <div className="h-44 w-full my-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          CATEGORY_COLORS[entry.name] ||
                          PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatIDR(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">
              Belum ada pencatatan pengeluaran.
            </div>
          )}

          {/* Categories Legend List */}
          <div className="space-y-1.5 pt-3 border-t border-gray-50 max-h-36 overflow-y-auto custom-scrollbar">
            {expensesByCategory.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[item.name] ||
                        PIE_COLORS[idx % PIE_COLORS.length],
                    }}
                  ></span>
                  <span className="text-gray-500 font-medium truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-gray-800 shrink-0 ml-2">
                  {formatIDR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Record Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Receipt className="w-4.5 h-4.5 text-indigo-600" />
              Buku Kas & Transaksi Proyek
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Riwayat lengkap uang masuk termin dan rincian pengeluaran operasional
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterType === "ALL"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Semua ({projectTransactions.length})
              </button>
              <button
                onClick={() => setFilterType("IN")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === "IN"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                Masuk
              </button>
              <button
                onClick={() => setFilterType("OUT")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === "OUT"
                    ? "bg-white text-rose-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Tanggal & Ref</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4 text-right">Nominal (IDR)</th>
                <th className="py-3 px-4 text-center">Dicatat Oleh</th>
                {isAuthorized && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-800">{tx.date}</div>
                      <div className="text-[10px] text-gray-400">{tx.reference || "-"}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.type === "IN" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 w-max">
                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                          Kas Masuk
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1 w-max">
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          Kas Keluar
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-700">
                      {tx.category}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black whitespace-nowrap ${
                        tx.type === "IN" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {tx.type === "IN" ? `+ ${formatIDR(tx.amount)}` : `- ${formatIDR(tx.amount)}`}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap text-[10px] text-gray-500">
                      {tx.created_by.split("@")[0]}
                    </td>
                    {isAuthorized && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (confirm("Hapus transaksi finansial ini?")) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-gray-400">
                    Tidak ada transaksi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Transaksi Finansial */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-indigo-600" />
                Catat Transaksi Keuangan Proyek
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Jenis Transaksi *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("IN");
                      setTxCategory("Termin 1 (DP 30%)");
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      txType === "IN"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>Uang Masuk (Termin)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("OUT");
                      setTxCategory("Honor / Gaji Tim");
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      txType === "OUT"
                        ? "bg-rose-50 border-rose-300 text-rose-800 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>Uang Keluar (Biaya)</span>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Kategori *
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {txType === "IN" ? (
                    <>
                      <option value="Termin 1 (DP 30%)">Termin 1 (DP)</option>
                      <option value="Termin 2 (Progress 40%)">Termin 2 (Progress)</option>
                      <option value="Termin 3 (Progress 20%)">Termin 3 (Progress)</option>
                      <option value="Termin Pelunasan">Termin Pelunasan</option>
                      <option value="Tambahan Scope / Addendum">Tambahan Scope / Addendum</option>
                      <option value="Lain-lain">Lain-lain (Pendapatan)</option>
                    </>
                  ) : (
                    <>
                      <option value="Honor / Gaji Tim">Honor / Gaji Tim</option>
                      <option value="Infrastruktur & Server">Infrastruktur & Server</option>
                      <option value="Lisensi Software & API">Lisensi Software & API</option>
                      <option value="Subkontraktor / Vendor">Subkontraktor / Vendor</option>
                      <option value="Material & Logistik">Material & Logistik</option>
                      <option value="Digital Ads Spend">Digital Ads Spend</option>
                      <option value="Operasional & Meeting">Operasional & Meeting</option>
                      <option value="Peralatan & Aset">Peralatan & Aset</option>
                      <option value="Lain-lain">Lain-lain (Pengeluaran)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Nominal Transaksi (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="misal: 15000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {txAmount && !isNaN(Number(txAmount)) && (
                  <p className="text-[10px] font-semibold text-indigo-600">
                    Format: {formatIDR(Number(txAmount))}
                  </p>
                )}
              </div>

              {/* Date & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    No. Kwitansi / Ref
                  </label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder="cth: INV-001 / KW-09"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Deskripsi / Keterangan Transaksi
                </label>
                <textarea
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Catatan detail mengenai transaksi ini..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-16 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Atur Nilai Proyek & Target Margin */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                Konfigurasi Nilai Proyek & Target Margin
              </h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* 1. Nilai Proyek */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  1. Nilai Kontrak Proyek Total (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editContractValue}
                    onChange={(e) => handleContractValueChange(e.target.value)}
                    placeholder="misal: 150000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-black text-gray-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] font-semibold text-gray-400">
                  {formatIDR(Number(editContractValue))}
                </p>
              </div>

              {/* 2 & 3. Target Margin % and Nominal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Target Margin (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={editMarginPct}
                      onChange={(e) => handleMarginPctChange(e.target.value)}
                      placeholder="30"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Target Margin (Nominal)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editMarginAmount}
                    onChange={(e) => handleMarginAmountChange(e.target.value)}
                    placeholder="45000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Threshold Config */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center justify-between">
                  <span>Ambang Batas Peringatan Pengeluaran (%)</span>
                  <span className="text-indigo-600 font-bold">{alertThresholdPct}%</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={alertThresholdPct}
                    onChange={(e) => setAlertThresholdPct(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>50% (Sangat Ketat)</span>
                  <span className="font-semibold text-gray-600">Default: 80%</span>
                  <span>95% (Longgar)</span>
                </div>
              </div>

              {/* 4. Calculated Max HPP Cost Preview */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600">
                    Plafon Maksimal Biaya HPP:
                  </span>
                  <span className="font-black text-indigo-700 text-sm">
                    {formatIDR(
                      (parseFloat(editContractValue) || 0) -
                        (parseFloat(editMarginAmount) || 0)
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Batas biaya pengeluaran operasional dan vendor agar target profit
                  tetap tercapai.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Terapkan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Panduan Mitigasi Biaya & Pengendalian Anggaran */}
      {showMitigationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    Prosedur Pengendalian & Mitigasi Biaya
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Rekomendasi tindakan preventif pengendalian batas pengeluaran proyek
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMitigationModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Financial Status Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-gray-800 flex items-center justify-between">
                <span>Status Finansial Proyek Saat Ini</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px]">
                  {outPctOfBudget}% dari Plafon HPP
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[9px]">Plafon HPP</span>
                  <span className="font-bold text-gray-800">{formatIDR(maxHppBudget)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[9px]">Realisasi Biaya</span>
                  <span className="font-bold text-rose-600">{formatIDR(totalCashOut)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[9px]">Sisa Alokasi</span>
                  <span className="font-bold text-emerald-600">{formatIDR(remainingHppBudget)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[9px]">Proyeksi Margin</span>
                  <span className="font-bold text-purple-700">{projectedMarginPct}%</span>
                </div>
              </div>
            </div>

            {/* SOP Action Steps */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Langkah Tindakan Direkomendasikan
              </h5>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-gray-900 block">Kaji Ulang PO & Pengadaan Material</strong>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                      Tangguhkan atau batasi pesanan pembelian baru (Purchase Orders) yang bersifat tidak krusial hingga milestone penagihan berikutnya terealisasi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-gray-900 block">Percepat Penagihan Invoice / Termin Masuk</strong>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                      Hubungi klien untuk memverifikasi Berita Acara (BAST) dan mempercepat pencairan termin pembayaran agar cashflow tetap positif.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-50/50 border border-purple-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-gray-900 block">Review Scope & Antisipasi Addendum / Change Order</strong>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                      Jika lonjakan biaya disebabkan oleh pekerjaan tambahan dari klien di lapangan, ajukan dokumen addendum kontrak untuk menaikkan nilai proyek.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowMitigationModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
