import React, { useState } from "react";
import { Project, Task, TeamMember, UserRole, TaskStatus } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Sparkles, Trophy, CheckCircle, Clock, Briefcase, FileSpreadsheet, Send, AlertCircle } from "lucide-react";

interface DashboardModuleProps {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  userMember: TeamMember | null;
}

export default function DashboardModule({ projects, tasks, members, userMember }: DashboardModuleProps) {
  const [aiReport, setAiReport] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");

  const isAuthorizedManager =
    userMember?.role === UserRole.ADMIN || userMember?.role === UserRole.MANAGER;

  // Calculators
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Est vs Logged Hours
  const totalEstHours = tasks.reduce((sum, t) => sum + (t.est_hours || 0), 0);
  const totalLoggedHours = tasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0);

  // Recharts Data: Points per Team Member
  const barChartData = members.map((m) => ({
    name: m.name,
    "Poin Performa": m.points || 0,
    Division: m.division,
  }));

  // Recharts Data: Tasks by Status
  const tasksByStatus = [
    { name: "Antrean (Todo)", value: tasks.filter((t) => t.status === TaskStatus.TODO).length, color: "#64748b" },
    { name: "Dikerjakan (Doing)", value: tasks.filter((t) => t.status === TaskStatus.DOING).length, color: "#eab308" },
    { name: "Selesai (Done)", value: tasks.filter((t) => t.status === TaskStatus.DONE).length, color: "#10b981" },
  ].filter((item) => item.value > 0);

  // Formatter for AI Output Markdown
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, index) => {
      let trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={index} className="text-sm font-bold text-slate-800 mt-4 mb-2">
            {trimmed.replace("###", "")}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={index} className="text-base font-bold text-indigo-700 mt-5 mb-2 border-b border-indigo-100 pb-1">
            {trimmed.replace("##", "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={index} className="text-lg font-bold text-slate-900 mt-6 mb-3">
            {trimmed.replace("#", "")}
          </h2>
        );
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <li key={index} className="ml-5 list-disc text-xs text-slate-600 my-1">
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      // Simple bold replacements **text** -> <strong>text</strong>
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split("**");
        return (
          <p key={index} className="text-xs text-slate-600 my-1.5 leading-relaxed">
            {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="text-slate-900 font-semibold">{p}</strong> : p))}
          </p>
        );
      }
      return (
        <p key={index} className="text-xs text-slate-600 my-1.5 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  const handleGenerateAiReport = async () => {
    setIsLoadingAi(true);
    setAiError("");
    setAiReport("");
    try {
      // Gather relevant project and task status for Gemini Context
      const payload = {
        projectData: {
          projects: projects.map((p) => ({ name: p.name, division: p.division, status: p.status, dates: `${p.start_date} s/d ${p.end_date}` })),
          tasks: tasks.map((t) => ({ title: t.title, assignee: t.assignee_name, status: t.status, priority: t.priority, est: t.est_hours, logged: t.logged_hours })),
          members: members.map((m) => ({ name: m.name, email: m.email, points: m.points, role: m.role, division: m.division })),
          summary: {
            total_projects: totalProjects,
            active_projects: activeProjects,
            total_tasks: totalTasks,
            completion_rate: `${taskCompletionRate}%`,
            total_estimated_hours: totalEstHours,
            total_logged_hours: totalLoggedHours,
          }
        },
        monthlySummaryRequest: aiPrompt || "Analisis laporan bulanan, cari hambatan tim, dan berikan evaluasi produktivitas.",
      };

      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Gagal memproses laporan AI. Silakan periksa kunci API Gemini.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAiReport(data.analysis || "Tidak ada hasil analisis.");
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Gagal menghubungi server analitik AI.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Projects */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Proyek</span>
            <span className="block text-2xl font-black text-gray-800 mt-1">{totalProjects}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">{activeProjects} Proyek Aktif</span>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Tugas Selesai</span>
            <span className="block text-2xl font-black text-gray-800 mt-1">
              {completedTasks} <span className="text-sm font-normal text-gray-400">/ {totalTasks}</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">{taskCompletionRate}% Rasio Penyelesaian</span>
          </div>
        </div>

        {/* Time Tracking Counter */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Waktu Kerja Tim</span>
            <span className="block text-2xl font-black text-gray-800 mt-1">{totalLoggedHours} Jam</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Estimasi Awal: {totalEstHours} Jam</span>
          </div>
        </div>

        {/* Total Points */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Akumulasi Poin</span>
            <span className="block text-2xl font-black text-gray-800 mt-1">
              {members.reduce((sum, m) => sum + (m.points || 0), 0)} pts
            </span>
            <span className="text-[10px] text-purple-600 font-medium block mt-0.5">Berhasil Dimonitor</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Papan Skor Poin Performa</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Visualisasi kontribusi produktivitas anggota tim (pts)</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Gamifikasi Aktif
            </span>
          </div>
          <div className="h-64 w-full flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="Poin Performa" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Status Penyebaran Tugas</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Rasio sebaran status semua tugas yang dimonitor</p>
          </div>
          {tasksByStatus.length > 0 ? (
            <div className="h-44 w-full my-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tasksByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">
              Belum ada data tugas.
            </div>
          )}
          {/* Custom Legends */}
          <div className="space-y-1.5 pt-3 border-t border-gray-50">
            {tasksByStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-500 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-800">{item.value} Tugas</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gemini AI Performance Report Section (Manager/Admin Only) */}
      <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl shadow-indigo-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-yellow-400 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">AI Project Consultant</h3>
                <span className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Gemini-3.5-Flash
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Gunakan kecerdasan buatan untuk menganalisis performa kerja tim bulanan secara otomatis.
              </p>
            </div>
          </div>

          {!isAuthorizedManager && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Maaf, modul AI Analitik ini hanya dapat diakses oleh Admin atau Project Manager.</span>
            </div>
          )}
        </div>

        {isAuthorizedManager && (
          <div className="mt-5 space-y-4">
            {/* Options Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="cth: Analisis performa tim developer, cari siapa yang paling produktif dan apa saja kendalanya..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-150"
              />
              <button
                onClick={handleGenerateAiReport}
                disabled={isLoadingAi}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shrink-0 shadow-md shadow-indigo-900/30 transition-all duration-150 cursor-pointer text-white"
              >
                {isLoadingAi ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menganalisis Data...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Mulai Analisis AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Error state */}
            {aiError && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  <p className="font-semibold">Kesalahan Analisis:</p>
                  <p className="mt-0.5">{aiError}</p>
                </div>
              </div>
            )}

            {/* AI Generated Content Panel */}
            {aiReport && (
              <div className="bg-slate-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-h-[450px] overflow-y-auto shadow-inner custom-scrollbar">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> HASIL ANALISIS REKOMENDASI BULANAN
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiReport);
                      alert("Teks laporan AI berhasil disalin!");
                    }}
                    className="text-[10px] hover:underline text-indigo-400 hover:text-indigo-300"
                  >
                    Salin Laporan
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-slate-100 bg-white p-5 rounded-xl">
                  {renderMarkdown(aiReport)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
