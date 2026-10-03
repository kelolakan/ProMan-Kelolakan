/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
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
  initAuth,
  googleSignIn,
  logout,
  onTokenInvalidated,
  invalidateAuthToken
} from "./lib/googleAuth";

import {
  findOrCreateSpreadsheet,
  getSheetRows,
  overwriteSheetRows,
  appendSheetRow
} from "./lib/googleSheets";

import { Sparkles, ArrowRight, ShieldCheck, HelpCircle, AlertCircle, X, CheckCircle2, RefreshCw } from "lucide-react";

export default function App() {
  // Global Navigation State
  const [currentTab, setCurrentTab] = useState<string>("dashboard");

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sheetsConnected, setSheetsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [sheetsId, setSheetsId] = useState<string | null>(null);

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

  // Track active user profile mapped from TeamMembers
  const [userMember, setUserMember] = useState<TeamMember | null>(null);

  /**
   * Load local fallback data on mount
   */
  useEffect(() => {
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
  }, []);

  /**
   * Automatically map signed-in email to system role/division
   */
  const syncUserMemberProfile = useCallback((email: string, displayName?: string) => {
    setMembers((prevMembers) => {
      let matched = prevMembers.find((m) => m.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        // If not found in default list, register them as Admin (or Member if demo)
        const isKelolakan = email.toLowerCase() === "kelolakan@gmail.com";
        const newReg: TeamMember = {
          email: email.toLowerCase(),
          name: displayName || email.split("@")[0],
          role: isKelolakan ? UserRole.ADMIN : UserRole.MEMBER,
          division: "Tech",
          points: 10,
        };
        const updated = [...prevMembers, newReg];
        saveLocalData({ members: updated });
        setUserMember(newReg);
        return updated;
      } else {
        setUserMember(matched);
        return prevMembers;
      }
    });
  }, []);

  /**
   * Google Auth initialization & invalidation listener
   */
  useEffect(() => {
    const unsubAuth = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsDemoMode(false);
        setSheetsConnected(true);
        setSessionNotice(null);
        syncUserMemberProfile(currentUser.email || "", currentUser.displayName || "");
        triggerCloudSync(token);
      },
      () => {
        // Not authenticated or expired
        setSheetsConnected(false);
        setAccessToken(null);
      }
    );

    const unsubInvalid = onTokenInvalidated((reason) => {
      setSheetsConnected(false);
      setAccessToken(null);
      setSheetsId(null);
      if (reason && reason.includes("401")) {
        setSessionNotice("Sesi autentikasi Google telah kedaluwarsa. Data disimpan di memori lokal. Klik 'Hubungkan Google Workspace' untuk menyinkronkan kembali.");
      }
    });

    return () => {
      unsubAuth();
      unsubInvalid();
    };
  }, [syncUserMemberProfile]);

  /**
   * Sync sheets data to memory
   */
  const triggerCloudSync = async (token: string) => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      // Find or provision sheets DB
      const spreadsheetId = await findOrCreateSpreadsheet(token);
      setSheetsId(spreadsheetId);

      // Load all datasets from cloud
      const cloudProjects = await getSheetRows(token, spreadsheetId, "projects");
      const cloudTasks = await getSheetRows(token, spreadsheetId, "tasks");
      const cloudChats = await getSheetRows(token, spreadsheetId, "chats");
      const cloudTimeLogs = await getSheetRows(token, spreadsheetId, "time_tracking");
      const cloudFiles = await getSheetRows(token, spreadsheetId, "files");
      const cloudFinances = await getSheetRows(token, spreadsheetId, "finances");

      // Auto populate templates if spreadsheets are empty on first sync
      if (cloudProjects.length === 0) {
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "projects",
          ["id", "name", "description", "division", "start_date", "end_date", "status", "contract_value", "target_margin_pct", "target_margin_amount"],
          DEFAULT_PROJECTS
        );
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "tasks",
          ["id", "project_id", "title", "description", "status", "due_date", "assignee_name", "assignee_email", "est_hours", "logged_hours", "priority"],
          DEFAULT_TASKS
        );
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "chats",
          ["id", "project_id", "sender_name", "sender_email", "message", "timestamp"],
          DEFAULT_CHATS
        );
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "time_tracking",
          ["id", "task_id", "user_email", "duration_mins", "description", "timestamp"],
          DEFAULT_TIME_LOGS
        );
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "files",
          ["id", "project_id", "file_name", "mime_type", "size", "uploaded_by", "uploaded_at"],
          DEFAULT_FILES
        );
        await overwriteSheetRows(
          token,
          spreadsheetId,
          "finances",
          ["id", "project_id", "type", "category", "amount", "date", "description", "reference", "created_by", "created_at"],
          DEFAULT_TRANSACTIONS
        );

        setProjects(DEFAULT_PROJECTS);
        setTasks(DEFAULT_TASKS);
        setChats(DEFAULT_CHATS);
        setTimeLogs(DEFAULT_TIME_LOGS);
        setFiles(DEFAULT_FILES);
        setTransactions(DEFAULT_TRANSACTIONS);
        if (DEFAULT_PROJECTS.length > 0) {
          setActiveProjectId(DEFAULT_PROJECTS[0].id);
        }
      } else {
        // Set clouds
        setProjects(cloudProjects);
        setTasks(cloudTasks);
        setChats(cloudChats);
        setTimeLogs(cloudTimeLogs);
        setFiles(cloudFiles);
        setTransactions(cloudFinances && cloudFinances.length > 0 ? cloudFinances : DEFAULT_TRANSACTIONS);
        if (cloudProjects.length > 0) {
          setActiveProjectId(cloudProjects[0].id);
        }
      }
      setSessionNotice(null);
    } catch (err: any) {
      console.warn("Sinkronisasi cloud dihentikan, menggunakan penyimpanan offline lokal:", err?.message || err);
      if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401") || err?.message?.includes("UNAUTHENTICATED")) {
        invalidateAuthToken("401 UNAUTHENTICATED");
        setSheetsConnected(false);
        setAccessToken(null);
        setSheetsId(null);
        setSessionNotice("Sesi autentikasi Google telah kedaluwarsa. Data Anda tetap aman secara lokal.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSheets = async () => {
    setIsConnecting(true);
    setAuthError(null);
    setSessionNotice(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setSheetsConnected(true);
        setIsDemoMode(false);
        syncUserMemberProfile(res.user.email || "", res.user.displayName || "");
        await triggerCloudSync(res.accessToken);
      }
    } catch (err: any) {
      console.warn("Koneksi Google:", err);
      setAuthError(err?.message || "Koneksi Google gagal. Silakan coba lagi atau gunakan Mode Tamu.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    // Use first default member as acting user
    const actingMember = DEFAULT_MEMBERS[0];
    setUserMember(actingMember);
    if (projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSheetsConnected(false);
    setIsDemoMode(false);
    setUserMember(null);
    setSessionNotice(null);
  };

  /**
   * MUTATION HANDLERS (Saves to Sheets if connected, or LocalStorage)
   */
  const handleAddProject = async (newPrj: Project) => {
    const updated = [newPrj, ...projects];
    setProjects(updated);
    saveLocalData({ projects: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "projects",
          ["id", "name", "description", "division", "start_date", "end_date", "status", "contract_value", "target_margin_pct", "target_margin_amount"],
          newPrj
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan proyek ke Google Sheets gagal:", err?.message || err);
        }
      }
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

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await overwriteSheetRows(
          accessToken,
          sheetsId,
          "projects",
          ["id", "name", "description", "division", "start_date", "end_date", "status", "contract_value", "target_margin_pct", "target_margin_amount"],
          updatedProjects
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan finansial proyek ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleAddTransaction = async (newTx: FinancialTransaction) => {
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveLocalData({ transactions: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "finances",
          ["id", "project_id", "type", "category", "amount", "date", "description", "reference", "created_by", "created_at"],
          newTx
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan transaksi ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const updated = transactions.filter((t) => t.id !== txId);
    setTransactions(updated);
    saveLocalData({ transactions: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await overwriteSheetRows(
          accessToken,
          sheetsId,
          "finances",
          ["id", "project_id", "type", "category", "amount", "date", "description", "reference", "created_by", "created_at"],
          updated
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Pembaruan transaksi ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleAddTask = async (newTask: Task) => {
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveLocalData({ tasks: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "tasks",
          ["id", "project_id", "title", "description", "status", "due_date", "assignee_name", "assignee_email", "est_hours", "logged_hours", "priority"],
          newTask
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan tugas ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(updated);
    saveLocalData({ tasks: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await overwriteSheetRows(
          accessToken,
          sheetsId,
          "tasks",
          ["id", "project_id", "title", "description", "status", "due_date", "assignee_name", "assignee_email", "est_hours", "logged_hours", "priority", "calendar_synced", "calendar_event_id", "calendar_event_link"],
          updated
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Pembaruan tugas ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(updated);
    saveLocalData({ tasks: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await overwriteSheetRows(
          accessToken,
          sheetsId,
          "tasks",
          ["id", "project_id", "title", "description", "status", "due_date", "assignee_name", "assignee_email", "est_hours", "logged_hours", "priority", "calendar_synced", "calendar_event_id", "calendar_event_link"],
          updated
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Pembaruan status tugas ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleLogTime = async (newLog: TimeLog) => {
    const updatedLogs = [newLog, ...timeLogs];
    setTimeLogs(updatedLogs);
    saveLocalData({ timeLogs: updatedLogs });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "time_tracking",
          ["id", "task_id", "user_email", "duration_mins", "description", "timestamp"],
          newLog
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan log waktu ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleUpdatePoints = (email: string, pointsAwarded: number) => {
    const updatedMembers = members.map((m) =>
      m.email.toLowerCase() === email.toLowerCase() ? { ...m, points: (m.points || 0) + pointsAwarded } : m
    );
    setMembers(updatedMembers);
    saveLocalData({ members: updatedMembers });

    // Sync acting user if they got points
    if (userMember && userMember.email.toLowerCase() === email.toLowerCase()) {
      setUserMember((prev) => prev ? { ...prev, points: (prev.points || 0) + pointsAwarded } : null);
    }
  };

  const handleSendMessage = async (newMsg: ChatMessage) => {
    const updated = [...chats, newMsg];
    setChats(updated);
    saveLocalData({ chats: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "chats",
          ["id", "project_id", "sender_name", "sender_email", "message", "timestamp"],
          newMsg
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan chat ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleAddFileMetadata = async (newFile: DriveFileMetadata) => {
    const updated = [newFile, ...files];
    setFiles(updated);
    saveLocalData({ files: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await appendSheetRow(
          accessToken,
          sheetsId,
          "files",
          ["id", "project_id", "file_name", "mime_type", "size", "uploaded_by", "uploaded_at"],
          newFile
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Penyimpanan metadata file ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleDeleteFileMetadata = async (fileId: string) => {
    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    saveLocalData({ files: updated });

    if (sheetsConnected && accessToken && sheetsId) {
      try {
        await overwriteSheetRows(
          accessToken,
          sheetsId,
          "files",
          ["id", "project_id", "file_name", "mime_type", "size", "uploaded_by", "uploaded_at"],
          updated
        );
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Pembaruan metadata file ke Google Sheets gagal:", err?.message || err);
        }
      }
    }
  };

  const handleAddMember = (newMem: TeamMember) => {
    const updated = [...members, newMem];
    setMembers(updated);
    saveLocalData({ members: updated });
  };

  const handleUpdateRole = (email: string, role: UserRole, div: string) => {
    const updated = members.map((m) =>
      m.email.toLowerCase() === email.toLowerCase() ? { ...m, role, division: div } : m
    );
    setMembers(updated);
    saveLocalData({ members: updated });
  };

  /**
   * Dynamic message refresh trigger
   */
  const handleRefreshChats = async () => {
    if (sheetsConnected && accessToken && sheetsId) {
      try {
        const cloudChats = await getSheetRows(accessToken, sheetsId, "chats");
        setChats(cloudChats);
        saveLocalData({ chats: cloudChats });
      } catch (err: any) {
        if (err?.status === 401 || err?.isAuthError || err?.message?.includes("401")) {
          invalidateAuthToken("401");
        } else {
          console.warn("Gagal menyegarkan chat:", err?.message || err);
        }
      }
    }
  };

  // Render Splash Login Screen if no authenticated session and not demo
  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-950/40 border border-slate-800/80 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Ambient glow decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>

          <div className="space-y-2">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-indigo-600/20 mx-auto">
              EX
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Exven Project Manajemen</h2>
            <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">by Kelolakan</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Platform kolaborasi tim real-time, monitoring Kurva S, dan integrasi Google Sheets & Drive.
            </p>
          </div>

          {/* Auth Error Banner if login issue occurred */}
          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-2xl text-xs text-left flex items-start justify-between gap-2.5 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold block text-red-200">Gagal Menghubungkan Google</span>
                  <span>{authError}</span>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer shrink-0"
                title="Tutup pesan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-3.5 pt-2">
            {/* Real Google Sign In popup trigger */}
            <button
              onClick={handleConnectSheets}
              disabled={isConnecting}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-md font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-3 transition-colors duration-150 cursor-pointer"
            >
              {isConnecting ? (
                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              )}
              <span>{isConnecting ? "Mengkoneksikan..." : "Hubungkan Akun Google"}</span>
            </button>

            {/* Offline Guest bypass */}
            <button
              onClick={handleEnterDemo}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 py-3 rounded-xl text-xs font-bold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Uji Coba Guest Mode (Offline)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 pt-2 flex items-center justify-center gap-1.5 border-t border-slate-800/60">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Keamanan data & privasi dijamin via Google OAuth</span>
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
        sheetsConnected={sheetsConnected}
        sheetsId={sheetsId}
      />

      {/* Main app workspace block */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Controls bar */}
        <Header
          currentTab={currentTab}
          projects={projects}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          sheetsConnected={sheetsConnected}
          onConnectSheets={handleConnectSheets}
          isConnecting={isConnecting}
          userMember={userMember}
        />

        {/* Informative Session Notice Banner (e.g. when OAuth token expired gracefully) */}
        {sessionNotice && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-2.5 flex items-center justify-between gap-4 text-xs text-amber-900 animate-fade-in shrink-0">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{sessionNotice}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnectSheets}
                disabled={isConnecting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Hubungkan Ulang
              </button>
              <button
                onClick={() => setSessionNotice(null)}
                className="text-amber-700 hover:text-amber-900 p-1 cursor-pointer"
                title="Tutup pemberitahuan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic view content rendering area */}
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
              activeProjectId={activeProjectId}
              setActiveProjectId={setActiveProjectId}
              userMember={userMember}
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
              sheetsConnected={sheetsConnected}
              accessToken={accessToken}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onLogTime={handleLogTime}
              onUpdatePoints={handleUpdatePoints}
              onConnectGoogle={handleConnectSheets}
            />
          )}

          {currentTab === "points" && (
            <PointsModule
              members={members}
              tasks={tasks}
              timeLogs={timeLogs}
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
              onRefresh={handleRefreshChats}
            />
          )}

          {currentTab === "files" && (
            <FilesModule
              activeProject={activeProject}
              files={files}
              userMember={userMember}
              sheetsConnected={sheetsConnected}
              accessToken={accessToken}
              onAddFileMetadata={handleAddFileMetadata}
              onDeleteFileMetadata={handleDeleteFileMetadata}
            />
          )}

          {currentTab === "scurve" && (
            <ReportsModule
              activeProject={activeProject}
              projects={projects}
              tasks={tasks}
              members={members}
              timeLogs={timeLogs}
              transactions={transactions}
              userMember={userMember}
              onSelectProject={(pId) => setActiveProjectId(pId)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

