import { Project, Task, ChatMessage, TimeLog, DriveFileMetadata, TeamMember, FinancialTransaction, SystemSettings, ProjectDocument } from "../types";

export interface AuthSession {
  user: TeamMember;
  token: string;
}

const STORAGE_KEYS = {
  USER: "exven_auth_user",
  TOKEN: "exven_auth_token",
};

export function getStoredSession(): AuthSession | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (userStr && token) {
      return { user: JSON.parse(userStr), token };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveStoredSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
  localStorage.setItem(STORAGE_KEYS.TOKEN, session.token);
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

// 1. Auth API
export async function apiLogin(identifier: string, password: string): Promise<AuthSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, email: identifier, username: identifier, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal masuk ke sistem.");
  }
  const session: AuthSession = { user: data.user, token: data.token };
  saveStoredSession(session);
  return session;
}

export async function apiChangePassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, oldPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal memperbarui password.");
  }
}

// 2. Data API
export async function apiFetchData(): Promise<{
  projects: Project[];
  tasks: Task[];
  chats: ChatMessage[];
  timeLogs: TimeLog[];
  files: DriveFileMetadata[];
  members: TeamMember[];
  transactions: FinancialTransaction[];
  documents?: ProjectDocument[];
  settings?: SystemSettings;
}> {
  const res = await fetch("/api/data");
  if (!res.ok) {
    throw new Error("Gagal mengambil data dari server.");
  }
  return await res.json();
}

export async function apiSyncData(payload: {
  projects?: Project[];
  tasks?: Task[];
  chats?: ChatMessage[];
  timeLogs?: TimeLog[];
  files?: DriveFileMetadata[];
  members?: TeamMember[];
  transactions?: FinancialTransaction[];
}): Promise<void> {
  await fetch("/api/data/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiSaveProject(project: Project): Promise<void> {
  await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
}

export async function apiDeleteProject(id: string): Promise<void> {
  await fetch(`/api/projects/${id}`, { method: "DELETE" });
}

export async function apiSaveTask(task: Task): Promise<void> {
  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
}

export async function apiDeleteTask(id: string): Promise<void> {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function apiSaveTransaction(transaction: FinancialTransaction): Promise<void> {
  await fetch("/api/finances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
}

export async function apiDeleteTransaction(id: string): Promise<void> {
  await fetch(`/api/finances/${id}`, { method: "DELETE" });
}

export async function apiSaveChatMessage(chat: ChatMessage): Promise<void> {
  await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chat),
  });
}

export async function apiSaveTimeLog(timeLog: TimeLog): Promise<void> {
  await fetch("/api/time_logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(timeLog),
  });
}

export async function apiSaveMember(member: Partial<TeamMember> & { password?: string }): Promise<void> {
  await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
}

// 3. File Upload API (Direct to local VPS)
export async function apiUploadFile(file: File, projectId: string, uploadedBy: string): Promise<DriveFileMetadata> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectId", projectId);
  formData.append("uploadedBy", uploadedBy);

  const res = await fetch("/api/files/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal mengunggah berkas ke server.");
  }
  return data.file;
}

export async function apiDeleteFile(id: string): Promise<void> {
  await fetch(`/api/files/${id}`, { method: "DELETE" });
}

// 4. System Settings & Admin Management API
export async function apiGetSettings(): Promise<SystemSettings> {
  const res = await fetch("/api/settings");
  return res.json();
}

export async function apiUpdateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal menyimpan pengaturan.");
  }
  return data.settings;
}

export async function apiAdminResetPassword(email: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/admin/reset-user-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, newPassword }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal mereset kata sandi.");
  }
}

export async function apiAdminSaveMember(member: {
  email: string;
  name: string;
  role: string;
  division: string;
  points?: number;
  password?: string;
}): Promise<void> {
  const res = await fetch("/api/admin/save-member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal menyimpan data anggota tim.");
  }
}

export async function apiAdminDeleteMember(email: string): Promise<void> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal menghapus anggota tim.");
  }
}

export async function apiAdminRestoreDb(backupData: any): Promise<void> {
  const res = await fetch("/api/admin/restore-db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backupData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal me-restore database.");
  }
}

export async function apiAdminResetDb(): Promise<void> {
  const res = await fetch("/api/admin/reset-db", {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal mereset database.");
  }
}

// 5. Project Documents API
export async function apiSaveDocument(doc: ProjectDocument): Promise<void> {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal menyimpan dokumen.");
  }
}

export async function apiDeleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal menghapus dokumen.");
  }
}

