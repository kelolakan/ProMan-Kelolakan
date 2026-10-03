import React, { useState, useMemo } from "react";
import {
  Project,
  Task,
  TeamMember,
  FinancialTransaction,
  TaskStatus,
} from "../types";
import {
  Printer,
  FileSpreadsheet,
  Download,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldCheck,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
  FileCheck,
  Percent,
  Sliders,
  CheckSquare,
  Sparkles,
  MapPin,
  FileText,
  UserCheck,
  Zap,
} from "lucide-react";
import { formatIDR } from "../modules/FinanceModule";
import { formatWorkDuration, hoursToMandays } from "../lib/timeUtils";

interface ProjectPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project;
  projects?: Project[];
  tasks: Task[];
  members: TeamMember[];
  transactions: FinancialTransaction[];
  userMember?: TeamMember | null;
  sCurveData: Array<{ name: string; Rencana: number; Realisasi: number }>;
  selectedWeekIdx: number;
  onExportExcel: () => void;
}

export default function ProjectPDFModal({
  isOpen,
  onClose,
  activeProject,
  tasks,
  members,
  transactions,
  userMember,
  sCurveData,
  selectedWeekIdx,
  onExportExcel,
}: ProjectPDFModalProps) {
  if (!isOpen) return null;

  // Report customization state
  const [reportType, setReportType] = useState<
    "COMPREHENSIVE" | "EXECUTIVE" | "FIELD_PROGRESS" | "FINANCIAL"
  >("COMPREHENSIVE");

  const [clientName, setClientName] = useState("PT Telkom Indonesia (Persero) Tbk / PT FiberStar");
  const [contractNumber, setContractNumber] = useState("SPK/FTTH-JKT/2026/08-019");
  const [locationName, setLocationName] = useState("Cluster Kebayoran Baru, Jakarta Selatan");
  const [reportPeriod, setReportPeriod] = useState("Agustus 2026 (Evaluasi Minggu ke-3)");
  const [documentNo, setDocumentNo] = useState("EXP/FTTH-REP/2026/08/W3-042");
  
  // FTTH Specific Key Metrics
  const [homepassTarget, setHomepassTarget] = useState(1200);
  const [homepassDone, setHomepassDone] = useState(1050);
  const [cableLengthTarget, setCableLengthTarget] = useState("14.500 Meter (14.5 Km)");
  const [cableLengthDone, setCableLengthDone] = useState("13.800 Meter (95.1%)");
  const [odcCount, setOdcCount] = useState("4 Unit (144 Core) - 100% Spliced");
  const [odpCount, setOdpCount] = useState("48 Unit (16 Port) - 44 Aktif (91.6%)");
  const [otdrPassRate, setOtdrPassRate] = useState("98.6% (Avg Loss 0.18 dB/Splice)");

  const [managerNotes, setManagerNotes] = useState(
    "Pekerjaan penarikan kabel feeder dan distribusi cluster Kebayoran Baru berjalan sesuai timeline. Tahap instalasi ODC dan ODP mencapai 95%, uji redaman OTDR memenuhi standar teknis (< 0.25 dB per splice). Pengajuan termin 2 (Berita Acara Test & Commissioning) siap diproses."
  );

  // Sections toggle
  const [sections, setSections] = useState({
    letterhead: true,
    executive: true,
    ftthMetrics: true,
    scurve: true,
    tasks: true,
    finance: true,
    issues: true,
    signoff: true,
  });

  // Financial calculations
  const contractValue = activeProject?.contract_value || 450000000;
  const targetMarginPct = activeProject?.target_margin_pct || 32;
  const targetMarginAmount =
    activeProject?.target_margin_amount ||
    Math.round((contractValue * targetMarginPct) / 100);
  const budgetCap = contractValue - targetMarginAmount;

  const projectTransactions = useMemo(() => {
    return transactions.filter((t) => t.project_id === activeProject.id);
  }, [transactions, activeProject]);

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
  const realizedMarginPct =
    totalInflow > 0 ? Math.round((netCashflow / totalInflow) * 100) : 0;
  const remainingBudget = budgetCap - totalOutflow;

  // Task metrics
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.project_id === activeProject.id);
  }, [tasks, activeProject]);

  const doneTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
  const doingTasks = projectTasks.filter((t) => t.status === TaskStatus.DOING).length;
  const todoTasks = projectTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const totalTasksCount = projectTasks.length;
  const taskCompletionRate =
    totalTasksCount > 0 ? Math.round((doneTasks / totalTasksCount) * 100) : 0;

  const totalEstHours = projectTasks.reduce((sum, t) => sum + (t.est_hours || 0), 0);
  const totalLoggedHours = projectTasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0);

  // S-Curve Variance
  const plannedProgress = sCurveData[selectedWeekIdx]?.Rencana ?? 65;
  const realizedProgress = sCurveData[selectedWeekIdx]?.Realisasi ?? 70;
  const variance = realizedProgress - plannedProgress;

  // Print execution handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col md:flex-row overflow-hidden">
      {/* ========================================================================= */}
      {/* LEFT / SIDEBAR CONFIGURATION PANEL (HIDDEN IN PRINT) */}
      {/* ========================================================================= */}
      <div className="w-full md:w-96 lg:w-[420px] bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 shrink-0 z-10 print:hidden overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Konfigurasi Laporan PDF</h3>
              <p className="text-[10px] text-slate-400">Standar Industri Konstruksi & FTTH</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-5 space-y-5 text-xs">
          {/* Action Trigger Buttons */}
          <div className="space-y-2">
            <button
              onClick={handlePrint}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan ke PDF (Ctrl+P)</span>
            </button>
            <button
              onClick={onExportExcel}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Data Mentah (.CSV)</span>
            </button>
          </div>

          {/* Report Template Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Format / Template Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="COMPREHENSIVE">Laporan Komprehensif FTTH (Full Dossier)</option>
              <option value="EXECUTIVE">Laporan Eksekutif Klien (Summary & S-Curve)</option>
              <option value="FIELD_PROGRESS">Berita Acara & Progress Fisik Lapangan</option>
              <option value="FINANCIAL">Laporan Finansial & Penyerapan Termin Biaya</option>
            </select>
          </div>

          {/* Project & Client Customization */}
          <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Identitas Kontrak & Klien
            </span>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Pemberi Tugas / Klien</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">No. Kontrak / SPK</label>
                <input
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">No. Dokumen Laporan</label>
                <input
                  type="text"
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Lokasi / Cluster FTTH</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Periode Pelaporan</label>
              <input
                type="text"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* FTTH Technical Metrics Customization */}
          <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Parameter Teknis FTTH
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Target Homepass</label>
                <input
                  type="number"
                  value={homepassTarget}
                  onChange={(e) => setHomepassTarget(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Homepass Selesai (RFS)</label>
                <input
                  type="number"
                  value={homepassDone}
                  onChange={(e) => setHomepassDone(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Realisasi Kabel OSP (Feeder/Distribusi)</label>
              <input
                type="text"
                value={cableLengthDone}
                onChange={(e) => setCableLengthDone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">ODC Status</label>
                <input
                  type="text"
                  value={odcCount}
                  onChange={(e) => setOdcCount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">ODP Status</label>
                <input
                  type="text"
                  value={odpCount}
                  onChange={(e) => setOdpCount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Hasil Uji Redaman OTDR</label>
              <input
                type="text"
                value={otdrPassRate}
                onChange={(e) => setOtdrPassRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section Visibility Checkboxes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Komponen yang Dicetak
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.letterhead}
                  onChange={(e) => setSections({ ...sections, letterhead: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Kop Surat Resmi</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.executive}
                  onChange={(e) => setSections({ ...sections, executive: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Ringkasan Eksekutif</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.ftthMetrics}
                  onChange={(e) => setSections({ ...sections, ftthMetrics: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Metrik Fisik FTTH</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.scurve}
                  onChange={(e) => setSections({ ...sections, scurve: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Kurva-S & Deviasi</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.tasks}
                  onChange={(e) => setSections({ ...sections, tasks: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">WBS & Milestone FTTH</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.finance}
                  onChange={(e) => setSections({ ...sections, finance: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Rekapitulasi Finansial</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.issues}
                  onChange={(e) => setSections({ ...sections, issues: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Kendala & Mitigasi</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.signoff}
                  onChange={(e) => setSections({ ...sections, signoff: e.target.checked })}
                  className="accent-indigo-500"
                />
                <span className="text-[11px] text-slate-300">Lembar Pengesahan (4 Pihak)</span>
              </label>
            </div>
          </div>

          {/* Manager Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Catatan Evaluasi & Rekomendasi Manajer Proyek
            </label>
            <textarea
              rows={3}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT / MAIN VIEWPORT: PIXEL-PERFECT A4 PRINT PREVIEW */}
      {/* ========================================================================= */}
      <div className="flex-1 bg-slate-800 overflow-y-auto p-4 sm:p-8 flex justify-center custom-scrollbar print:p-0 print:bg-white print:overflow-visible">
        {/* A4 Paper Container */}
        <div
          id="printable-report-area"
          className="w-full max-w-[850px] bg-white text-slate-900 shadow-2xl p-8 sm:p-12 space-y-6 rounded-none print:shadow-none print:p-0 print:max-w-none print:w-full print:m-0"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* ===================================================================== */}
          {/* 1. OFFICIAL CORPORATE LETTERHEAD (KOP SURAT RESMI) */}
          {/* ===================================================================== */}
          {sections.letterhead && (
            <div className="border-b-4 border-slate-900 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                {/* Company Branding */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-slate-900 text-white rounded flex items-center justify-center font-black text-lg tracking-wider">
                      EX
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                        PT. EXVEN MITRA SOLUSINDO
                      </h1>
                      <p className="text-[10px] font-bold text-indigo-700 tracking-wider uppercase">
                        Telecommunication, Fiber Optic Network & Civil Infrastructure Contractor
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-snug pt-1">
                    Menara Prima Lt. 18, Jl. Dr. Ide Anak Agung Gde Agung, Mega Kuningan, Jakarta Selatan 12950
                    <br />
                    Telepon: (021) 5795-8800 | Hotline Operasional: 0812-8890-7700 | Email: ftth.projects@exven.co.id
                  </p>
                </div>

                {/* Document Metadata Badge */}
                <div className="text-right shrink-0 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nomor Dokumen:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-900 block">
                    {documentNo}
                  </span>
                  <span className="text-[8px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                    STATUS: FINAL APPROVED
                  </span>
                </div>
              </div>

              {/* Report Title Banner */}
              <div className="pt-2 text-center border-t border-slate-200">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  LAPORAN KEMAJUAN PEKERJAAN & EVALUASI PERFORMA PROYEK FTTH
                </h2>
                <p className="text-[11px] font-semibold text-slate-600">
                  Periode Pelaporan: {reportPeriod} | Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 2. PROJECT & CONTRACT METADATA MATRIX */}
          {/* ===================================================================== */}
          <div className="bg-slate-50 rounded border border-slate-300 p-3.5 print-break-inside-avoid">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Nama Proyek</span>
                <span className="font-bold text-slate-900 block mt-0.5 leading-tight">
                  {activeProject.name}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Pemberi Tugas / Klien</span>
                <span className="font-bold text-indigo-950 block mt-0.5 leading-tight">
                  {clientName}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">No. Kontrak / SPK</span>
                <span className="font-mono font-bold text-slate-800 block mt-0.5">
                  {contractNumber}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Lokasi & Cluster</span>
                <span className="font-bold text-slate-800 block mt-0.5 leading-tight">
                  {locationName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2.5 mt-2.5 border-t border-slate-200">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Nilai Kontrak (Inc. PPN)</span>
                <span className="font-mono font-black text-slate-900 block mt-0.5">
                  {formatIDR(contractValue)}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Jadwal Pelaksanaan</span>
                <span className="font-semibold text-slate-700 block mt-0.5">
                  {activeProject.start_date} s/d {activeProject.end_date}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Progres Fisik Kumulatif</span>
                <span className="font-black text-indigo-700 block mt-0.5">
                  {realizedProgress}% <span className="text-[10px] text-slate-500 font-normal">(Target: {plannedProgress}%)</span>
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Deviasi Jadwal (Variance)</span>
                <span
                  className={`font-black block mt-0.5 ${
                    variance >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {variance >= 0 ? `+${variance}% (Ahead of Schedule)` : `${variance}% (Delay)`}
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 3. KEY FTTH TECHNICAL DELIVERABLES & INFRASTRUCTURE HIGHLIGHTS */}
          {/* ===================================================================== */}
          {sections.ftthMetrics && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  I. Capaian Teknis Infrastruktur FTTH (Physical Deliverables)
                </h3>
                <span className="text-[9px] font-semibold text-slate-500">Standar QA/QC Telkom & APJATEL</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Metric 1: Homepass */}
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Cakupan Homepass</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-slate-900">{homepassDone}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">/ {homepassTarget} HP</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                    {Math.round((homepassDone / homepassTarget) * 100)}% Siap RFS (Ready for Service)
                  </span>
                </div>

                {/* Metric 2: Cable Pulling */}
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Gelaran Kabel OSP</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5 leading-tight">
                    {cableLengthDone}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                    Target: {cableLengthTarget}
                  </span>
                </div>

                {/* Metric 3: ODC & ODP */}
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">ODC & ODP Spliced</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5 leading-tight">
                    {odpCount}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                    {odcCount}
                  </span>
                </div>

                {/* Metric 4: OTDR Redaman */}
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Uji Redaman OTDR (dB)</span>
                  <span className="text-xs font-black text-emerald-700 block mt-0.5 leading-tight">
                    {otdrPassRate}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                    Threshold &lt; 0.25 dB (Lolos QA)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 4. S-CURVE & WEEKLY PROGRESS VARIANCE TABLE */}
          {/* ===================================================================== */}
          {sections.scurve && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  II. Analisis Kurva-S & Kemajuan Fisik Mingguan
                </h3>
                <span className="text-[9px] font-semibold text-slate-500">Evaluasi Rencana vs Realisasi</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* S-Curve Data Table */}
                <div className="md:col-span-7">
                  <table className="w-full text-left text-[10px] border border-slate-300">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300">Periode Evaluasi</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">Rencana (%)</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">Realisasi (%)</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">Deviasi (%)</th>
                        <th className="p-1.5 text-center">Status Lapangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sCurveData.map((row, idx) => {
                        const diff = row.Realisasi - row.Rencana;
                        const isSelected = idx === selectedWeekIdx;
                        return (
                          <tr
                            key={row.name}
                            className={isSelected ? "bg-indigo-50/70 font-semibold" : ""}
                          >
                            <td className="p-1.5 border-r border-slate-300 font-bold text-slate-800">
                              {row.name} {isSelected && "(Minggu Ini)"}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                              {row.Rencana}%
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-indigo-900">
                              {row.Realisasi}%
                            </td>
                            <td
                              className={`p-1.5 border-r border-slate-300 text-center font-mono font-bold ${
                                diff >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {diff >= 0 ? `+${diff}%` : `${diff}%`}
                            </td>
                            <td className="p-1.5 text-center text-[9px]">
                              {diff >= 0 ? (
                                <span className="text-emerald-700 font-bold">Ahead / On Track</span>
                              ) : (
                                <span className="text-rose-700 font-bold">Delay (Keterlambatan)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* S-Curve Visual Vector Diagram (Print-Safe SVG) */}
                <div className="md:col-span-5 bg-slate-50 p-2.5 rounded border border-slate-300 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                    Grafik Akumulatif Kurva-S
                  </span>
                  <div className="h-28 w-full relative">
                    <svg viewBox="0 0 300 100" className="w-full h-full">
                      {/* Grid Lines */}
                      <line x1="20" y1="10" x2="280" y2="10" stroke="#e2e8f0" strokeDasharray="2" />
                      <line x1="20" y1="50" x2="280" y2="50" stroke="#e2e8f0" strokeDasharray="2" />
                      <line x1="20" y1="90" x2="280" y2="90" stroke="#cbd5e1" />
                      
                      {/* Target Plan Line (Blue/Slate Dashed) */}
                      <polyline
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="4"
                        points="30,85 90,60 150,35 210,20 270,10"
                      />

                      {/* Actual Realization Line (Indigo Solid) */}
                      <polyline
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        points="30,85 90,65 150,45 210,25 270,12"
                      />

                      {/* Current Point Indicator */}
                      <circle cx="150" cy="45" r="4" fill="#4f46e5" />

                      {/* Legend */}
                      <text x="30" y="98" fontSize="7" fill="#64748b">W1</text>
                      <text x="90" y="98" fontSize="7" fill="#64748b">W2</text>
                      <text x="150" y="98" fontSize="7" fill="#4f46e5" fontWeight="bold">W3 (Aktif)</text>
                      <text x="210" y="98" fontSize="7" fill="#64748b">W4</text>
                      <text x="270" y="98" fontSize="7" fill="#64748b">W5</text>
                    </svg>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[8px] mt-1">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-0.5 bg-slate-500 inline-block border-b border-dashed"></span> Rencana
                    </span>
                    <span className="flex items-center gap-1 text-indigo-700 font-bold">
                      <span className="w-2.5 h-0.5 bg-indigo-600 inline-block"></span> Realisasi Fisik
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 5. WORK BREAKDOWN STRUCTURE & FTTH MILESTONE TABLE */}
          {/* ===================================================================== */}
          {sections.tasks && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  III. Rincian Milestone Pekerjaan FTTH (Work Breakdown Structure)
                </h3>
                <span className="text-[9px] font-semibold text-slate-500">
                  Total {totalTasksCount} Aktivitas | {doneTasks} Selesai ({taskCompletionRate}%)
                </span>
              </div>

              <table className="w-full text-left text-[9.5px] border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-1.5 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-1.5 border-r border-slate-300">Uraian Pekerjaan / Item Aktivitas FTTH</th>
                    <th className="p-1.5 border-r border-slate-300">PIC / Tim</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Bobot</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Waktu Kerja</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Status</th>
                    <th className="p-1.5 text-center">Tenggat Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projectTasks.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-900">
                        {t.title}
                        {t.description && (
                          <span className="text-[8.5px] text-slate-500 font-normal block">
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-slate-700">
                        {t.assignee_name}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        {t.priority === "High" ? "Utama (High)" : "Standar"}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-semibold text-slate-800">
                        {t.logged_hours || 0}j ({hoursToMandays(t.logged_hours || 0)}h)
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            t.status === TaskStatus.DONE
                              ? "bg-emerald-100 text-emerald-800"
                              : t.status === TaskStatus.DOING
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.status === TaskStatus.DONE
                            ? "SELESAI (100%)"
                            : t.status === TaskStatus.DOING
                            ? "ON GOING"
                            : "ANTREAN"}
                        </span>
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {t.due_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 6. FINANCIAL RECAPITULATION & BILLING STATUS */}
          {/* ===================================================================== */}
          {sections.finance && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-600" />
                  IV. Rekapitulasi Finansial & Penyerapan Termin Proyek
                </h3>
                <span className="text-[9px] font-semibold text-slate-500">Mata Uang: IDR (Rupiah)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Total Nilai Kontrak</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {formatIDR(contractValue)}
                  </span>
                  <span className="text-[8px] text-slate-500 block">Target Margin: {targetMarginPct}% ({formatIDR(targetMarginAmount)})</span>
                </div>

                <div className="p-2.5 bg-emerald-50/50 rounded border border-emerald-200">
                  <span className="text-[8.5px] font-bold text-emerald-700 uppercase block">Termin Masuk (Inflow)</span>
                  <span className="font-mono font-bold text-emerald-800 block mt-0.5">
                    {formatIDR(totalInflow)}
                  </span>
                  <span className="text-[8px] text-emerald-600 block">
                    {contractValue > 0 ? Math.round((totalInflow / contractValue) * 100) : 0}% Terbayar Klien
                  </span>
                </div>

                <div className="p-2.5 bg-rose-50/50 rounded border border-rose-200">
                  <span className="text-[8.5px] font-bold text-rose-700 uppercase block">Realisasi Biaya (Outflow)</span>
                  <span className="font-mono font-bold text-rose-800 block mt-0.5">
                    {formatIDR(totalOutflow)}
                  </span>
                  <span className="text-[8px] text-rose-600 block">
                    Pagu Beban: {formatIDR(budgetCap)}
                  </span>
                </div>

                <div className="p-2.5 bg-indigo-50/50 rounded border border-indigo-200">
                  <span className="text-[8.5px] font-bold text-indigo-700 uppercase block">Net Surplus & Sisa Pagu</span>
                  <span className="font-mono font-bold text-indigo-900 block mt-0.5">
                    {formatIDR(netCashflow)}
                  </span>
                  <span className="text-[8px] text-indigo-600 block">
                    Sisa Anggaran: {formatIDR(remainingBudget)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 7. FIELD ISSUES & MITIGATION LOG */}
          {/* ===================================================================== */}
          {sections.issues && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  V. Kendala Lapangan & Rencana Tindakan Mitigasi (Issue & Action Plan)
                </h3>
                <span className="text-[9px] font-semibold text-slate-500">Risk & Obstacle Register</span>
              </div>

              <table className="w-full text-left text-[9px] border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-1.5 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-1.5 border-r border-slate-300 w-1/3">Identifikasi Kendala Lapangan</th>
                    <th className="p-1.5 border-r border-slate-300 w-1/3">Rencana Mitigasi & Tindakan Korektif</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">PIC</th>
                    <th className="p-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 text-center font-bold">1</td>
                    <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-800">
                      Perizinan Crossing ROW Jl. Iskandarsyah (Dinas Bina Marga)
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-slate-600">
                      Izin terbit; pelaksanaan penarikan subduct dilakukan malam hari (00:00 - 04:30 WIB) dengan metode manual boring.
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-center">Sitac Lead</td>
                    <td className="p-1.5 text-center">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded">CLOSED</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 text-center font-bold">2</td>
                    <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-800">
                      Deviasi Redaman pada Segmen Feeder ODC-02 Core #14 (&gt; 0.35 dB)
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-slate-600">
                      Dilakukan re-cleaving dan re-splicing menggunakan Fujikura 90S+. Nilai loss turun menjadi 0.16 dB (Passed QA).
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-center">Splicer Team</td>
                    <td className="p-1.5 text-center">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded">RESOLVED</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 text-center font-bold">3</td>
                    <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-800">
                      Kondisi Tiang Eksisting Padat di Jalur Distribusi RW 04
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-slate-600">
                      Penambahan 8 unit tiang besi 7 meter mandiri milik kontraktor untuk menjamin clearance tinggi kabel minimal 5.5 meter.
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-center">Civil Team</td>
                    <td className="p-1.5 text-center">
                      <span className="text-indigo-700 font-bold bg-indigo-50 px-1 py-0.2 rounded">ON PROGRESS</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 8. MANAGER EXECUTIVE EVALUATION & RECOMMENDATIONS */}
          {/* ===================================================================== */}
          {managerNotes && (
            <div className="p-3 bg-slate-50 rounded border border-slate-300 text-xs print-break-inside-avoid">
              <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wider">
                Catatan Evaluasi & Rekomendasi Manajer Proyek (PT. Exven Mitra Solusindo):
              </span>
              <p className="text-slate-700 mt-1 leading-relaxed italic text-[10px]">
                "{managerNotes}"
              </p>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 9. FORMAL 4-PARTY SIGN-OFF MATRIX (PENGESAHAN RESMI) */}
          {/* ===================================================================== */}
          {sections.signoff && (
            <div className="pt-4 border-t-2 border-slate-900 space-y-3 print-break-inside-avoid">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
                LEMBAR PENGESAHAN DOKUMEN LAPORAN KEMAJUAN PEKERJAAN
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
                {/* Signee 1: Field Supervisor */}
                <div className="border border-slate-300 p-2 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                  <div>
                    <p className="text-slate-500 font-medium">Disiapkan Oleh,</p>
                    <p className="font-bold text-slate-800 mt-0.5">Field Coordinator FTTH</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-900 block">Rahmat Hidayat</span>
                    <span className="text-[8px] text-slate-500">PT. Exven Mitra Solusindo</span>
                  </div>
                </div>

                {/* Signee 2: Project Manager */}
                <div className="border border-slate-300 p-2 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                  <div>
                    <p className="text-slate-500 font-medium">Diperiksa Oleh,</p>
                    <p className="font-bold text-slate-800 mt-0.5">Project Manager FTTH</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-900 block">
                      {userMember?.name || "Budi Santoso, S.T."}
                    </span>
                    <span className="text-[8px] text-slate-500">PT. Exven Mitra Solusindo</span>
                  </div>
                </div>

                {/* Signee 3: QA/QC Consultant */}
                <div className="border border-slate-300 p-2 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                  <div>
                    <p className="text-slate-500 font-medium">Diverifikasi Oleh,</p>
                    <p className="font-bold text-slate-800 mt-0.5">Konsultan QA / QC</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-900 block">Ir. Hendra Wijaya</span>
                    <span className="text-[8px] text-slate-500">Supervisory Consultant</span>
                  </div>
                </div>

                {/* Signee 4: Client Owner */}
                <div className="border border-slate-300 p-2 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                  <div>
                    <p className="text-slate-500 font-medium">Disetujui Oleh,</p>
                    <p className="font-bold text-slate-800 mt-0.5">Pemberi Tugas / Owner</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-900 block">Manager Rollout FTTH</span>
                    <span className="text-[8px] text-slate-500">{clientName.split("/")[0]}</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp & Security Note */}
              <div className="flex items-center justify-between text-[8px] text-slate-400 pt-2 border-t border-slate-200">
                <span>Dokumen ini diterbitkan secara resmi melalui Exven Project Manajemen by Kelolakan.</span>
                <span>Halaman 1 dari 1 (Dokumen Sah Lampiran BAST)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
