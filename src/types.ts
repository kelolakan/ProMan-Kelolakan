export enum ProjectStatus {
  ACTIVE = "Active",
  COMPLETED = "Completed",
  PAUSED = "Paused"
}

export enum TaskStatus {
  TODO = "Todo",
  DOING = "Doing",
  DONE = "Done"
}

export enum TaskPriority {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low"
}

export enum UserRole {
  ADMIN = "Admin / Division Head",
  MANAGER = "Project Manager",
  MEMBER = "Team Member",
  VIEWER = "Viewer / Client"
}

export interface Project {
  id: string;
  name: string;
  description: string;
  division: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  contract_value?: number; // Nilai Total Proyek (IDR)
  target_margin_pct?: number; // Target Margin (%) misal 30%
  target_margin_amount?: number; // Target Margin (IDR)
}

export type TransactionType = "IN" | "OUT";

export interface FinancialTransaction {
  id: string;
  project_id: string;
  type: TransactionType;
  category: string; // Termin DP, Termin 1, Pelunasan, Material, Subkon, Gaji/Honor, Operasional, Peralatan, Lain-lain
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  reference?: string; // No Invoice / Kwitansi
  created_by: string;
  created_at: string;
}

export interface FinancialSCurvePoint {
  week: string; // e.g. "Minggu 1"
  planned_expense_pct: number; // Rencana Pengeluaran %
  planned_expense: number; // Rencana Pengeluaran Nominal
  actual_expense: number; // Realisasi Pengeluaran Nominal Kumulatif
  actual_revenue: number; // Realisasi Kas Masuk Nominal Kumulatif
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
  assignee_name: string;
  assignee_email: string;
  est_hours: number;
  logged_hours: number;
  priority: TaskPriority;
  calendar_synced?: boolean;
  calendar_event_id?: string;
  calendar_event_link?: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  timestamp: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_email: string;
  duration_mins: number;
  description: string;
  timestamp: string;
}

export interface DriveFileMetadata {
  id: string; // Google Drive File ID
  project_id: string;
  file_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface TeamMember {
  email: string;
  name: string;
  role: UserRole;
  division: string;
  points: number;
}
