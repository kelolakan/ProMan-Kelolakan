import React, { useState, useEffect } from "react";
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
  CalendarCheck2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  Layers,
  X,
  Filter,
  Flame,
  AlertTriangle,
  ArrowDown,
  RotateCcw,
  SunMedium,
  Timer
} from "lucide-react";
import { syncTaskToCalendar, updateTaskCalendarEvent, deleteTaskCalendarEvent } from "../lib/googleCalendar";
import { sendEmailNotification } from "../lib/googleGmail";
import {
  formatWorkDuration,
  formatWorkDurationShort,
  hoursToMandays,
  mandaysToHours,
  HOURS_PER_WORK_DAY
} from "../lib/timeUtils";

interface KanbanModuleProps {
  activeProject: Project | null;
  tasks: Task[];
  members: TeamMember[];
  timeLogs: TimeLog[];
  userMember: TeamMember | null;
  sheetsConnected: boolean;
  accessToken: string | null;
  onAddTask: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onLogTime: (timeLog: TimeLog) => void;
  onUpdatePoints: (email: string, pointsAwarded: number) => void;
  onConnectGoogle?: () => void;
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
  onUpdateTask,
  onUpdateTaskStatus,
  onLogTime,
  onUpdatePoints,
  onConnectGoogle
}: KanbanModuleProps) {
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [activeDetailTask, setActiveDetailTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [autoSyncCalendar, setAutoSyncCalendar] = useState(true);

  // Time Unit selection for Task Creation (Days vs Hours)
  const [timeUnitMode, setTimeUnitMode] = useState<"DAYS" | "HOURS">("DAYS");
  const [estDaysInput, setEstDaysInput] = useState<number>(1);
  const [estHoursInput, setEstHoursInput] = useState<number>(8);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Syncing Loading State per task
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<{ id: string; text: string; link?: string } | null>(null);

  // Time Tracker State
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeLogDesc, setTimeLogDesc] = useState("");
  const [showLogDialog, setShowLogDialog] = useState(false);

  // Manual Log Fields with flexible units
  const [manualLogUnit, setManualLogUnit] = useState<"MINUTES" | "HOURS" | "DAYS">("HOURS");
  const [manualDurationVal, setManualDurationVal] = useState<number>(2);
  const [manualDesc, setManualDesc] = useState("");

  const projectTasks = tasks.filter((t) => t.project_id === activeProject?.id);

  // Counts for quick badges
  const totalCount = projectTasks.length;
  const todoCount = projectTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const doingCount = projectTasks.filter((t) => t.status === TaskStatus.DOING).length;
  const doneCount = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;

  const highCount = projectTasks.filter((t) => t.priority === TaskPriority.HIGH).length;
  const mediumCount = projectTasks.filter((t) => t.priority === TaskPriority.MEDIUM).length;
  const lowCount = projectTasks.filter((t) => t.priority === TaskPriority.LOW).length;

  // Filter logic
  const filteredTasks = projectTasks.filter((t) => {
    const matchAssignee = filterAssignee === "all" || t.assignee_email === filterAssignee;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch = !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchAssignee && matchPriority && matchStatus && matchSearch;
  });

  const isFilterActive = filterAssignee !== "all" || filterPriority !== "all" || filterStatus !== "all" || searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterAssignee("all");
    setFilterPriority("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

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

  // Keep activeDetailTask synchronized if tasks change
  useEffect(() => {
    if (activeDetailTask) {
      const updated = tasks.find((t) => t.id === activeDetailTask.id);
      if (updated) {
        setActiveDetailTask(updated);
      }
    }
  }, [tasks]);

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
      const updatedTask = {
        ...tasks[taskIndex],
        logged_hours: (tasks[taskIndex].logged_hours || 0) + Number((durationMins / 60).toFixed(1)),
      };
      if (onUpdateTask) {
        onUpdateTask(updatedTask);
      }
    }

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

    let calculatedMins = 30;
    if (manualLogUnit === "MINUTES") {
      calculatedMins = Math.max(5, Number(manualDurationVal) || 30);
    } else if (manualLogUnit === "HOURS") {
      calculatedMins = Math.max(5, Math.round((Number(manualDurationVal) || 1) * 60));
    } else if (manualLogUnit === "DAYS") {
      // 1 Hari Kerja (Mandays) = 8 Jam = 480 Menit
      calculatedMins = Math.max(5, Math.round((Number(manualDurationVal) || 1) * HOURS_PER_WORK_DAY * 60));
    }

    const newLog: TimeLog = {
      id: "l-" + Math.random().toString(36).substr(2, 9),
      task_id: taskId,
      user_email: userMember.email,
      duration_mins: calculatedMins,
      description: manualDesc,
      timestamp: new Date().toISOString(),
    };

    onLogTime(newLog);

    // Gamify: 1 point for every 30 mins
    const pointsAwarded = Math.max(1, Math.floor(calculatedMins / 30));
    onUpdatePoints(userMember.email, pointsAwarded);

    // Update tasks logged hours
    const target = tasks.find((t) => t.id === taskId);
    if (target && onUpdateTask) {
      const addedHours = Number((calculatedMins / 60).toFixed(1));
      const updatedTask = {
        ...target,
        logged_hours: Number(((target.logged_hours || 0) + addedHours).toFixed(1)),
      };
      onUpdateTask(updatedTask);
      if (activeDetailTask && activeDetailTask.id === taskId) {
        setActiveDetailTask(updatedTask);
      }
    }

    setManualDurationVal(2);
    setManualDesc("");
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assigneeEmail || !dueDate) {
      alert("Judul, Penerima Tugas, dan Tenggat Waktu wajib diisi!");
      return;
    }

    const assignee = members.find((m) => m.email === assigneeEmail);

    const calculatedHours =
      timeUnitMode === "DAYS"
        ? Math.max(0.5, (Number(estDaysInput) || 1) * HOURS_PER_WORK_DAY)
        : Math.max(0.5, Number(estHoursInput) || 8);

    let newTask: Task = {
      id: "t-" + Math.random().toString(36).substr(2, 9),
      project_id: activeProject?.id || "",
      title,
      description,
      status: TaskStatus.TODO,
      due_date: dueDate,
      assignee_name: assignee ? assignee.name : "Unassigned",
      assignee_email: assigneeEmail,
      est_hours: calculatedHours,
      logged_hours: 0,
      priority,
      calendar_synced: false,
    };

    // If auto-sync to Google Calendar is requested and Google is connected
    if (autoSyncCalendar && sheetsConnected && accessToken) {
      try {
        const calRes = await syncTaskToCalendar(
          accessToken,
          newTask.title,
          newTask.description,
          newTask.due_date,
          activeProject?.name,
          newTask.priority
        );
        newTask.calendar_synced = true;
        newTask.calendar_event_id = calRes.eventId;
        newTask.calendar_event_link = calRes.htmlLink;
      } catch (calErr) {
        console.error("Gagal membuat event di Google Calendar saat buat tugas:", calErr);
      }
    }

    onAddTask(newTask);
    setShowAddTaskForm(false);

    // Gmail Notification: Assignment Notification
    if (sheetsConnected && accessToken) {
      try {
        const durationFormatted = formatWorkDuration(calculatedHours);
        const subject = `📥 Penugasan Tugas Baru: ${title}`;
        const body = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Halo ${assignee ? assignee.name : "Anggota Tim"}!</h2>
            <p>Anda telah diberikan sebuah tugas baru pada proyek <strong>${activeProject?.name}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Judul:</strong> ${title}</p>
              <p><strong>Prioritas:</strong> ${priority}</p>
              <p><strong>Estimasi Waktu:</strong> ${durationFormatted}</p>
              <p><strong>Tenggat Waktu:</strong> ${dueDate}</p>
              <p><strong>Deskripsi:</strong> ${description || "-"}</p>
              ${newTask.calendar_synced ? `<p><strong>Google Calendar:</strong> ✅ Tersinkronisasi otomatis</p>` : ""}
            </div>
            <p>Silakan buka dashboard ZonaTools Anda untuk mulai melacak waktu kerja tugas ini.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 11px; color: #9ca3af;">Email notifikasi otomatis dari ZonaTools Project Management.</p>
          </div>
        `;
        await sendEmailNotification(accessToken, assigneeEmail, subject, body);
      } catch (err) {
        console.error("Gagal mengirim email penugasan:", err);
      }
    }

    // Reset fields
    setTitle("");
    setDescription("");
    setAssigneeEmail("");
    setDueDate("");
    setEstDaysInput(1);
    setEstHoursInput(8);
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

  /**
   * TOGGLE / SYNC TO GOOGLE CALENDAR FOR INDIVIDUAL TASK
   */
  const handleToggleCalendarSync = async (task: Task, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // Check if Google Workspace is connected
    if (!sheetsConnected || !accessToken) {
      const wantConnect = confirm(
        "Akun Google Workspace belum terhubung. Ingin menghubungkan akun Google sekarang untuk sinkronisasi Google Calendar?"
      );
      if (wantConnect && onConnectGoogle) {
        onConnectGoogle();
      }
      return;
    }

    setSyncingTaskId(task.id);

    try {
      if (task.calendar_synced && task.calendar_event_id) {
        // Toggle OFF: Delete event from Google Calendar (confirm first per safety rule)
        const wantDelete = confirm(
          `Apakah Anda yakin ingin menghapus jadwal tugas "${task.title}" dari Google Calendar Anda?`
        );
        if (!wantDelete) {
          setSyncingTaskId(null);
          return;
        }

        await deleteTaskCalendarEvent(accessToken, task.calendar_event_id);

        const updatedTask: Task = {
          ...task,
          calendar_synced: false,
          calendar_event_id: undefined,
          calendar_event_link: undefined,
        };

        if (onUpdateTask) {
          onUpdateTask(updatedTask);
        }
        if (activeDetailTask && activeDetailTask.id === task.id) {
          setActiveDetailTask(updatedTask);
        }

        setSyncSuccessMsg({
          id: task.id,
          text: `Sinkronisasi Kalender dinonaktifkan dan event dihapus dari Google Calendar.`,
        });
      } else {
        // Toggle ON: Create event in Google Calendar
        const calRes = await syncTaskToCalendar(
          accessToken,
          task.title,
          task.description,
          task.due_date,
          activeProject?.name,
          task.priority
        );

        const updatedTask: Task = {
          ...task,
          calendar_synced: true,
          calendar_event_id: calRes.eventId,
          calendar_event_link: calRes.htmlLink,
        };

        if (onUpdateTask) {
          onUpdateTask(updatedTask);
        }
        if (activeDetailTask && activeDetailTask.id === task.id) {
          setActiveDetailTask(updatedTask);
        }

        setSyncSuccessMsg({
          id: task.id,
          text: `Berhasil disinkronkan ke Google Calendar! Acara dibuat pada tenggat ${task.due_date}.`,
          link: calRes.htmlLink,
        });
      }
    } catch (err: any) {
      alert("Terjadi kesalahan sinkronisasi Google Calendar: " + err.message);
    } finally {
      setSyncingTaskId(null);
    }
  };

  /**
   * RE-SYNC / UPDATE EXISTING EVENT
   */
  const handleUpdateCalendarEvent = async (task: Task) => {
    if (!sheetsConnected || !accessToken || !task.calendar_event_id) return;

    setSyncingTaskId(task.id);
    try {
      const res = await updateTaskCalendarEvent(
        accessToken,
        task.calendar_event_id,
        task.title,
        task.description,
        task.due_date,
        activeProject?.name,
        task.priority
      );

      const updatedTask: Task = {
        ...task,
        calendar_synced: true,
        calendar_event_link: res.htmlLink,
      };

      if (onUpdateTask) {
        onUpdateTask(updatedTask);
      }
      if (activeDetailTask && activeDetailTask.id === task.id) {
        setActiveDetailTask(updatedTask);
      }

      setSyncSuccessMsg({
        id: task.id,
        text: `Jadwal Google Calendar berhasil diperbarui sesuai data terbaru.`,
        link: res.htmlLink,
      });
    } catch (err: any) {
      alert("Gagal memperbarui event Google Calendar: " + err.message);
    } finally {
      setSyncingTaskId(null);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-200 p-10 rounded-2xl text-center max-w-xl mx-auto space-y-4 mt-8">
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800 text-base">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-500 leading-relaxed">
          Silakan buka modul <strong>Proyek</strong> terlebih dahulu dan pilih salah satu proyek aktif untuk mulai mengelola Kanban board serta sinkronisasi jadwal ke Google Calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast / Sync Notification Banner */}
      {syncSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">{syncSuccessMsg.text}</span>
              {syncSuccessMsg.link && (
                <a
                  href={syncSuccessMsg.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-semibold mt-0.5 inline-flex items-center gap-1 hover:text-emerald-800"
                >
                  Lihat di Google Calendar <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setSyncSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Controls Row */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Project Profile Info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {activeProject.division}
              </span>
              <span className="text-xs text-gray-500 font-medium">Tenggat Proyek: {activeProject.end_date}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <SunMedium className="w-3 h-3 text-amber-500" />
                Standar 1 Hari Kerja = 8 Jam (Mandays)
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{activeProject.name}</h3>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Google Workspace Connection Status Pill */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                sheetsConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{sheetsConnected ? "Google Calendar Terhubung" : "Kalender Belum Terhubung"}</span>
              {!sheetsConnected && onConnectGoogle && (
                <button
                  onClick={onConnectGoogle}
                  className="ml-1 underline font-bold hover:text-amber-800 cursor-pointer"
                >
                  Hubungkan
                </button>
              )}
            </div>

            {/* Add task trigger */}
            <button
              onClick={() => setShowAddTaskForm(!showAddTaskForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>

        {/* Project Work Hours & Mandays Summary Ribbon */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-500 font-medium">Beban Rencana (Estimasi):</span>
              <span className="font-bold text-gray-900">
                {formatWorkDuration(projectTasks.reduce((s, t) => s + (t.est_hours || 0), 0))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-500 font-medium">Realisasi Kerja Aktual:</span>
              <span className="font-bold text-emerald-700">
                {formatWorkDuration(projectTasks.reduce((s, t) => s + (t.logged_hours || 0), 0))}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            Proyek FTTH PT. Exven Mitra Solusindo
          </span>
        </div>

        {/* QUICK FILTERS BAR */}
        <div className="pt-3 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Status & Priority Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filter:
            </span>

            {/* STATUS QUICK CHIPS */}
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Semua Status ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(TaskStatus.TODO)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterStatus === TaskStatus.TODO
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Todo ({todoCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(TaskStatus.DOING)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterStatus === TaskStatus.DOING
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-amber-700 hover:text-amber-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Doing ({doingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(TaskStatus.DONE)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterStatus === TaskStatus.DONE
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Done ({doneCount})
              </button>
            </div>

            {/* PRIORITY QUICK CHIPS */}
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterPriority("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterPriority === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Semua Prioritas
              </button>
              <button
                type="button"
                onClick={() => setFilterPriority(TaskPriority.HIGH)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  filterPriority === TaskPriority.HIGH
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-red-700 hover:text-red-900"
                }`}
              >
                <Flame className="w-3 h-3" /> Tinggi ({highCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterPriority(TaskPriority.MEDIUM)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  filterPriority === TaskPriority.MEDIUM
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-amber-700 hover:text-amber-900"
                }`}
              >
                <AlertTriangle className="w-3 h-3" /> Sedang ({mediumCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterPriority(TaskPriority.LOW)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  filterPriority === TaskPriority.LOW
                    ? "bg-slate-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowDown className="w-3 h-3" /> Rendah ({lowCount})
              </button>
            </div>
          </div>

          {/* Search, Assignee Dropdown & Reset Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari tugas / assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white w-40 sm:w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Assignee Filter */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">Semua Penerima</option>
              {members.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Reset Filter Button */}
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timer Banner if running */}
      {trackingTaskId && (
        <div className="bg-amber-500 text-white p-4 rounded-2xl flex items-center justify-between shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white" />
            <div>
              <span className="text-xs font-bold block">WAKTU KERJA SEDANG DIREKAM</span>
              <span className="text-[11px] text-amber-100 mt-0.5 block">
                Tugas: {tasks.find((t) => t.id === trackingTaskId)?.title}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-lg tracking-wider bg-black/20 px-3.5 py-1.5 rounded-xl">
              {formatTimer(timerSeconds)}
            </span>
            <button
              onClick={handleStopTimer}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Square className="w-4 h-4 fill-white" /> Hentikan & Simpan
            </button>
          </div>
        </div>
      )}

      {/* Create Task Form */}
      {showAddTaskForm && (
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Pembuatan Tugas Baru
            </h4>
            <button
              onClick={() => setShowAddTaskForm(false)}
              className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Judul Tugas *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Penyusunan Dokumen Spesifikasi Teknis"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Deskripsi Tugas</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian langkah pengerjaan, link referensi, target deliverable..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Penerima Tugas *</label>
              <select
                required
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
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
              <label className="text-[11px] font-bold text-gray-500 uppercase">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value={TaskPriority.HIGH}>Tinggi</option>
                <option value={TaskPriority.MEDIUM}>Sedang</option>
                <option value={TaskPriority.LOW}>Rendah</option>
              </select>
            </div>

            {/* Time Unit Selector: Days vs Hours */}
            <div className="space-y-1.5 md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Estimasi Durasi Kerja *
                </label>
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTimeUnitMode("DAYS")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeUnitMode === "DAYS"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hari Kerja (Mandays)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeUnitMode("HOURS")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeUnitMode === "HOURS"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Per Jam (Hours)
                  </button>
                </div>
              </div>

              {timeUnitMode === "DAYS" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      max={60}
                      value={estDaysInput}
                      onChange={(e) => setEstDaysInput(Number(e.target.value))}
                      className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">Hari Kerja</span>
                    <span className="text-xs text-gray-500 font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                      = {(estDaysInput * HOURS_PER_WORK_DAY).toFixed(1)} Jam Kerja (8j/hari)
                    </span>
                  </div>

                  {/* Quick Preset Buttons for FTTH Rollout */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-gray-400 font-medium">Pilihan cepat:</span>
                    {[0.5, 1, 1.5, 2, 3, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEstDaysInput(d)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                          estDaysInput === d
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {d} Hari ({d * 8}j)
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      max={500}
                      value={estHoursInput}
                      onChange={(e) => setEstHoursInput(Number(e.target.value))}
                      className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">Jam Kerja</span>
                    <span className="text-xs text-gray-500 font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                      = {hoursToMandays(estHoursInput)} Hari Kerja
                    </span>
                  </div>

                  {/* Quick Preset Buttons for Hours */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-gray-400 font-medium">Pilihan cepat:</span>
                    {[4, 8, 12, 16, 24, 40].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setEstHoursInput(h)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                          estHoursInput === h
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {h} Jam ({hoursToMandays(h)}h)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Tenggat Waktu *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Sync to Google Calendar Toggle in Form */}
            <div className="md:col-span-2 flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncCalendar}
                  onChange={(e) => setAutoSyncCalendar(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div className="text-xs">
                <span className="font-bold text-gray-800 block flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  Sync to Google Calendar Otomatis
                </span>
                <span className="text-[10px] text-gray-500">
                  Buat event dan pengingat di Google Calendar secara otomatis sesuai tenggat waktu tugas.
                </span>
              </div>
            </div>

            <div className="col-span-3 flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddTaskForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Simpan Tugas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {[
          { id: TaskStatus.TODO, name: "Antrean (Todo)", color: "border-t-slate-500 bg-slate-50/50" },
          { id: TaskStatus.DOING, name: "Dikerjakan (Doing)", color: "border-t-amber-500 bg-amber-50/20" },
          { id: TaskStatus.DONE, name: "Selesai (Done)", color: "border-t-emerald-500 bg-emerald-50/20" },
        ].map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          return (
            <div
              key={column.id}
              className={`rounded-2xl border border-gray-200 border-t-4 ${column.color} p-4 flex flex-col min-h-[520px] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-4">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  {column.name}
                </span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="space-y-3.5 flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-white/50">
                    Tidak ada tugas
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isSyncing = syncingTaskId === task.id;
                    const isSynced = Boolean(task.calendar_synced);

                    return (
                      <div
                        key={task.id}
                        className="bg-white border border-gray-200 p-4 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-150 space-y-3 cursor-pointer group"
                        onClick={() => setActiveDetailTask(task)}
                      >
                        {/* Header: Priority & Time Hours */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${
                              task.priority === TaskPriority.HIGH
                                ? "bg-red-50 text-red-700 border-red-200"
                                : task.priority === TaskPriority.MEDIUM
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {task.priority} Prioritas
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/80"
                            title={`Realisasi: ${task.logged_hours} Jam (${hoursToMandays(task.logged_hours)} Hari) dari Estimasi: ${task.est_hours} Jam (${hoursToMandays(task.est_hours)} Hari)`}
                          >
                            {task.logged_hours > 0 ? (
                              <span>
                                {task.logged_hours}j / {task.est_hours}j ({hoursToMandays(task.est_hours)}h)
                              </span>
                            ) : (
                              <span>
                                {task.est_hours} Jam ({hoursToMandays(task.est_hours)} Hari)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs leading-snug group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </h5>
                          {task.description && (
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Due Date & Calendar Sync Toggle Bar on Task Card */}
                        <div
                          className="pt-2 pb-1 border-t border-gray-100 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-medium">{task.due_date}</span>
                          </div>

                          {/* Interactive Calendar Sync Toggle Switch */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleToggleCalendarSync(task, e)}
                              disabled={isSyncing}
                              title={
                                isSynced
                                  ? "Klik untuk menonaktifkan sinkronisasi Google Calendar"
                                  : "Klik untuk mengaktifkan sinkronisasi Google Calendar"
                              }
                              className={`px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                isSynced
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                              }`}
                            >
                              {isSyncing ? (
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              ) : isSynced ? (
                                <CalendarCheck2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <CalendarDays className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{isSynced ? "G-Cal Aktif" : "Sync G-Cal"}</span>
                            </button>

                            {isSynced && task.calendar_event_link && (
                              <a
                                href={task.calendar_event_link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Buka di Google Calendar"
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Assignee & Card Moving Controls */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{task.assignee_name}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {column.id !== TaskStatus.TODO && (
                              <button
                                onClick={() => handleMoveTask(task.id, task.status, "prev")}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                title="Kembalikan status"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Timer control on DOING column */}
                            {column.id === TaskStatus.DOING && (
                              trackingTaskId === task.id ? (
                                <button
                                  onClick={handleStopTimer}
                                  className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                                  title="Hentikan perekaman waktu"
                                >
                                  <Square className="w-3.5 h-3.5 fill-red-600" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartTimer(task.id)}
                                  className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded cursor-pointer"
                                  title="Mulai rekam waktu kerja"
                                >
                                  <Play className="w-3.5 h-3.5 fill-emerald-600" />
                                </button>
                              )
                            )}

                            {column.id !== TaskStatus.DONE && (
                              <button
                                onClick={() => handleMoveTask(task.id, task.status, "next")}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                title="Majukan status"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stop Timer Log dialog Modal */}
      {showLogDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-amber-500" /> Simpan Catatan Waktu Kerja
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Anda telah melacak sekitar <strong className="text-slate-800">{Math.round(timerSeconds / 60)} menit</strong> pengerjaan. Silakan isikan deskripsi apa saja yang berhasil diselesaikan untuk meraih Poin Performa!
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Deskripsi Pekerjaan *</label>
              <textarea
                required
                value={timeLogDesc}
                onChange={(e) => setTimeLogDesc(e.target.value)}
                placeholder="cth: Mengintegrasikan fungsi OAuth di file login."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:border-indigo-500"
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Simpan & Dapatkan Poin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal with Prominent Google Calendar Sync Panel */}
      {activeDetailTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-6 shadow-xl relative custom-scrollbar border border-gray-200">
            <button
              onClick={() => setActiveDetailTask(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              title="Tutup detail tugas"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Priority banner */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[8px] font-black px-2.5 py-0.5 rounded border ${
                    activeDetailTask.priority === TaskPriority.HIGH
                      ? "bg-red-50 text-red-700 border-red-200"
                      : activeDetailTask.priority === TaskPriority.MEDIUM
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {activeDetailTask.priority} Prioritas
                </span>
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold px-2 py-0.5 rounded">
                  Status: {activeDetailTask.status}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-base leading-snug">
                {activeDetailTask.title}
              </h4>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Penerima Tugas</span>
                <span className="font-bold text-gray-800 mt-1 block">{activeDetailTask.assignee_name}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Tenggat Waktu</span>
                <span className="font-bold text-gray-800 mt-1 block">{activeDetailTask.due_date}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Estimasi Waktu</span>
                <span className="font-bold text-gray-800 mt-1 block">
                  {formatWorkDuration(activeDetailTask.est_hours)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Total Kerja Aktual</span>
                <span className="font-bold text-indigo-600 mt-1 block">
                  {formatWorkDuration(activeDetailTask.logged_hours)}
                </span>
              </div>
            </div>

            {/* Description block */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Deskripsi Tugas</span>
              <p className="text-xs text-gray-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                {activeDetailTask.description || "Tidak ada rincian deskripsi."}
              </p>
            </div>

            {/* GOOGLE CALENDAR SYNC INTERACTIVE PANEL */}
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-xl">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Google Calendar Integration</h5>
                    <p className="text-[10px] text-gray-500">
                      Otomatis sinkronkan tenggat waktu tugas ke Google Calendar utama Anda.
                    </p>
                  </div>
                </div>

                {/* Main Toggle Switch */}
                <button
                  onClick={() => handleToggleCalendarSync(activeDetailTask)}
                  disabled={syncingTaskId === activeDetailTask.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    activeDetailTask.calendar_synced
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {syncingTaskId === activeDetailTask.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : activeDetailTask.calendar_synced ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {activeDetailTask.calendar_synced ? "Tersinkronisasi (Aktif)" : "Aktifkan Sinkronisasi"}
                  </span>
                </button>
              </div>

              {/* Status details if synced */}
              {activeDetailTask.calendar_synced ? (
                <div className="p-3 bg-white rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Event Terdaftar di Kalender
                    </span>
                    <p className="text-[11px] text-gray-600">
                      Tenggat: <strong>{activeDetailTask.due_date}</strong> (All-Day Event dengan pengingat otomatis)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeDetailTask.calendar_event_link && (
                      <a
                        href={activeDetailTask.calendar_event_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka di Google Calendar</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleUpdateCalendarEvent(activeDetailTask)}
                      disabled={syncingTaskId === activeDetailTask.id}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-200 cursor-pointer"
                      title="Perbarui data event kalender"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingTaskId === activeDetailTask.id ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/70 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                  <span>Tugas ini belum disinkronkan ke kalender. Aktifkan toggle di atas untuk menjadwalkan.</span>
                </div>
              )}
            </div>

            {/* WORK LOGS TIMELINE */}
            <div className="space-y-3.5 border-t border-gray-100 pt-5">
              <h5 className="font-bold text-slate-800 text-xs">Aktivitas Laporan Kerja (Time Logs)</h5>

              {/* Time logs listing */}
              <div className="space-y-2.5 max-h-44 overflow-y-auto">
                {timeLogs.filter((l) => l.task_id === activeDetailTask.id).length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada waktu kerja yang tercatat pada tugas ini.
                  </p>
                ) : (
                  timeLogs
                    .filter((l) => l.task_id === activeDetailTask.id)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between gap-3 text-xs leading-none"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 leading-normal">{log.description}</p>
                          <span className="text-[10px] text-gray-400 block mt-1">
                            Dicatat oleh: {log.user_email} • {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded h-fit shrink-0 text-[10px]">
                          {log.duration_mins} Menit
                        </span>
                      </div>
                    ))
                )}
              </div>

              {/* Manual log form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-slate-600 uppercase">Input Laporan Waktu Manual</span>
                  <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setManualLogUnit("HOURS")}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        manualLogUnit === "HOURS" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      Jam
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualLogUnit("DAYS")}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        manualLogUnit === "DAYS" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      Hari Kerja (8j)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualLogUnit("MINUTES")}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        manualLogUnit === "MINUTES" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      Menit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">
                      Durasi ({manualLogUnit === "HOURS" ? "Jam" : manualLogUnit === "DAYS" ? "Hari" : "Menit"})
                    </label>
                    <input
                      type="number"
                      min={0.25}
                      step={manualLogUnit === "MINUTES" ? 5 : 0.25}
                      value={manualDurationVal}
                      onChange={(e) => setManualDurationVal(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Pekerjaan Yang Dilakukan *</label>
                    <input
                      type="text"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="cth: Penyambungan kabel OSP segmen 3."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Live conversion badge */}
                <div className="text-[10px] text-gray-500 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  <span>
                    Total:{" "}
                    <strong>
                      {manualLogUnit === "DAYS"
                        ? `${manualDurationVal} Hari = ${manualDurationVal * 8} Jam (${manualDurationVal * 8 * 60} Menit)`
                        : manualLogUnit === "HOURS"
                        ? `${manualDurationVal} Jam = ${(manualDurationVal / 8).toFixed(2)} Hari (${manualDurationVal * 60} Menit)`
                        : `${manualDurationVal} Menit = ${(manualDurationVal / 60).toFixed(1)} Jam`}
                    </strong>
                  </span>
                </div>

                <button
                  onClick={() => handleManualTimeLog(activeDetailTask.id)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
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
