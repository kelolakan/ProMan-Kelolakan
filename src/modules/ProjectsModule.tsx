import React, { useState } from "react";
import { Project, Task, ProjectStatus, UserRole, TeamMember } from "../types";
import { Briefcase, Calendar, CheckSquare, Plus, FolderPlus, HelpCircle, Coins, Percent } from "lucide-react";
import { formatIDR } from "./FinanceModule";

interface ProjectsModuleProps {
  projects: Project[];
  tasks: Task[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  userMember: TeamMember | null;
  onAddProject: (project: Project) => void;
}

export default function ProjectsModule({
  projects,
  tasks,
  activeProjectId,
  setActiveProjectId,
  userMember,
  onAddProject,
}: ProjectsModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [division, setDivision] = useState("Tech");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractValue, setContractValue] = useState("150000000");
  const [targetMarginPct, setTargetMarginPct] = useState("30");

  const isAuthorizedManager =
    userMember?.role === UserRole.ADMIN || userMember?.role === UserRole.MANAGER;

  // Divisions list
  const divisions = ["Tech", "Marketing", "Design", "HR", "Sales", "Finance"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      alert("Nama proyek, Tanggal Mulai dan Tanggal Selesai wajib diisi!");
      return;
    }

    const cv = parseFloat(contractValue) || 150000000;
    const mp = parseFloat(targetMarginPct) || 30;
    const ma = Math.round((cv * mp) / 100);

    const newProject: Project = {
      id: "p-" + Math.random().toString(36).substr(2, 9),
      name,
      description,
      division,
      start_date: startDate,
      end_date: endDate,
      status: ProjectStatus.ACTIVE,
      contract_value: cv,
      target_margin_pct: mp,
      target_margin_amount: ma,
    };

    onAddProject(newProject);
    setName("");
    setDescription("");
    setDivision("Tech");
    setStartDate("");
    setEndDate("");
    setContractValue("150000000");
    setTargetMarginPct("30");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Add Project Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">Manajemen Semua Proyek</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pilih proyek aktif untuk mengendalikan Kanban, Chat, dan Dokumen Drive.</p>
        </div>
        {isAuthorizedManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer transition-all duration-150"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tambah Proyek Baru</span>
          </button>
        )}
      </div>

      {/* Add Project Form (Modal-like card) */}
      {showAddForm && (
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Form Pembuatan Proyek Baru
          </h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-500">Nama Proyek *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: ZonaTools Mobile App"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-500">Deskripsi Ringkas</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsikan ruang lingkup dan tujuan proyek..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Divisi Penanggung Jawab</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    Divisi {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Nilai Kontrak Proyek (IDR) *</label>
              <input
                type="number"
                required
                min="1"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                placeholder="150000000"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-gray-400 font-semibold">{formatIDR(Number(contractValue))}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Target Profit Margin (%) *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={targetMarginPct}
                  onChange={(e) => setTargetMarginPct(e.target.value)}
                  placeholder="30"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500 pr-8"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">%</span>
              </div>
              <span className="text-[10px] text-purple-600 font-semibold">
                Nominal: {formatIDR(Math.round(((parseFloat(contractValue) || 0) * (parseFloat(targetMarginPct) || 0)) / 100))}
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Tanggal Mulai *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Tanggal Selesai (Target) *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
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
                Simpan Proyek
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((p) => {
          const projectTasks = tasks.filter((t) => t.project_id === p.id);
          const totalPrjTasks = projectTasks.length;
          const completedPrjTasks = projectTasks.filter((t) => t.status === "Done").length;
          const progressPercent = totalPrjTasks > 0 ? Math.round((completedPrjTasks / totalPrjTasks) * 100) : 0;
          const isCurrentlyActive = p.id === activeProjectId;

          return (
            <div
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 relative overflow-hidden ${
                isCurrentlyActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
                  : "border-gray-100 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              {/* Highlight ribbon */}
              {isCurrentlyActive && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] text-white px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider shadow">
                  Aktif
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border border-slate-200/50">
                    Divisi {p.division}
                  </span>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase ${p.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                    {p.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-indigo-600">
                    {p.name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                    {p.description || "Tidak ada deskripsi rinci proyek."}
                  </p>
                </div>

                {/* Financial Summary Pill in Card */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-gray-800">{formatIDR(p.contract_value || 150000000)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                    <span>Margin {p.target_margin_pct || 30}%</span>
                  </div>
                </div>
              </div>

              {/* Progress and Dates block */}
              <div className="mt-5 pt-3 border-t border-gray-50 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-semibold">Tugas Selesai</span>
                    <span className="font-bold text-indigo-600">{progressPercent}% ({completedPrjTasks}/{totalPrjTasks})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Date range indicators */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mulai: {p.start_date}</span>
                  </div>
                  <span>Selesai: {p.end_date}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
