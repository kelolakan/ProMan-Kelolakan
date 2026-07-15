import React, { useState } from "react";
import { Project, Task, TeamMember } from "../types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, FileSpreadsheet, FileText, Settings, Play, CheckCircle2 } from "lucide-react";

interface ReportsModuleProps {
  activeProject: Project | null;
  tasks: Task[];
  members: TeamMember[];
}

export default function ReportsModule({ activeProject, tasks, members }: ReportsModuleProps) {
  // Configurable S-Curve progress points for 5 Weeks
  const [sCurveData, setSCurveData] = useState([
    { name: "Minggu 1", Rencana: 15, Realisasi: 15 },
    { name: "Minggu 2", Rencana: 40, Realisasi: 35 },
    { name: "Minggu 3", Rencana: 65, Realisasi: 55 },
    { name: "Minggu 4", Rencana: 85, Realisasi: 80 },
    { name: "Minggu 5", Rencana: 100, Realisasi: 95 },
  ]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(2); // Default to Week 3

  const handleUpdateSCurveValue = (field: "Rencana" | "Realisasi", val: number) => {
    const newData = [...sCurveData];
    newData[selectedWeekIdx] = {
      ...newData[selectedWeekIdx],
      [field]: val,
    };
    setSCurveData(newData);
  };

  // Excel (CSV) Export function
  const handleExportCSV = () => {
    if (!activeProject) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan S-Curve Proyek: ${activeProject.name}\n`;
    csvContent += `Divisi: ${activeProject.division}\n`;
    csvContent += `Tenggat Waktu: ${activeProject.end_date}\n\n`;
    csvContent += "Minggu,Rencana Progress (%),Realisasi Progress (%)\n";

    sCurveData.forEach((row) => {
      csvContent += `${row.name},${row.Rencana},${row.Realisasi}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SCurve_Report_${activeProject.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export using system window print layout (optimized with CSS)
  const handlePrintPDF = () => {
    window.print();
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <TrendingUp className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan buka modul **Projects** terlebih dahulu dan pilih salah satu proyek aktif untuk mulai melihat grafik analitik Kurva S.
        </p>
      </div>
    );
  }

  // Calculate variances
  const plannedProgress = sCurveData[selectedWeekIdx].Rencana;
  const realizedProgress = sCurveData[selectedWeekIdx].Realisasi;
  const variance = realizedProgress - plannedProgress;

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* Top action block */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h3 className="text-base font-bold text-gray-800">Visualisasi Kurva S Proyek</h3>
          <p className="text-xs text-gray-400 mt-0.5">Analisis keterlambatan (variance) pekerjaan terhadap target rencana mingguan.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor ke Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
          >
            <FileText className="w-4 h-4" />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Printable project sheet header (visible only in print mode) */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-2xl font-black text-gray-900">ZONATOOLS PROJECT MANAGEMENT</h1>
        <h2 className="text-sm font-bold text-indigo-700 mt-1">Laporan Resmi S-Curve Proyek</h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
          <div>
            <span className="text-gray-400 font-semibold block">Nama Proyek:</span>
            <span className="font-bold text-gray-800">{activeProject.name}</span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">Divisi Penanggung Jawab:</span>
            <span className="font-bold text-gray-800">Divisi {activeProject.division}</span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">Tanggal Mulai:</span>
            <span className="font-bold text-gray-800">{activeProject.start_date}</span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block">Tanggal Selesai:</span>
            <span className="font-bold text-gray-800">{activeProject.end_date}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* S-Curve Chart Area */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Grafik Akumulatif Progress (%)</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Membandingkan garis target rencana terhadap realisasi kemajuan aktual</p>
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
        </div>

        {/* Configuration Panel for Curve adjusting & Variance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 print:hidden">
          <div>
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-indigo-500" /> Pengaturan Data Mingguan
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Sesuaikan parameter kurva s untuk mensimulasikan milestones proyek</p>
          </div>

          {/* Week Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Pilih Minggu</label>
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
        </div>
      </div>
    </div>
  );
}
