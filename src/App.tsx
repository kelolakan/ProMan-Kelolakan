/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChangePasswordModal from "./components/ChangePasswordModal";
import DashboardModule from "./modules/DashboardModule";
import ProjectsModule from "./modules/ProjectsModule";
import KanbanModule from "./modules/KanbanModule";
import PointsModule from "./modules/PointsModule";
import TeamModule from "./modules/TeamModule";
import MessagesModule from "./modules/MessagesModule";
import FilesModule from "./modules/FilesModule";
import ReportsModule from "./modules/ReportsModule";
import FinanceModule from "./modules/FinanceModule";

import {
  Project,
  Task,
  ChatMessage,
  TimeLog,
  DriveFileMetadata,
  TeamMember,
  FinancialTransaction,
  UserRole,
  TaskStatus
} from "./types";

import {
  loadLocalData,
  saveLocalData,
  DEFAULT_PROJECTS,
  DEFAULT_TASKS,
  DEFAULT_CHATS,
  DEFAULT_TIME_LOGS,
  DEFAULT_FILES,
  DEFAULT_MEMBERS,
  DEFAULT_TRANSACTIONS
} from "./lib/dataStore";

import {
  getStoredSession,
  clearStoredSession,
  apiLogin,
  apiFetchData,
  apiSaveProject,
  apiDeleteProject,
  apiSaveTask,
  apiDeleteTask,
  apiSaveTransaction,
  apiDeleteTransaction,
  apiSaveChatMessage,
  apiSaveTimeLog,
  apiSaveMember,
  apiSyncData
} from "./lib/apiClient";

import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Lock,
  Mail,
  LogIn,
  Server,
  UserCheck
} from "lucide-react";

export default function App() {
  // Global Navigation State
  const [currentTab, setCurrentTab] = useState<string>("dashboard");

  // Authentication State
  const [userMember, setUserMember] = useState<TeamMember | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Login form inputs
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");

  // Change Password Modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Core Datasets
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [files, setFiles] = useState<DriveFileMetadata[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Active Context
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  /**
   * Initialize App: Check local session and fetch centralized server data
   */
  useEffect(() => {
    const initApp = async () => {
      // 1. First load local fallback data into memory
      const local = loadLocalData();
      setProjects(local.projects);
      setTasks(local.tasks);
      setChats(local.chats);
      setTimeLogs(local.timeLogs);
      setFiles(local.files);
      setMembers(local.members);
      setTransactions(local.transactions || DEFAULT_TRANSACTIONS);
      if (local.projects.length > 0) {
        setActiveProjectId(local.projects[0].id);
      }

      // 2. Check for active authenticated session
      const session = getStoredSession();
      if (session) {
        setUserMember(session.user);
        setIsDemoMode(false);
      }

      // 3. Attempt to fetch fresh data from centralized server
      try {
        const serverData = await apiFetchData();
        if (serverData.projects && serverData.projects.length > 0) {
          setProjects(serverData.projects);
          setTasks(serverData.tasks);
          setChats(serverData.chats);
          setTimeLogs(serverData.timeLogs);
          setFiles(serverData.files);
          setMembers(serverData.members);
          setTransactions(serverData.transactions);
          setActiveProjectId(serverData.projects[0].id);

          // Save to local cache as well
          saveLocalData(serverData);
        }
        setServerConnected(true);
      } catch (err) {
        console.warn("Server API not reachable, running with local storage cache:", err);
        setServerConnected(false);
      }
    };

    initApp();
  }, []);

  /**
   * Handle user login via self-hosted API
   */
  const handleLoginSubmit = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || emailInput;
    const passToUse = customPass || passwordInput;

    if (!emailToUse || !passToUse) {
      setAuthError("Harap masukkan email dan password.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const session = await apiLogin(emailToUse, passToUse);
      setUserMember(session.user);
      setIsDemoMode(false);
      setServerConnected(true);

      // Fetch latest datasets from server
      const serverData = await apiFetchData();
      setProjects(serverData.projects);
      setTasks(serverData.tasks);
      setChats(serverData.chats);
      setTimeLogs(serverData.timeLogs);
      setFiles(serverData.files);
      setMembers(serverData.members);
      setTransactions(serverData.transactions);
      if (serverData.projects.length > 0) {
        setActiveProjectId(serverData.projects[0].id);
      }
      saveLocalData(serverData);
    } catch (err: any) {
      setAuthError(err.message || "Gagal masuk. Periksa kembali email dan password Anda.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Quick team login helper for PT. Exven Mitra Solusindo
   */
  const handleQuickLogin = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
    handleLoginSubmit(undefined, email, pass);
  };

  /**
   * Guest demo bypass
   */
  const handleEnterDemo = () => {
    setIsDemoMode(true);
    const demoUser = DEFAULT_MEMBERS[0]; // Admin by default
    setUserMember(demoUser);
    if (projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  };

  /**
   * Logout handler
   */
  const handleLogout = () => {
    clearStoredSession();
    setUserMember(null);
    setIsDemoMode(false);
    setEmailInput("");
    setPasswordInput("");
  };

  /**
   * MUTATION HANDLERS (Centralized Server + Local Cache)
   */
  const handleAddProject = async (newPrj: Project) => {
    const updated = [newPrj, ...projects];
    setProjects(updated);
    saveLocalData({ projects: updated });
    try {
      await apiSaveProject(newPrj);
    } catch (e) {
      console.warn("Failed to sync new project to server:", e);
    }
  };

  const handleUpdateProjectFinance = async (
    projectId: string,
    contractValue: number,
    targetMarginPct: number,
    targetMarginAmount?: number
  ) => {
    const marginAmount = targetMarginAmount ?? Math.round((contractValue * targetMarginPct) / 100);
    const updatedProjects = projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            contract_value: contractValue,
            target_margin_pct: targetMarginPct,
            target_margin_amount: marginAmount,
          }
        : p
    );
    setProjects(updatedProjects);
    saveLocalData({ projects: updatedProjects });

    const updatedPrj = updatedProjects.find((p) => p.id === projectId);
    if (updatedPrj) {
      try {
        await apiSaveProject(updatedPrj);
      } catch (e) {
        console.warn("Failed to sync project finance to server:", e);
      }
    }
  };

  const handleAddTransaction = async (newTx: FinancialTransaction) => {
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveLocalData({ transactions: updated });
    try {
      await apiSaveTransaction(newTx);
    } catch (e) {
      console.warn("Failed to sync transaction to server:", e);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const updated = transactions.filter((t) => t.id !== txId);
    setTransactions(updated);
    saveLocalData({ transactions: updated });
    try {
      await apiDeleteTransaction(txId);
    } catch (e) {
      console.warn("Failed to delete transaction on server:", e);
    }
  };

  const handleAddTask = async (newTask: Task) => {
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveLocalData({ tasks: updated });
    try {
      await apiSaveTask(newTask);
    } catch (e) {
      console.warn("Failed to sync task to server:", e);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(updated);
    saveLocalData({ tasks: updated });
    try {
      await apiSaveTask(updatedTask);
    } catch (e) {
      console.warn("Failed to update task on server:", e);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(updated);
    saveLocalData({ tasks: updated });
    const targetTask = updated.find((t) => t.id === taskId);
    if (targetTask) {
      try {
        await apiSaveTask(targetTask);
      } catch (e) {
        console.warn("Failed to update task status on server:", e);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    saveLocalData({ tasks: updated });
    try {
      await apiDeleteTask(taskId);
    } catch (e) {
      console.warn("Failed to delete task on server:", e);
    }
  };

  const handleLogTime = async (newLog: TimeLog) => {
    const updatedLogs = [newLog, ...timeLogs];
    setTimeLogs(updatedLogs);
    saveLocalData({ timeLogs: updatedLogs });

    // Update user points locally
    handleUpdatePoints(newLog.user_email, 15);

    try {
      await apiSaveTimeLog(newLog);
    } catch (e) {
      console.warn("Failed to sync time log to server:", e);
    }
  };

  const handleUpdatePoints = (email: string, pointsAwarded: number) => {
    const updatedMembers = members.map((m) =>
      m.email.toLowerCase() === email.toLowerCase() ? { ...m, points: (m.points || 0) + pointsAwarded } : m
    );
    setMembers(updatedMembers);
    saveLocalData({ members: updatedMembers });

    if (userMember && userMember.email.toLowerCase() === email.toLowerCase()) {
      setUserMember((prev) => prev ? { ...prev, points: (prev.points || 0) + pointsAwarded } : null);
    }
  };

  const handleSendMessage = async (newMsg: ChatMessage) => {
    const updated = [...chats, newMsg];
    setChats(updated);
    saveLocalData({ chats: updated });
    try {
      await apiSaveChatMessage(newMsg);
    } catch (e) {
      console.warn("Failed to sync chat to server:", e);
    }
  };

  const handleAddFileMetadata = (newFile: DriveFileMetadata) => {
    const updated = [newFile, ...files];
    setFiles(updated);
    saveLocalData({ files: updated });
  };

  const handleDeleteFileMetadata = (fileId: string) => {
    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    saveLocalData({ files: updated });
  };

  const handleAddMember = async (newMem: TeamMember) => {
    const updated = [...members, newMem];
    setMembers(updated);
    saveLocalData({ members: updated });
    try {
      await apiSaveMember(newMem);
    } catch (e) {
      console.warn("Failed to sync member to server:", e);
    }
  };

  const handleUpdateRole = async (email: string, role: UserRole, div: string) => {
    const updated = members.map((m) =>
      m.email.toLowerCase() === email.toLowerCase() ? { ...m, role, division: div } : m
    );
    setMembers(updated);
    saveLocalData({ members: updated });
    const targetMember = updated.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (targetMember) {
      try {
        await apiSaveMember(targetMember);
      } catch (e) {
        console.warn("Failed to sync member role to server:", e);
      }
    }
  };

  // =========================================================================
  // LOGIN SCREEN (Independent Email & Password without Google)
  // =========================================================================
  if (!userMember && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl text-left space-y-6 shadow-2xl relative backdrop-blur-xl">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-indigo-600/30 mx-auto">
              EX
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Exven Project Manajemen</h2>
            <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">by Kelolakan</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed pt-1">
              Sistem Manajemen Proyek FTTH & Pengendalian Anggaran PT. Exven Mitra Solusindo.
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-2xl text-xs flex items-start justify-between gap-2.5 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Alamat Email Perusahaan</span>
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nama@exven.co.id / kelolakan@gmail.com"
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kata Sandi (Password)</span>
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-150 cursor-pointer mt-2"
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 block text-center">
              Pilih Akun Tim PT. Exven Mitra Solusindo (1-Click Test):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin("kelolakan@gmail.com", "admin123")}
                className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer"
              >
                <span className="font-bold text-indigo-300 block text-[11px]">👑 Kelolakan</span>
                <span className="text-[10px] text-slate-400 block truncate">Project Director (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("hendra.sitac@exven.co.id", "exven2026")}
                className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-200 block text-[11px]">📋 Hendra SITAC</span>
                <span className="text-[10px] text-slate-400 block truncate">Manager Perizinan DKI</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("rizky.osp@exven.co.id", "exven2026")}
                className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-200 block text-[11px]">🌐 Rizky OSP Lead</span>
                <span className="text-[10px] text-slate-400 block truncate">Manager Rollout OSP</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("agus.splicer@exven.co.id", "exven2026")}
                className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-200 block text-[11px]">⚡ Agus Splicer</span>
                <span className="text-[10px] text-slate-400 block truncate">Splicing & OTDR Team</span>
              </button>
            </div>
          </div>

          {/* Guest Mode Option */}
          <div className="pt-1">
            <button
              onClick={handleEnterDemo}
              className="w-full bg-slate-800/40 hover:bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-slate-800 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lanjutkan sebagai Tamu (Mode Offline)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Footer Security Note */}
          <div className="text-[10px] text-slate-500 text-center pt-2 flex items-center justify-center gap-1.5 border-t border-slate-800/60">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Database Terpusat Mandiri di Server VPS (Bebas Izin Google)</span>
          </div>
        </div>
      </div>
    );
  }

  // Active Project helper
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  return (
    <div className="h-screen w-screen flex bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar navigation panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userMember={userMember}
        onLogout={handleLogout}
        serverConnected={serverConnected}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main app workspace block */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Controls bar */}
        <Header
          currentTab={currentTab}
          projects={projects}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          serverConnected={serverConnected}
          onOpenLoginModal={() => {
            setUserMember(null);
            setIsDemoMode(false);
          }}
          userMember={userMember}
        />

        {/* Dynamic Content Panel View Router */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {currentTab === "dashboard" && (
            <DashboardModule
              projects={projects}
              tasks={tasks}
              members={members}
              userMember={userMember}
              transactions={transactions}
            />
          )}

          {currentTab === "projects" && (
            <ProjectsModule
              projects={projects}
              tasks={tasks}
              userMember={userMember}
              activeProjectId={activeProjectId}
              setActiveProjectId={setActiveProjectId}
              onAddProject={handleAddProject}
            />
          )}

          {currentTab === "finance" && (
            <FinanceModule
              activeProject={activeProject}
              projects={projects}
              transactions={transactions}
              userMember={userMember}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateProjectFinance={handleUpdateProjectFinance}
            />
          )}

          {currentTab === "kanban" && (
            <KanbanModule
              activeProject={activeProject}
              tasks={tasks}
              members={members}
              timeLogs={timeLogs}
              userMember={userMember}
              sheetsConnected={serverConnected}
              accessToken="server"
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onLogTime={handleLogTime}
              onUpdatePoints={handleUpdatePoints}
            />
          )}

          {currentTab === "points" && (
            <PointsModule
              members={members}
              timeLogs={timeLogs}
              tasks={tasks}
            />
          )}

          {currentTab === "team" && (
            <TeamModule
              members={members}
              userMember={userMember}
              onAddMember={handleAddMember}
              onUpdateRole={handleUpdateRole}
            />
          )}

          {currentTab === "messages" && (
            <MessagesModule
              activeProject={activeProject}
              chats={chats}
              userMember={userMember}
              onSendMessage={handleSendMessage}
              onRefresh={() => {}}
            />
          )}

          {currentTab === "files" && (
            <FilesModule
              activeProject={activeProject}
              files={files}
              userMember={userMember}
              serverConnected={serverConnected}
              onAddFileMetadata={handleAddFileMetadata}
              onDeleteFileMetadata={handleDeleteFileMetadata}
            />
          )}

          {currentTab === "scurve" && (
            <ReportsModule
              projects={projects}
              activeProject={activeProject}
              tasks={tasks}
              timeLogs={timeLogs}
              members={members}
              userMember={userMember}
              transactions={transactions}
              onSelectProject={setActiveProjectId}
            />
          )}
        </main>
      </div>

      {/* Change Password Modal */}
      {userMember && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          userEmail={userMember.email}
        />
      )}
    </div>
  );
}
