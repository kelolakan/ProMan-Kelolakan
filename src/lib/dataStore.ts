import { Project, Task, ChatMessage, TimeLog, DriveFileMetadata, TeamMember, FinancialTransaction, ProjectStatus, TaskStatus, TaskPriority, UserRole, ProjectDocument } from "../types";
import { INITIAL_DOCUMENTS } from "./documentUtils";

// Default/Initial Data for PT. Exven Mitra Solusindo (FTTH Project Management)
export const DEFAULT_MEMBERS: TeamMember[] = [
  { email: "kelolakan@gmail.com", name: "Kelolakan (Project Director)", role: UserRole.ADMIN, division: "FTTH Rollout / Management", points: 220 },
  { email: "hendra.sitac@exven.co.id", name: "Hendra SITAC", role: UserRole.MANAGER, division: "SITAC & Perizinan DKI", points: 140 },
  { email: "rizky.osp@exven.co.id", name: "Rizky OSP Lead", role: UserRole.MANAGER, division: "FTTH Rollout / OSP", points: 165 },
  { email: "agus.splicer@exven.co.id", name: "Agus Splicer & OTDR", role: UserRole.MEMBER, division: "Splicing & Testing", points: 180 },
  { email: "dimas.qc@exven.co.id", name: "Dimas QA/QC", role: UserRole.MEMBER, division: "QA/QC & ATP", points: 125 },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p-ftth-01",
    name: "FTTH Rollout Cluster Cakung - Jakarta Timur (PT. Exven Mitra Solusindo)",
    description: "Penggelaran jaringan Fiber To The Home (FTTH) 1.500 Homepass, penarikan kabel feeder 96C, distribusi 48C, instalasi ODC, FAT, dan uji redaman OTDR.",
    division: "FTTH Rollout / OSP",
    start_date: "2026-06-15",
    end_date: "2026-08-30",
    status: ProjectStatus.ACTIVE,
    contract_value: 450000000, // Rp 450.000.000
    target_margin_pct: 32, // 32%
    target_margin_amount: 144000000, // Rp 144.000.000
  },
  {
    id: "p-ftth-02",
    name: "Penarikan Feeder 96C & Distribusi 48C Tebet - Kemang (Jakarta Selatan)",
    description: "Pekerjaan penarikan kabel fiber optic udara OSP, pemasangan joint closure, grounding tiang, dan perizinan lintas instansi Jakarta Selatan.",
    division: "Civil & Joint Pole",
    start_date: "2026-07-01",
    end_date: "2026-08-20",
    status: ProjectStatus.ACTIVE,
    contract_value: 280000000, // Rp 280.000.000
    target_margin_pct: 30, // 30%
    target_margin_amount: 84000000, // Rp 84.000.000
  },
  {
    id: "p-ftth-03",
    name: "Survey SITAC, Perizinan Jalur Tiang Pemda DKI & Splicing 1000 HP",
    description: "Survey rute rute tiang PLN/Telkom, perizinan warga RT/RW, dishub, dan penempatan FAT (Fiber Access Terminal).",
    division: "SITAC & Perizinan DKI",
    start_date: "2026-07-10",
    end_date: "2026-09-15",
    status: ProjectStatus.ACTIVE,
    contract_value: 175000000, // Rp 175.000.000
    target_margin_pct: 35, // 35%
    target_margin_amount: 61250000, // Rp 61.250.000
  }
];

export const DEFAULT_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: "ft-01",
    project_id: "p-ftth-01",
    type: "IN",
    category: "Termin 1 (DP 30%)",
    amount: 135000000,
    date: "2026-06-16",
    description: "Penerimaan Down Payment 30% proyek FTTH Cluster Cakung dari Klien Operator.",
    reference: "INV-EXV-2026-01",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-06-16T09:00:00.000Z",
  },
  {
    id: "ft-02",
    project_id: "p-ftth-01",
    type: "IN",
    category: "Termin 2 (Progress 40%)",
    amount: 180000000,
    date: "2026-07-15",
    description: "Pencairan termin progress milestone 50% pekerjaan penggelaran kabel dan ODC.",
    reference: "INV-EXV-2026-04",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-07-15T14:30:00.000Z",
  },
  {
    id: "ft-03",
    project_id: "p-ftth-01",
    type: "OUT",
    category: "Material Fiber Optic",
    amount: 68500000,
    date: "2026-06-18",
    description: "Pembelian kabel FO ADSS 96C/48C, Drop Core 1C, ODC 144C, FAT 16 Port, dan aksesoris tiang (Suspension, Dead End, Pole Band).",
    reference: "PO-MAT-088",
    created_by: "rizky.osp@exven.co.id",
    created_at: "2026-06-18T11:00:00.000Z",
  },
  {
    id: "ft-04",
    project_id: "p-ftth-01",
    type: "OUT",
    category: "Subkon / Upah Tarikan Kabel",
    amount: 48000000,
    date: "2026-06-30",
    description: "Pembayaran mandays tim penarikan kabel fiber optik lapangan tahap 1 (4 Tim OSP).",
    reference: "HR-OSP-01",
    created_by: "hendra.sitac@exven.co.id",
    created_at: "2026-06-30T17:00:00.000Z",
  },
  {
    id: "ft-05",
    project_id: "p-ftth-01",
    type: "OUT",
    category: "Perizinan & SITAC DKI",
    amount: 14500000,
    date: "2026-06-22",
    description: "Biaya perizinan lintasan jalur, koordinasi RT/RW setempat Cakung, dan retribusi jalur tiang.",
    reference: "KW-SITAC-12",
    created_by: "hendra.sitac@exven.co.id",
    created_at: "2026-06-22T10:15:00.000Z",
  },
  {
    id: "ft-06",
    project_id: "p-ftth-01",
    type: "OUT",
    category: "Splicing & Alat Ukur OTDR",
    amount: 18200000,
    date: "2026-07-04",
    description: "Sewa Fusion Splicer Fujikura, OTDR Exfo, Optical Power Meter, dan pigtail/patchcord.",
    reference: "KW-SPL-09",
    created_by: "agus.splicer@exven.co.id",
    created_at: "2026-07-04T15:00:00.000Z",
  },
  {
    id: "ft-07",
    project_id: "p-ftth-02",
    type: "IN",
    category: "Termin 1 (DP 40%)",
    amount: 112000000,
    date: "2026-07-02",
    description: "Uang muka proyek penarikan kabel OSP Tebet - Kemang.",
    reference: "INV-EXV-2026-02",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-07-02T11:00:00.000Z",
  },
  {
    id: "ft-08",
    project_id: "p-ftth-02",
    type: "OUT",
    category: "Material & Joint Closure",
    amount: 42000000,
    date: "2026-07-05",
    description: "Pengadaan Joint Closure Dome 96 Core, Tray Splicing, dan Bracket Tiang.",
    reference: "PO-MAT-092",
    created_by: "rizky.osp@exven.co.id",
    created_at: "2026-07-05T09:00:00.000Z",
  }
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: "t-ftth-01",
    project_id: "p-ftth-01",
    title: "Survey Rute Tiang & SITAC Perizinan Warga Cakung (DKI Jakarta)",
    description: "Melakukan survey lapangan, tagging tiang eksisting PLN/Telkom, izin warga RT/RW, dan penentuan titik ODC/FAT.",
    status: TaskStatus.DONE,
    due_date: "2026-06-25",
    assignee_name: "Hendra SITAC",
    assignee_email: "hendra.sitac@exven.co.id",
    est_hours: 24, // 3 Hari Kerja (3 Mandays)
    logged_hours: 24,
    priority: TaskPriority.HIGH,
    calendar_synced: false,
  },
  {
    id: "t-ftth-02",
    project_id: "p-ftth-01",
    title: "Penarikan Kabel Fiber Optic Feeder 96C & Distribusi 48C Udara",
    description: "Penggelaran kabel FO rute utama Cakung, pemasangan aksesoris tiang, span cable, dan penataan slack closure.",
    status: TaskStatus.DOING,
    due_date: "2026-07-18",
    assignee_name: "Rizky OSP Lead",
    assignee_email: "rizky.osp@exven.co.id",
    est_hours: 40, // 5 Hari Kerja (5 Mandays)
    logged_hours: 28, // 3.5 Hari
    priority: TaskPriority.HIGH,
    calendar_synced: true,
  },
  {
    id: "t-ftth-03",
    project_id: "p-ftth-01",
    title: "Instalasi ODC 144C & FAT (Fiber Access Terminal) 16 Port",
    description: "Pemasangan pondasi dan kabinet ODC 144 Core, pemasangan 24 unit FAT di tiang distribusi, dan labeling port.",
    status: TaskStatus.TODO,
    due_date: "2026-07-25",
    assignee_name: "Rizky OSP Lead",
    assignee_email: "rizky.osp@exven.co.id",
    est_hours: 20, // 2.5 Hari Kerja (20 Jam)
    logged_hours: 0,
    priority: TaskPriority.MEDIUM,
    calendar_synced: false,
  },
  {
    id: "t-ftth-04",
    project_id: "p-ftth-01",
    title: "Splicing Fusion Core di Joint Closure & Pengukuran Redaman OTDR / OPM",
    description: "Penyambungan core serat optik (fusion splicing max loss 0.03 dB), penataan tray, dan uji redaman OTDR 1310/1550nm.",
    status: TaskStatus.TODO,
    due_date: "2026-08-05",
    assignee_name: "Agus Splicer & OTDR",
    assignee_email: "agus.splicer@exven.co.id",
    est_hours: 16, // 2 Hari Kerja (16 Jam)
    logged_hours: 0,
    priority: TaskPriority.HIGH,
    calendar_synced: false,
  },
  {
    id: "t-ftth-05",
    project_id: "p-ftth-01",
    title: "Uji Terima (ATP) Klien & Pembuatan As-Built Drawing (ABD) FTTH",
    description: "Join test ATP bersama representatif klien, penyerahan trace kurva OTDR, data link budget loss, dan update as-built drawing format CAD.",
    status: TaskStatus.TODO,
    due_date: "2026-08-15",
    assignee_name: "Dimas QA/QC",
    assignee_email: "dimas.qc@exven.co.id",
    est_hours: 12, // 1.5 Hari Kerja (12 Jam)
    logged_hours: 0,
    priority: TaskPriority.LOW,
    calendar_synced: false,
  }
];

export const DEFAULT_CHATS: ChatMessage[] = [
  {
    id: "c-01",
    project_id: "p-ftth-01",
    sender_name: "Hendra SITAC",
    sender_email: "hendra.sitac@exven.co.id",
    message: "Izin lintasan tiang RW 04 dan RW 05 Cakung sudah klir dan ditandatangani pengurus warga.",
    timestamp: "2026-06-25T10:00:00.000Z",
  },
  {
    id: "c-02",
    project_id: "p-ftth-01",
    sender_name: "Rizky OSP Lead",
    sender_email: "rizky.osp@exven.co.id",
    message: "Siap, tim OSP hari ini mulai penarikan kabel feeder 96C dari OLT menuju ODC 01.",
    timestamp: "2026-07-04T10:15:00.000Z",
  }
];

export const DEFAULT_TIME_LOGS: TimeLog[] = [
  {
    id: "l-01",
    task_id: "t-ftth-01",
    user_email: "hendra.sitac@exven.co.id",
    duration_mins: 1440, // 24 jam / 3 hari
    description: "Survey lapangan jalur tiang OSP 4 km dan koordinasi izin warga RT/RW Jakarta Timur.",
    timestamp: "2026-06-24T17:00:00.000Z",
  },
  {
    id: "l-02",
    task_id: "t-ftth-02",
    user_email: "rizky.osp@exven.co.id",
    duration_mins: 1680, // 28 jam / 3.5 hari
    description: "Penarikan kabel udara feeder 96C sepanjang 2.5 km dan pemasangan suspension tiang.",
    timestamp: "2026-07-10T16:30:00.000Z",
  }
];

export const DEFAULT_FILES: DriveFileMetadata[] = [
  {
    id: "mock-drive-file-id-1",
    project_id: "p-ftth-01",
    file_name: "As_Built_Drawing_FTTH_Cakung_Exven.pdf",
    mime_type: "application/pdf",
    size: 3450000,
    uploaded_by: "kelolakan@gmail.com",
    uploaded_at: "2026-07-04T09:12:00.000Z",
  },
  {
    id: "mock-drive-file-id-2",
    project_id: "p-ftth-01",
    file_name: "Hasil_Uji_Redaman_OTDR_FAT_Exven.xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 850000,
    uploaded_by: "agus.splicer@exven.co.id",
    uploaded_at: "2026-07-12T14:20:00.000Z",
  }
];

/**
 * LocalStorage caching keys
 */
const KEYS = {
  PROJECTS: "zonatools_local_projects",
  TASKS: "zonatools_local_tasks",
  CHATS: "zonatools_local_chats",
  TIME_LOGS: "zonatools_local_time_logs",
  FILES: "zonatools_local_files",
  MEMBERS: "zonatools_local_members",
  TRANSACTIONS: "zonatools_local_transactions",
  DOCUMENTS: "zonatools_local_documents",
};

/**
 * Loads data from LocalStorage or returns default mock data
 */
export function loadLocalData() {
  const get = (key: string, fallback: any) => {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  };

  return {
    projects: get(KEYS.PROJECTS, DEFAULT_PROJECTS) as Project[],
    tasks: get(KEYS.TASKS, DEFAULT_TASKS) as Task[],
    chats: get(KEYS.CHATS, DEFAULT_CHATS) as ChatMessage[],
    timeLogs: get(KEYS.TIME_LOGS, DEFAULT_TIME_LOGS) as TimeLog[],
    files: get(KEYS.FILES, DEFAULT_FILES) as DriveFileMetadata[],
    members: get(KEYS.MEMBERS, DEFAULT_MEMBERS) as TeamMember[],
    transactions: get(KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS) as FinancialTransaction[],
    documents: get(KEYS.DOCUMENTS, INITIAL_DOCUMENTS) as ProjectDocument[],
  };
}

/**
 * Saves state back into localstorage for persistent client state
 */
export function saveLocalData(data: {
  projects?: Project[];
  tasks?: Task[];
  chats?: ChatMessage[];
  timeLogs?: TimeLog[];
  files?: DriveFileMetadata[];
  members?: TeamMember[];
  transactions?: FinancialTransaction[];
  documents?: ProjectDocument[];
}) {
  if (data.projects) localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data.projects));
  if (data.tasks) localStorage.setItem(KEYS.TASKS, JSON.stringify(data.tasks));
  if (data.chats) localStorage.setItem(KEYS.CHATS, JSON.stringify(data.chats));
  if (data.timeLogs) localStorage.setItem(KEYS.TIME_LOGS, JSON.stringify(data.timeLogs));
  if (data.files) localStorage.setItem(KEYS.FILES, JSON.stringify(data.files));
  if (data.members) localStorage.setItem(KEYS.MEMBERS, JSON.stringify(data.members));
  if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
  if (data.documents) localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(data.documents));
}
