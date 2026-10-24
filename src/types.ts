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
  items?: DocumentItem[];
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

export type DocumentType = "INVOICE" | "BAST" | "VENDOR_PAYMENT";

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  type: DocumentType;
  doc_number: string;
  doc_date: string;
  due_date?: string;
  title: string;
  // Recipient / Client / Vendor details
  recipient_name: string;
  recipient_company: string;
  recipient_address?: string;
  recipient_phone?: string;
  // Financial amounts
  subtotal: number;
  tax_percent: number; // e.g. 0 or 11
  tax_amount: number;
  total_amount: number;
  amount_in_words: string; // Terbilang
  notes?: string;
  // BAST specific fields
  work_scope?: string;
  milestone_percentage?: number;
  atp_ref_number?: string;
  // Vendor payment specific fields
  payment_method?: "BANK_TRANSFER" | "CASH" | "GIRO";
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  // Line items
  items: DocumentItem[];
  // Signatures
  signer_first_name: string;
  signer_first_title: string;
  signer_second_name?: string;
  signer_second_title?: string;
  created_by: string;
  created_at: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "COMPLETED";
  // Optional fields for additional metadata
  site_name?: string;
  product_type?: string;
  regional_site?: string;
  po_number?: string;
  po_date?: string;
  ship_to_company?: string;
  ship_to_address?: string;
  ship_to_phone?: string;
  site_list?: string;
  invoice_division?: string;
}

export interface SystemSettings {
  appName: string;
  companyName: string;
  providerName: string;
  tagline: string;
  standardWorkHoursPerDay: number;
  targetMarginPercent: number;
  enableFinanceModule: boolean;
  enableDocumentsModule: boolean;
  enableGamification: boolean;
  enableMessages: boolean;
  enableFiles: boolean;
  enableReports: boolean;
  enableGeminiAI: boolean;
  geminiApiKey?: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  appName: "Exven Project Manajemen",
  companyName: "PT. Exven Mitra Solusindo",
  providerName: "Kelolakan",
  tagline: "Sistem Manajemen Proyek FTTH & Pengendalian Anggaran",
  standardWorkHoursPerDay: 8,
  targetMarginPercent: 25,
  enableFinanceModule: true,
  enableDocumentsModule: true,
  enableGamification: true,
  enableMessages: true,
  enableFiles: true,
  enableReports: true,
  enableGeminiAI: false,
  geminiApiKey: "",
};
