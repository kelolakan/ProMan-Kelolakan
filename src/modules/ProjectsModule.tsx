import React, { useState, useEffect } from "react";
import { Project, Task, ProjectStatus, UserRole, TeamMember, DocumentItem} from "../types";
import { Briefcase, Calendar, CheckSquare, Plus, FolderPlus, HelpCircle, Coins, Percent,Trash2,Pencil, X,  Wand2, FileUp, Loader2, CheckCheck, Info, AlertCircle  } from "lucide-react";
import { formatIDR } from "./FinanceModule";
import { parseDocumentFile, type ParsedDocumentResult } from "../lib/documentParser";

interface ProjectsModuleProps {
  projects: Project[];
  tasks: Task[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  userMember: TeamMember | null;
  onAddProject: (project: Project) => Promise<void> | void;
  onEditProject: (project: Project) => Promise<void> | void; 
  onDeleteProject: (id: string) => Promise<void>;
}

export default function ProjectsModule({
  projects,
  tasks,
  activeProjectId,
  setActiveProjectId,
  userMember,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: ProjectsModuleProps) {
  // const [showAddForm, setShowAddForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [division, setDivision] = useState("Tech");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractValue, setContractValue] = useState("150000000");
  const [targetMarginPct, setTargetMarginPct] = useState("30");

  const [projectItems, setProjectItems] = useState<DocumentItem[]>([]);

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedDocumentResult | null>(null);
  const [parsedFileName, setParsedFileName] = useState("");
  const [showParsedDetail, setShowParsedDetail] = useState(false);

  const isAuthorizedManager =
    userMember?.role === UserRole.ADMIN || userMember?.role === UserRole.MANAGER;

  // Divisions list
  const divisions = ["Tech", "Marketing", "Design", "HR", "Sales", "Finance", "Admin","Operational"];

  useEffect(() => {
    if (projectItems.length > 0) {
      const total = projectItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      setContractValue(total.toString());
    }
  }, [projectItems]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDivision("Tech");
    setStartDate("");
    setEndDate("");
    setContractValue("150000000");
    setTargetMarginPct("30");
    setProjectItems([]);
    setEditingId(null);
    setShowForm(false);
    setParsedFileName("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); 
    
    setName(project.name);
    setDescription(project.description || "");
    setDivision(project.division);
    setStartDate(project.start_date);
    setEndDate(project.end_date);
    setContractValue(project.contract_value.toString());
    setTargetMarginPct(project.target_margin_pct.toString());
    setProjectItems(project.items || []);
    
    setEditingId(project.id);
    setShowForm(true);
    
    // Scroll ke atas agar form terlihat
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddItem = () => {
    setProjectItems([
      ...projectItems,
      { id: `item-${Date.now()}`, description: "", quantity: 1, unit: "Lot", unit_price: 0, amount: 0 }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...projectItems];
    const item = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      const q = field === "quantity" ? Number(value) : item.quantity;
      const p = field === "unit_price" ? Number(value) : item.unit_price;
      item.amount = (Number(q) || 0) * (Number(p) || 0);
    }
    updated[index] = item;
    setProjectItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setProjectItems(projectItems.filter((_, idx) => idx !== index));
  };

  // --- HANDLER SMART AUTO-FILL ---
  const handleSmartUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setParsedPreview(null);
    setParsedFileName(file.name);

    try {
      // Kita panggil parser (default dokumen adalah INVOICE agar bisa baca tabel)
      const parsed = await parseDocumentFile(file, "INVOICE");
      setParsedPreview(parsed);

      // Terapkan HANYA ke item RAB dan field yang relevan
      if (parsed.items && parsed.items.length > 0) {
        setProjectItems(parsed.items);
      }
      if (parsed.title) setName(parsed.title);
      if (parsed.notes) setDescription(parsed.notes);
    } catch (err: any) {
      setParseError(err?.message || "Gagal memproses dokumen.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
      setParseError("Format tidak didukung. Gunakan PDF, DOCX, atau TXT.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setParseError("Ukuran file maksimal 10MB.");
      return;
    }
    void handleSmartUpload(file);
    e.target.value = "";
  };

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      alert("Nama proyek, Tanggal Mulai dan Tanggal Selesai wajib diisi!");
      return;
    }
    setIsSubmitting(true); 

    const cv = parseFloat(contractValue) || 150000000;
    const mp = parseFloat(targetMarginPct) || 30;
    const ma = Math.round((cv * mp) / 100);
    try{
      if (editingId) {
        // Mode Edit
        const updatedProject: Project = {
          id: editingId,
          name,
          description,
          division,
          start_date: startDate,
          end_date: endDate,
          status: ProjectStatus.ACTIVE, 
          contract_value: cv,
          target_margin_pct: mp,
          target_margin_amount: ma,
          items: projectItems,
        };
        await onEditProject(updatedProject);
      } else {
        // Mode Tambah
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
          items: projectItems,
        };
        await onAddProject(newProject);
      }
      resetForm()
    }catch (error) {
      console.error("Gagal menyimpan proyek:", error);
      // alert("Terjadi kesalahan saat menyimpan proyek."); // Opsional
    } finally {
      setIsSubmitting(false); // Selesai loading
    }
    // const newProject: Project = {
    //   id: "p-" + Math.random().toString(36).substr(2, 9),
    //   name,
    //   description,
    //   division,
    //   start_date: startDate,
    //   end_date: endDate,
    //   status: ProjectStatus.ACTIVE,
    //   contract_value: cv,
    //   target_margin_pct: mp,
    //   target_margin_amount: ma,
    // };

    // onAddProject(newProject);
    // setName("");
    // setDescription("");
    // setDivision("Tech");
    // setStartDate("");
    // setEndDate("");
    // setContractValue("150000000");
    // setTargetMarginPct("30");
    // setShowAddForm(false);
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation(); 
    
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    
    if (!window.confirm(`Hapus proyek ${project.name} dari sistem? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    try {
      await onDeleteProject(id);
    } catch (err: any) {
      alert("Gagal menghapus proyek: " + err.message);
    }
  };

  // return (
  //   <div className="space-y-6 max-w-7xl mx-auto">
  //     {/* Header and Add Project Trigger */}
  //     <div className="flex items-center justify-between">
  //       <div>
  //         <h3 className="text-base font-bold text-gray-800">Manajemen Semua Proyek</h3>
  //         <p className="text-xs text-gray-400 mt-0.5">Pilih proyek aktif untuk mengendalikan Kanban, Chat, dan Dokumen Drive.</p>
  //       </div>
  //       {isAuthorizedManager && !showForm && (
  //         <button
  //           onClick={() => setShowForm(true)}
  //           className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer transition-all duration-150"
  //         >
  //           <FolderPlus className="w-4 h-4" />
  //           <span>Tambah Proyek Baru</span>
  //         </button>
  //       )}
  //     </div>

  //     {/* Add Project Form (Modal-like card) */}
  //     {showForm && (
  //       <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
  //         {/* <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
  //           <Plus className="w-4 h-4 text-indigo-600" /> Form Pembuatan Proyek Baru
  //         </h4>*/}
  //         <div className="flex justify-between items-center">
  //           <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
  //             {editingId ? <Pencil className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
  //             {editingId ? "Edit Proyek" : "Form Pembuatan Proyek Baru"}
  //           </h4>
  //           <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
  //              <X className="w-5 h-5" />
  //           </button>
  //         </div>
  //         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //           <div className="space-y-1.5 col-span-2">
  //             <label className="text-xs font-semibold text-gray-500">Nama Proyek *</label>
  //             <input
  //               type="text"
  //               required
  //               value={name}
  //               onChange={(e) => setName(e.target.value)}
  //               placeholder="cth: ZonaTools Mobile App"
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
  //             />
  //           </div>
  //           <div className="space-y-1.5 col-span-2">
  //             <label className="text-xs font-semibold text-gray-500">Deskripsi Ringkas</label>
  //             <textarea
  //               value={description}
  //               onChange={(e) => setDescription(e.target.value)}
  //               placeholder="Deskripsikan ruang lingkup dan tujuan proyek..."
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:border-indigo-500"
  //             />
  //           </div>
  //           <div className="space-y-1.5">
  //             <label className="text-xs font-semibold text-gray-500">Divisi Penanggung Jawab</label>
  //             <select
  //               value={division}
  //               onChange={(e) => setDivision(e.target.value)}
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
  //             >
  //               {divisions.map((d) => (
  //                 <option key={d} value={d}>
  //                   Divisi {d}
  //                 </option>
  //               ))}
  //             </select>
  //           </div>
  //           <div className="space-y-1.5">
  //             <label className="text-xs font-semibold text-gray-500">Nilai Kontrak Proyek (IDR) *</label>
  //             <input
  //               type="number"
  //               required
  //               min="1"
  //               value={contractValue}
  //               onChange={(e) => setContractValue(e.target.value)}
  //               placeholder="150000000"
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
  //             />
  //             <span className="text-[10px] text-gray-400 font-semibold">{formatIDR(Number(contractValue))}</span>
  //           </div>
  //           <div className="space-y-1.5">
  //             <label className="text-xs font-semibold text-gray-500">Target Profit Margin (%) *</label>
  //             <div className="relative">
  //               <input
  //                 type="number"
  //                 required
  //                 min="0"
  //                 max="100"
  //                 value={targetMarginPct}
  //                 onChange={(e) => setTargetMarginPct(e.target.value)}
  //                 placeholder="30"
  //                 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500 pr-8"
  //               />
  //               <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">%</span>
  //             </div>
  //             <span className="text-[10px] text-purple-600 font-semibold">
  //               Nominal: {formatIDR(Math.round(((parseFloat(contractValue) || 0) * (parseFloat(targetMarginPct) || 0)) / 100))}
  //             </span>
  //           </div>
  //           <div className="space-y-1.5">
  //             <label className="text-xs font-semibold text-gray-500">Tanggal Mulai *</label>
  //             <input
  //               type="date"
  //               required
  //               value={startDate}
  //               onChange={(e) => setStartDate(e.target.value)}
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
  //             />
  //           </div>
  //           <div className="space-y-1.5">
  //             <label className="text-xs font-semibold text-gray-500">Tanggal Selesai (Target) *</label>
  //             <input
  //               type="date"
  //               required
  //               value={endDate}
  //               onChange={(e) => setEndDate(e.target.value)}
  //               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
  //             />
  //           </div>
  //           <div className="col-span-2 flex justify-end gap-3 pt-2">
  //             <button
  //               type="button"
  //               onClick={() => setShowAddForm(false)}
  //               className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
  //             >
  //               Batal
  //             </button>
  //             <button
  //               type="submit"
  //               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
  //             >
  //               {editingId ? "Simpan Perubahan" : "Simpan Proyek"}
  //             </button>
  //           </div>
  //         </form>
  //       </div>
  //     )}

  //     {/* Grid of Projects */}
  //     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  //       {projects.map((p) => {
  //         const projectTasks = tasks.filter((t) => t.project_id === p.id);
  //         const totalPrjTasks = projectTasks.length;
  //         const completedPrjTasks = projectTasks.filter((t) => t.status === "Done").length;
  //         const progressPercent = totalPrjTasks > 0 ? Math.round((completedPrjTasks / totalPrjTasks) * 100) : 0;
  //         const isCurrentlyActive = p.id === activeProjectId;

  //         return (
  //           <div
  //             key={p.id}
  //             onClick={() => setActiveProjectId(p.id)}
  //             className={`bg-white rounded-2xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 relative overflow-hidden ${
  //               isCurrentlyActive
  //                 ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
  //                 : "border-gray-100 hover:border-gray-300 hover:shadow-md"
  //             }`}
  //           >
  //             {/* Highlight ribbon */}
  //             {isCurrentlyActive && (
  //               <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] text-white px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider shadow">
  //                 Aktif
  //               </div>
  //             )}

  //             <div className="space-y-3">
  //               <div className="flex items-center gap-2">
  //                 <span className="bg-slate-100 text-slate-700 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border border-slate-200/50">
  //                   Divisi {p.division}
  //                 </span>
  //                 <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase ${p.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
  //                   {p.status}
  //                 </span>
  //               </div>

  //               <div>
  //                 <h4 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-indigo-600">
  //                   {p.name}
  //                 </h4>
  //                 <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
  //                   {p.description || "Tidak ada deskripsi rinci proyek."}
  //                 </p>
  //               </div>

  //               {/* Financial Summary Pill in Card */}
  //               <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
  //                 <div className="flex items-center gap-1.5">
  //                   <Coins className="w-3.5 h-3.5 text-indigo-600" />
  //                   <span className="font-bold text-gray-800">{formatIDR(p.contract_value || 150000000)}</span>
  //                 </div>
  //                 <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
  //                   <span>Margin {p.target_margin_pct || 30}%</span>
  //                 </div>
  //               </div>
  //             </div>

  //             {/* Progress and Dates block */}
  //             <div className="mt-5 pt-3 border-t border-gray-50 space-y-3">
  //               {/* Progress bar */}
  //               <div>
  //                 <div className="flex items-center justify-between text-xs mb-1.5">
  //                   <span className="text-gray-400 font-semibold">Tugas Selesai</span>
  //                   <span className="font-bold text-indigo-600">{progressPercent}% ({completedPrjTasks}/{totalPrjTasks})</span>
  //                 </div>
  //                 <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
  //                   <div
  //                     className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
  //                     style={{ width: `${progressPercent}%` }}
  //                   ></div>
  //                 </div>
  //               </div>

  //               {/* Date range indicators */}
  //               <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
  //                 <div className="flex items-center gap-1">
  //                   <Calendar className="w-3.5 h-3.5" />
  //                   <span>Mulai: {p.start_date}</span>
  //                 </div>
  //                 <span>Selesai: {p.end_date}</span>
  //                 {isAuthorizedManager && (
  //                   <div className="flex items-center gap-1 ml-auto z-20">
  //                     <button
  //                       onClick={(e) => handleEditClick(e, p)}
  //                       className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
  //                       title="Edit Proyek"
  //                     >
  //                       <Pencil className="w-3.5 h-3.5" />
  //                     </button>
  //                     <button
  //                       onClick={(e) => handleDelete(e, p.id)}
  //                       className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
  //                       title="Hapus Proyek"
  //                     >
  //                       <Trash2 className="w-3.5 h-3.5" />
  //                     </button>
  //                   </div>
  //                 )}
  //               </div>
  //             </div>
  //           </div>
  //         );
  //       })}
  //     </div>
  //   </div>
  // );
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Add Project Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">Manajemen Semua Proyek</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pilih proyek aktif untuk mengendalikan Kanban, Chat, dan Dokumen Drive.</p>
        </div>
        {isAuthorizedManager && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer transition-all duration-150"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tambah Proyek Baru</span>
          </button>
        )}
      </div>

      {/* Add Project Form (Modal-like card) */}
      {showForm && (
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
              {editingId ? "Edit Proyek" : "Form Pembuatan Proyek Baru"}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
               <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ================================================================= */}
            {/* 1. SMART AUTO-FILL (PALING ATAS)                                  */}
            {/* ================================================================= */}
            <div className="col-span-2 p-4 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Wand2 className="w-4.5 h-4.5" />
                  </div> */}
                  <div>
                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      Smart Auto-Fill (RAB / Dokumen)
                    </h3>
                    <p className="text-[11px] text-indigo-700/80 mt-0.5">Upload PO/Dokumen untuk mengisi otomatis tabel RAB di bawah.</p>
                  </div>
                </div>
                {parsedPreview && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Auto-filled
                  </span>
                )}
              </div>

              <label
                htmlFor="smart-upload-project"
                className={`flex flex-col items-center justify-center gap-2 w-full py-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                  isParsing ? "border-indigo-400 bg-white/60 pointer-events-none" : "border-indigo-300 hover:border-indigo-500 bg-white/40 hover:bg-white/70"
                }`}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-700">Menganalisis {parsedFileName}...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800">Klik untuk upload dokumen RAB / PO</span>
                    <span className="text-[10px] text-indigo-500">Format: PDF, DOCX, TXT (maks 10MB)</span>
                  </>
                )}
                <input id="smart-upload-project" type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileInputChange} disabled={isParsing} />
              </label>

              {parseError && (
                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red-700 font-medium">{parseError}</span>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* 2. FORM MANUAL (TENGAH)                                           */}
            {/* ================================================================= */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-500">Nama Proyek *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: ZonaTools Mobile App" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-500">Deskripsi Ringkas</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsikan ruang lingkup dan tujuan proyek..." className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Divisi Penanggung Jawab</label>
              <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
                {divisions.map((d) => <option key={d} value={d}>Divisi {d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Nilai Kontrak Proyek (IDR) *</label>
              <input type="number" required min="1" value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="150000000" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-500" />
              <span className="text-[10px] text-gray-400 font-semibold">{formatIDR(Number(contractValue))}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Target Profit Margin (%) *</label>
              <div className="relative">
                <input type="number" required min="0" max="100" value={targetMarginPct} onChange={(e) => setTargetMarginPct(e.target.value)} placeholder="30" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500 pr-8" />
                <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">%</span>
              </div>
              <span className="text-[10px] text-purple-600 font-semibold">Nominal: {formatIDR(Math.round(((parseFloat(contractValue) || 0) * (parseFloat(targetMarginPct) || 0)) / 100))}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Tanggal Mulai *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Tanggal Selesai (Target) *</label>
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
            </div>

            {/* ================================================================= */}
            {/* 3. RINCIAN RAB (PALING BAWAH)                                     */}
            {/* ================================================================= */}
            <div className="col-span-2 mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Rincian RAB / Barang & Jasa</h3>
                <button type="button" onClick={handleAddItem} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /><span>Tambah Baris</span>
                </button>
              </div>

              <div className="space-y-2">
                {projectItems.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4 italic">Belum ada RAB. Silakan tambah baris atau upload dokumen.</p>
                )}
                {projectItems.map((it, idx) => (
                  <div key={it.id || idx} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex-1 w-full">
                      <input type="text" required placeholder="Nama barang / kegiatan..." value={it.description} onChange={(e) => handleUpdateItem(idx, "description", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input type="number" min={1} placeholder="Qty" value={it.quantity} onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)} className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center" />
                      <input type="text" placeholder="Satuan" value={it.unit} onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center" />
                      <input type="number" placeholder="Harga" value={it.unit_price} onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)} className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-right" />
                      <span className="w-28 text-right font-mono font-bold text-xs text-slate-800 pr-1">{formatIDR(it.amount)}</span>
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-slate-300">
                {isSubmitting ? "Menyimpan..." : (editingId ? "Simpan Perubahan" : "Simpan Proyek")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Projects (TIDAK DIUBAH) */}
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
                isCurrentlyActive ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg" : "border-gray-100 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              {isCurrentlyActive && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] text-white px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider shadow">
                  Aktif
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border border-slate-200/50">Divisi {p.division}</span>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase ${p.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>{p.status}</span>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-indigo-600">{p.name}</h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{p.description || "Tidak ada deskripsi rinci proyek."}</p>
                </div>

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

              <div className="mt-5 pt-3 border-t border-gray-50 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-semibold">Tugas Selesai</span>
                    <span className="font-bold text-indigo-600">{progressPercent}% ({completedPrjTasks}/{totalPrjTasks})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mulai: {p.start_date}</span>
                  </div>
                  <span>Selesai: {p.end_date}</span>
                  {isAuthorizedManager && (
                    <div className="flex items-center gap-1 ml-auto z-20">
                      <button onClick={(e) => handleEditClick(e, p)} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer" title="Edit Proyek"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => handleDelete(e, p.id)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer" title="Hapus Proyek"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
