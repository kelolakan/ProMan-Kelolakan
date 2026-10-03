import { Project, Task, ChatMessage, TimeLog, DriveFileMetadata, TeamMember, FinancialTransaction } from "../types";

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
export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
