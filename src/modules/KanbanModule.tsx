import React, { useState, useEffect, useRef } from "react";
import { Project, Task, TaskStatus, TaskPriority, TeamMember, UserRole, TimeLog } from "../types";
import {
  Plus,
  Play,
  Square,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Mail,
  CalendarDays,
  ListTodo
} from "lucide-react";
import { syncTaskToCalendar } from "../lib/googleCalendar";
import { sendEmailNotification } from "../lib/googleGmail";

interface KanbanModuleProps {
  activeProject: Project | null;
  tasks: Task[];
  members: TeamMember[];
  timeLogs: TimeLog[];
  userMember: TeamMember | null;
  sheetsConnected: boolean;
  accessToken: string | null;
  onAddTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onLogTime: (timeLog: TimeLog) => void;
  onUpdatePoints: (email: string, pointsAwarded: number) => void;
}

export default function KanbanModule({
  activeProject,
  tasks,
  members,
  timeLogs,
  userMember,
  sheetsConnected,
  accessToken,
  onAddTask,
  onUpdateTaskStatus,
  onLogTime,
  onUpdatePoints
}: KanbanModuleProps) {
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [activeDetailTask, setActiveDetailTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [estHours, setEstHours] = useState(4);
  const [dueDate, setDueDate] = useState("");

  // Filters
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Time Tracker State
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);
  const [timeLogDesc, setTimeLogDesc] = useState("");
  const [showLogDialog, setShowLogDialog] = useState(false);

  // Manual Log Fields
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualDesc, setManualDesc] = useState("");

  const projectTasks = tasks.filter((t) => t.project_id === activeProject?.id);

  // Filter logic
  const filteredTasks = projectTasks.filter((t) => {
    const matchAssignee = filterAssignee === "all" || t.assignee_email === filterAssignee;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchAssignee && matchPriority;
  });

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (trackingTaskId) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [trackingTaskId]);

  const handleStartTimer = (taskId: string) => {
    if (trackingTaskId) {
      alert("Ada pengukur waktu yang sedang berjalan! Hentikan dulu timer aktif Anda.");
      return;
    }
    setTrackingTaskId(taskId);
    setTimerSeconds(0);
    setTimeLogDesc("");
  };

  const handleStopTimer = () => {
    if (!trackingTaskId) return;
    setShowLogDialog(true);
  };

  const handleSaveTimeLog = () => {
    if (!trackingTaskId || !userMember) return;

    const durationMins = Math.max(1, Math.round(timerSeconds / 60));
    const newLog: TimeLog = {
      id: "l-" + Math.random().toString(36).substr(2, 9),
      task_id: trackingTaskId,
      user_email: userMember.email,
      duration_mins: durationMins,
      description: timeLogDesc || "Bekerja menyelesaikan bagian dari tugas.",
      timestamp: new Date().toISOString(),
    };

    onLogTime(newLog);

    // Gamify: Award 1 Point for every 30 minutes logged, min 1 point
    const pointsAwarded = Math.max(1, Math.floor(durationMins / 30));
    onUpdatePoints(userMember.email, pointsAwarded);

    // Update tasks logged hours
    const taskIndex = tasks.findIndex((t) => t.id === trackingTaskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].logged_hours = (tasks[taskIndex].logged_hours || 0) + Number((durationMins / 60).toFixed(1));
    }

    alert(`Catatan kerja disimpan! Anda mendapatkan +${pointsAwarded} Poin Performa! 🚀`);
    setTrackingTaskId(null);
    setTimerSeconds(0);
    setShowLogDialog(false);
  };

  const handleManualTimeLog = (taskId: string) => {
    if (!userMember) return;
    if (!manualDesc) {
      alert("Mohon masukkan deskripsi pekerjaan.");
      return;
    }

    const newLog: TimeLog = {
      id: "l-" + Math.random().toString(36).substr(2, 9),
      task_id: taskId,
      user_email: userMember.email,
      duration_mins: Number(manualMinutes),
      description: manualDesc,
      timestamp: new Date().toISOString(),
    };

    onLogTime(newLog);

    // Gamify
    const pointsAwarded = Math.max(1, Math.floor(Number(manualMinutes) / 30));
    onUpdatePoints(userMember.email, pointsAwarded);

    // update tasks logged hours
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].logged_hours = (tasks[taskIndex].logged_hours || 0) + Number((manualMinutes / 60).toFixed(1));
      if (activeDetailTask && activeDetailTask.id === taskId) {
        setActiveDetailTask({
          ...activeDetailTask,
          logged_hours: activeDetailTask.logged_hours + Number((manualMinutes / 60).toFixed(1)),
        });
      }
    }

    alert(`Waktu kerja disimpan manual! +${pointsAwarded} Poin produktivitas diperoleh.`);
    setManualMinutes(30);
    setManualDesc("");
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assigneeEmail || !dueDate) {
      alert("Judul, Penerima Tugas, dan Tenggat Waktu wajib diisi!");
      return;
    }

    const assignee = members.find((m) => m.email === assigneeEmail);

    const newTask: Task = {
      id: "t-" + Math.random().toString(36).substr(2, 9),
      project_id: activeProject?.id || "",
      title,
      description,
      status: TaskStatus.TODO,
      due_date: dueDate,
      assignee_name: assignee ? assignee.name : "Unassigned",
      assignee_email: assigneeEmail,
      est_hours: Number(estHours),
      logged_hours: 0,
      priority,
    };

    onAddTask(newTask);
    setShowAddTaskForm(false);

    // Gmail Notification: Assignment Notification
    if (sheetsConnected && accessToken) {
      try {
        const subject = `📥 Penugasan Tugas Baru: ${title}`;
        const body = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Halo ${assignee ? assignee.name : "Anggota Tim"}!</h2>
            <p>Anda telah diberikan sebuah tugas baru pada proyek <strong>${activeProject?.name}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Judul:</strong> ${title}</p>
              <p><strong>Prioritas:</strong> ${priority}</p>
              <p><strong>Estimasi Waktu:</strong> ${estHours} Jam</p>
              <p><strong>Tenggat Waktu:</strong> ${dueDate}</p>
              <p><strong>Deskripsi:</strong> ${description || "-"}</p>
            </div>
            <p>Silakan buka dashboard ZonaTools Anda untuk mulai melacak waktu kerja tugas ini.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 11px; color: #9ca3af;">Email notifikasi otomatis dari ZonaTools Project Management.</p>
          </div>
        `;
        await sendEmailNotification(accessToken, assigneeEmail, subject, body);
        console.log("Email penugasan terkirim ke:", assigneeEmail);
      } catch (err) {
        console.error("Gagal mengirim email penugasan:", err);
      }
    }

    // Reset fields
    setTitle("");
    setDescription("");
    setAssigneeEmail("");
    setDueDate("");
  };

  const handleMoveTask = async (taskId: string, currentStatus: TaskStatus, direction: "next" | "prev") => {
    let newStatus: TaskStatus = currentStatus;
    if (direction === "next") {
      if (currentStatus === TaskStatus.TODO) newStatus = TaskStatus.DOING;
      else if (currentStatus === TaskStatus.DOING) newStatus = TaskStatus.DONE;
    } else {
      if (currentStatus === TaskStatus.DONE) newStatus = TaskStatus.DOING;
      else if (currentStatus === TaskStatus.DOING) newStatus = TaskStatus.TODO;
    }

    onUpdateTaskStatus(taskId, newStatus);

    // Award bonus points on DONE
    if (newStatus === TaskStatus.DONE) {
      const taskObj = tasks.find((t) => t.id === taskId);
      if (taskObj) {
        onUpdatePoints(taskObj.assignee_email, 15); // +15 points bonus for completion!

        // Send email completion to Project Owner/User
        if (sheetsConnected && accessToken) {
          try {
            const subject = `🎉 Tugas Selesai: ${taskObj.title}`;
            const body = `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #10b981;">Tugas Telah Selesai!</h2>
                <p>Anggota tim <strong>${taskObj.assignee_name}</strong> telah menyelesaikan tugas berikut:</p>
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #bbf7d0;">
                  <p><strong>Proyek:</strong> ${activeProject?.name}</p>
                  <p><strong>Tugas:</strong> ${taskObj.title}</p>
                  <p><strong>Total Waktu Kerja:</strong> ${taskObj.logged_hours} jam</p>
                </div>
                <p>Assignee mendapatkan bonus sebesar <strong>+15 Poin Performa</strong>! 🏆</p>
              </div>
            `;
            await sendEmailNotification(accessToken, "kelolakan@gmail.com", subject, body);
          } catch (err) {
            console.error("Gagal mengirim email selesainya tugas:", err);
          }
        }
      }
    }
  };

  const handleSyncToCalendar = async (task: Task) => {
    if (!sheetsConnected || !accessToken) {
      alert("Anda harus menghubungkan Google Workspace terlebih dahulu untuk sinkronisasi kalender!");
      return;
    }

    try {
      const result = await syncTaskToCalendar(accessToken, task.title, task.description, task.due_date);
      alert(`Sukses! Tugas disinkronkan ke Google Calendar Anda. \nLink: ${result.htmlLink}`);
    } catch (err: any) {
      alert("Gagal sinkronisasi kalender: " + err.message);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan buka modul **Projects** terlebih dahulu dan pilih salah satu proyek aktif untuk mulai mengelola Kanban board tugas tim.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Project Profile Info */}
        <div>
          <h3 className="text-base font-bold text-gray-800">Proyek: {activeProject.name}</h3>
          <p className="text-xs text-indigo-600 font-medium mt-0.5">Divisi: {activeProject.division} • Target Tenggat: {activeProject.end_date}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="bg-white border border-gray-150 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            <option value="all">Semua Penerima</option>
            {members.map((m) => (
              <option key={m.email} value={m.email}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-white border border-gray-150 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            <option value="all">Semua Prioritas</option>
            <option value={TaskPriority.HIGH}>Tinggi</option>
            <option value={TaskPriority.MEDIUM}>Sedang</option>
            <option value={TaskPriority.LOW}>Rendah</option>
          </select>

          {/* Add task trigger */}
          <button
            onClick={() => setShowAddTaskForm(!showAddTaskForm)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas</span>
          </button>
        </div>
      </div>

      {/* Timer Banner if running */}
      {trackingTaskId && (
        <div className="bg-amber-500 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-500/10 animate-pulse">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white" />
            <div className="leading-none">
              <span className="text-xs font-bold block">WAKTU KERJA SEDANG DIREKAM</span>
              <span className="text-[10px] text-amber-100 mt-1 block">Tugas: {tasks.find((t) => t.id === trackingTaskId)?.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-lg tracking-wider bg-black/20 px-3.5 py-1.5 rounded-xl">{formatTimer(timerSeconds)}</span>
            <button
              onClick={handleStopTimer}
              className="bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Square className="w-4 h-4 fill-white" /> Hentikan & Simpan
            </button>
          </div>
        </div>
      )}

      {/* Create Task Form */}
      {showAddTaskForm && (
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-indigo-600" /> Pembuatan Tugas Baru
          </h4>
          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Judul Tugas *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Mendesain halaman dashboard analitik"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Deskripsi Tugas</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian sub-task, langkah pengerjaan..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs h-16 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Penerima Tugas *</label>
              <select
                required
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Anggota Tim</option>
                {members.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.name} ({m.division})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={TaskPriority.HIGH}>Tinggi</option>
                <option value={TaskPriority.MEDIUM}>Sedang</option>
                <option value={TaskPriority.LOW}>Rendah</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Estimasi Waktu (Jam)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={estHours}
                onChange={(e) => setEstHours(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tenggat Waktu *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTaskForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Simpan & Tugaskan via Gmail
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column Generator */}
        {[
          { id: TaskStatus.TODO, name: "Antrean (Todo)", color: "border-t-slate-500 bg-slate-50/50" },
          { id: TaskStatus.DOING, name: "Dikerjakan (Doing)", color: "border-t-amber-500 bg-amber-50/20" },
          { id: TaskStatus.DONE, name: "Selesai (Done)", color: "border-t-emerald-500 bg-emerald-50/20" },
        ].map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          return (
            <div
              key={column.id}
              className={`rounded-2xl border border-gray-100/80 border-t-4 ${column.color} p-5 flex flex-col min-h-[500px] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100/60 mb-4">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  {column.name}
                </span>
                <span className="bg-slate-200/60 text-slate-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="space-y-4 flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-300 text-xs border border-dashed border-gray-200 rounded-xl bg-white/40">
                    Belum ada tugas
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-gray-100/80 p-5 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all duration-150 space-y-3 cursor-pointer group"
                      onClick={() => setActiveDetailTask(task)}
                    >
                      {/* Priority Tag */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${task.priority === TaskPriority.HIGH ? "bg-red-50 text-red-700 border-red-100" : task.priority === TaskPriority.MEDIUM ? "bg-yellow-50 text-yellow-700 border-yellow-100" : "bg-slate-50 text-slate-700 border-slate-100"}`}>
                          {task.priority} Prioritas
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {task.logged_hours} / {task.est_hours} Jam
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h5 className="font-bold text-gray-800 text-xs leading-snug group-hover:text-indigo-600">
                          {task.title}
                        </h5>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                          {task.description || "Tidak ada deskripsi rinci."}
                        </p>
                      </div>

                      {/* Card Footer controls */}
                      <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{task.assignee_name}</span>
                        </div>

                        {/* Drag and drop equivalent moving buttons */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {column.id !== TaskStatus.TODO && (
                            <button
                              onClick={() => handleMoveTask(task.id, task.status, "prev")}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded"
                              title="Kembalikan status"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Timer controls on DOING column cards */}
                          {column.id === TaskStatus.DOING && (
                            trackingTaskId === task.id ? (
                              <button
                                onClick={handleStopTimer}
                                className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded"
                                title="Hentikan perekaman waktu"
                              >
                                <Square className="w-4 h-4 fill-red-600" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartTimer(task.id)}
                                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded"
                                title="Mulai rekam waktu kerja"
                              >
                                <Play className="w-4 h-4 fill-emerald-600" />
                              </button>
                            )
                          )}

                          {column.id !== TaskStatus.DONE && (
                            <button
                              onClick={() => handleMoveTask(task.id, task.status, "next")}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded"
                              title="Majukan status"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stop Timer Log dialog Modal */}
      {showLogDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-amber-500 animate-spin" /> Simpan Catatan Waktu Kerja
            </h4>
            <p className="text-xs text-gray-500">
              Anda telah melacak sekitar <strong className="text-slate-800">{Math.round(timerSeconds / 60)} menit</strong> pengerjaan. Silakan isikan deskripsi apa saja yang berhasil diselesaikan untuk meraih Poin Performa!
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Deskripsi Pekerjaan *</label>
              <textarea
                required
                value={timeLogDesc}
                onChange={(e) => setTimeLogDesc(e.target.value)}
                placeholder="cth: Mengintegrasikan fungsi OAuth di file login."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setTrackingTaskId(null);
                  setShowLogDialog(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batalkan Tracker (Hapus)
              </button>
              <button
                onClick={handleSaveTimeLog}
                disabled={!timeLogDesc}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Simpan & Dapatkan Poin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details & Time Logs Modal */}
      {activeDetailTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-xl relative custom-scrollbar">
            <button
              onClick={() => setActiveDetailTask(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg font-black cursor-pointer"
            >
              ×
            </button>

            {/* Title & Priority banner */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-black px-2.5 py-0.5 rounded border ${activeDetailTask.priority === TaskPriority.HIGH ? "bg-red-50 text-red-700 border-red-100" : activeDetailTask.priority === TaskPriority.MEDIUM ? "bg-yellow-50 text-yellow-700 border-yellow-100" : "bg-slate-50 text-slate-700 border-slate-100"}`}>
                  {activeDetailTask.priority} Prioritas
                </span>
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold px-2 py-0.5 rounded">
                  Status: {activeDetailTask.status}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-base leading-tight">
                {activeDetailTask.title}
              </h4>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100/60 p-4 rounded-xl text-xs">
              <div>
                <span className="text-gray-400 font-semibold block">Penerima Tugas</span>
                <span className="font-bold text-gray-800 mt-1 block">{activeDetailTask.assignee_name}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">Tenggat Waktu</span>
                <span className="font-bold text-gray-800 mt-1 block">{activeDetailTask.due_date}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">Estimasi Waktu</span>
                <span className="font-bold text-gray-800 mt-1 block">{activeDetailTask.est_hours} Jam</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">Total Kerja Aktual</span>
                <span className="font-bold text-indigo-600 mt-1 block">{activeDetailTask.logged_hours} Jam</span>
              </div>
            </div>

            {/* Description block */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Deskripsi Tugas</span>
              <p className="text-xs text-gray-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100/60">
                {activeDetailTask.description || "Tidak ada rincian deskripsi."}
              </p>
            </div>

            {/* Integration Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSyncToCalendar(activeDetailTask)}
                className="flex-1 py-2 px-3 border border-indigo-200 hover:bg-indigo-50/50 text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Sinkron ke Google Calendar</span>
              </button>
            </div>

            {/* WORK LOGS TIMELINE */}
            <div className="space-y-3.5 border-t border-gray-100 pt-5">
              <h5 className="font-bold text-slate-800 text-xs">Aktivitas Laporan Kerja Kerja (Time Logs)</h5>

              {/* Time logs listing */}
              <div className="space-y-2.5 max-h-44 overflow-y-auto">
                {timeLogs.filter((l) => l.task_id === activeDetailTask.id).length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-4 bg-slate-50/40 rounded-xl border border-dashed border-slate-100">
                    Belum ada waktu kerja yang tercatat pada tugas ini.
                  </p>
                ) : (
                  timeLogs
                    .filter((l) => l.task_id === activeDetailTask.id)
                    .map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between gap-3 text-xs leading-none">
                        <div>
                          <p className="font-semibold text-gray-800 leading-normal">{log.description}</p>
                          <span className="text-[10px] text-gray-400 block mt-1">Dicatat oleh: {log.user_email} • {new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded h-fit shrink-0 text-[10px]">
                          {log.duration_mins} Menit
                        </span>
                      </div>
                    ))
                )}
              </div>

              {/* Manual log form */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3.5 mt-2">
                <span className="block text-[10px] font-bold text-slate-600 uppercase">Input Laporan Waktu Manual</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[9px] font-bold text-gray-400">Durasi (Menit)</label>
                    <input
                      type="number"
                      min={10}
                      step={5}
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Number(e.target.value))}
                      className="w-full bg-white border border-slate-150 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-gray-400">Pekerjaan Yang Dilakukan *</label>
                    <input
                      type="text"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="Menyelesaikan revisi asset grafis."
                      className="w-full bg-white border border-slate-150 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleManualTimeLog(activeDetailTask.id)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Simpan Log Manual & Klaim Poin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
