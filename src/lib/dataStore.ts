import { Project, Task, ChatMessage, TimeLog, DriveFileMetadata, TeamMember, ProjectStatus, TaskStatus, TaskPriority, UserRole } from "../types";

// Default/Initial Mock Data to pre-populate when sheets are empty or offline
export const DEFAULT_MEMBERS: TeamMember[] = [
  { email: "kelolakan@gmail.com", name: "Kelolakan (Me)", role: UserRole.ADMIN, division: "Tech", points: 150 },
  { email: "andri.developer@gmail.com", name: "Andri Developer", role: UserRole.MANAGER, division: "Tech", points: 110 },
  { email: "siti.marketing@gmail.com", name: "Siti Marketing", role: UserRole.MANAGER, division: "Marketing", points: 80 },
  { email: "budi.coder@gmail.com", name: "Budi Coder", role: UserRole.MEMBER, division: "Tech", points: 130 },
  { email: "naufal.design@gmail.com", name: "Naufal Design", role: UserRole.MEMBER, division: "Design", points: 95 },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p-tech-01",
    name: "Proyek Tim Developer 1",
    description: "Sistem Manajemen Proyek ZonaTools terintegrasi Google Workspace.",
    division: "Tech",
    start_date: "2026-06-20",
    end_date: "2026-07-25",
    status: ProjectStatus.ACTIVE,
  },
  {
    id: "p-mkt-02",
    name: "Kampanye Digital Q3",
    description: "Peluncuran marketing campaign untuk platform ZonaTools.",
    division: "Marketing",
    start_date: "2026-07-01",
    end_date: "2026-08-15",
    status: ProjectStatus.ACTIVE,
  },
  {
    id: "p-dsg-03",
    name: "Rebranding Visual",
    description: "Desain ulang logo, typography guidelines, dan asset grafis marketing.",
    division: "Design",
    start_date: "2026-07-05",
    end_date: "2026-08-20",
    status: ProjectStatus.PAUSED,
  }
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: "t-01",
    project_id: "p-tech-01",
    title: "Integrasi API Google Sheets",
    description: "Menghubungkan spreadsheet sebagai cloud database relasional ZonaTools.",
    status: TaskStatus.DONE,
    due_date: "2026-06-28",
    assignee_name: "Andri Developer",
    assignee_email: "andri.developer@gmail.com",
    est_hours: 12,
    logged_hours: 12,
    priority: TaskPriority.HIGH,
  },
  {
    id: "t-02",
    project_id: "p-tech-01",
    title: "Kanban Board Drag & Drop",
    description: "Membuat visual papan kerja modular dan mulus dengan Framer Motion.",
    status: TaskStatus.DOING,
    due_date: "2026-07-12",
    assignee_name: "Kelolakan (Me)",
    assignee_email: "kelolakan@gmail.com",
    est_hours: 10,
    logged_hours: 4,
    priority: TaskPriority.HIGH,
  },
  {
    id: "t-03",
    project_id: "p-tech-01",
    title: "Laporan Kurva S Dinamis",
    description: "Membuat visualisasi kemajuan rencana vs realisasi dengan recharts.",
    status: TaskStatus.TODO,
    due_date: "2026-07-18",
    assignee_name: "Budi Coder",
    assignee_email: "budi.coder@gmail.com",
    est_hours: 8,
    logged_hours: 0,
    priority: TaskPriority.MEDIUM,
  },
  {
    id: "t-04",
    project_id: "p-tech-01",
    title: "Optimasi Asset Drive & PDF",
    description: "Menghubungkan Google Drive untuk attachment tugas dan ekspor file.",
    status: TaskStatus.TODO,
    due_date: "2026-07-22",
    assignee_name: "Naufal Design",
    assignee_email: "naufal.design@gmail.com",
    est_hours: 6,
    logged_hours: 0,
    priority: TaskPriority.LOW,
  }
];

export const DEFAULT_CHATS: ChatMessage[] = [
  {
    id: "c-01",
    project_id: "p-tech-01",
    sender_name: "Andri Developer",
    sender_email: "andri.developer@gmail.com",
    message: "Halo tim! Spreadsheet database dan OAuth sudah aktif.",
    timestamp: "2026-07-04T10:00:00.000Z",
  },
  {
    id: "c-02",
    project_id: "p-tech-01",
    sender_name: "Kelolakan (Me)",
    sender_email: "kelolakan@gmail.com",
    message: "Mantap, saya sedang menyelesaikan layout Kanban board.",
    timestamp: "2026-07-04T10:15:00.000Z",
  }
];

export const DEFAULT_TIME_LOGS: TimeLog[] = [
  {
    id: "l-01",
    task_id: "t-01",
    user_email: "andri.developer@gmail.com",
    duration_mins: 720,
    description: "Mengembangkan skema tabel relasional projects dan tasks di Sheets.",
    timestamp: "2026-06-27T17:00:00.000Z",
  },
  {
    id: "l-02",
    task_id: "t-02",
    user_email: "kelolakan@gmail.com",
    duration_mins: 240,
    description: "Membuat rendering kolom Todo, Doing, Done dan integrasi timer.",
    timestamp: "2026-07-04T08:30:00.000Z",
  }
];

export const DEFAULT_FILES: DriveFileMetadata[] = [
  {
    id: "mock-drive-file-id-1",
    project_id: "p-tech-01",
    file_name: "Logo_ZonaTools_Sistem.png",
    mime_type: "image/png",
    size: 245312,
    uploaded_by: "kelolakan@gmail.com",
    uploaded_at: "2026-07-04T09:12:00.000Z",
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
}) {
  if (data.projects) localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data.projects));
  if (data.tasks) localStorage.setItem(KEYS.TASKS, JSON.stringify(data.tasks));
  if (data.chats) localStorage.setItem(KEYS.CHATS, JSON.stringify(data.chats));
  if (data.timeLogs) localStorage.setItem(KEYS.TIME_LOGS, JSON.stringify(data.timeLogs));
  if (data.files) localStorage.setItem(KEYS.FILES, JSON.stringify(data.files));
  if (data.members) localStorage.setItem(KEYS.MEMBERS, JSON.stringify(data.members));
}
