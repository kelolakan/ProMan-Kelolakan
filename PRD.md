# Product Requirement Document (PRD) & System Architecture
## ZonaTools Project Management System

### 1. Overview
ZonaTools is an integrated, modular Project Management platform that utilizes the user's personal Google Workspace (Google Sheets as database, Google Drive for file storage, Google Calendar for schedule sync, and Gmail for email updates) to create an efficient, collaborative, and real-time project management experience.

---

### 2. Objectives & Value Proposition
- **Real-time Monitoring**: Provide live visibility of tasks, progress, and team work logs.
- **Structured Workspace**: Organize projects visually with Kanban boards, chat spaces, and document directories.
- **Zero Database Infrastructure**: Use Google Sheets as a light-weight, user-controlled database to save cost and maintain high transparency.
- **Collaboration & Notifications**: Seamlessly send automated email notifications (Gmail) and calendar sync (Google Calendar) to ensure members are aligned.
- **AI-Powered Analytics**: Integrated Gemini API analysis to automatically generate monthly performance, risk, and improvement reports.

---

### 3. Role-Based Access Control (RBAC)
To protect divisional privacy and ensure proper access levels, the app implements four distinct roles:
1. **Admin / Division Head**: Full access to all projects, dashboard metrics, member roles, and settings. Can write/delete files and export global reports.
2. **Project Manager**: Access to assigned projects and team files. Can create tasks, manage budgets/dates, view S-curves, and analyze team productivity.
3. **Team Member**: Access to assigned tasks and division files. Can view project Kanban, log work hours, participate in chats, and upload documentation.
4. **Viewer / Client**: Read-only access to specific project progress, Kanban columns, and S-curve reports. Cannot edit tasks, write messages, or upload files.

---

### 4. Key Feature Specifications

#### 4.1 Kanban Board
- Three main states: **Antrean (Todo)**, **Dikerjakan (Doing)**, **Selesai (Done)**.
- Drag-and-drop or simple click-to-move transitions.
- Each task card displays: Task Name, Assignee, Division Tag, Due Date, Logged/Estimated Hours, and Priority.

#### 4.2 Real-time Project Chat (Group Chat)
- Live project-specific discussion feeds.
- Messages stored in the Google Sheet (chats worksheet).
- Auto-refresh mechanism to ensure real-time correspondence.

#### 4.3 S-Curve Reports
- Analytical visualization showing **Cumulative Planned Progress (%)** vs. **Cumulative Realized Progress (%)** over the project's timeline.
- Identifies whether a project is ahead of schedule (Positive Variance) or behind schedule (Negative Variance).
- Fully rendered using `recharts` for performance and design fidelity.

#### 4.4 File & Documentation Management (Google Drive)
- Direct integration with Google Drive (`drive.file` scope).
- Create a designated project folder on Drive.
- Upload project attachments directly to Drive, and store metadata (File ID, file name, download link) in the Google Sheets database.
- Download and view files directly within the application.

#### 4.5 Time Tracking & Productivity Optimization
- Task-specific work timers (Play/Stop log) or manual duration logging.
- Members log hours against tasks with short descriptions.
- Translates logged hours into **Poin Performa** (Performance Points) to gamify productivity.

#### 4.6 Analytics Dashboard (Manager/Admin Only)
- Dynamic visualization of project performance, task distribution, and point tallies.
- **Gemini AI Report Generator**: One-click AI evaluation of project health, identifying bottlenecks and suggestions for the current month.

#### 4.7 Multi-format Export (PDF & Excel)
- **PDF Export**: Print-ready styled layouts of S-curves and task reports.
- **Excel/CSV Export**: Raw tabular data sheets for projects, tasks, and time entries.

#### 4.8 Personal Calendar Sync
- Option to sync due dates of assigned tasks to the member's personal **Google Calendar**.
- Creates or updates task milestones in Google Calendar automatically.

#### 4.9 Automated Gmail Notifications
- Triggers custom, visually rich emails via Gmail when tasks are assigned, completed, or approaching deadline.

---

### 5. Google Sheets Database Schema
The Google Sheet contains 5 distinct worksheets acting as the relational tables:

#### Table A: `projects`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Project ID |
| `name` | String | Name of the Project |
| `description` | String | Project Description |
| `division` | String | Division (e.g., Tech, Marketing, HR) |
| `start_date` | String | YYYY-MM-DD |
| `end_date` | String | YYYY-MM-DD |
| `status` | String | Active, Completed, Paused |

#### Table B: `tasks`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Task ID |
| `project_id` | String | Foreign Key linking to `projects` |
| `title` | String | Task Title |
| `description` | String | Task Description |
| `status` | String | Todo, Doing, Done |
| `due_date` | String | YYYY-MM-DD |
| `assignee_name` | String | Name of Assigned Member |
| `assignee_email`| String | Google Email of Assigned Member |
| `est_hours` | Number | Estimated completion time |
| `logged_hours` | Number | Actual logged work hours |
| `priority` | String | High, Medium, Low |

#### Table C: `chats`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Chat ID |
| `project_id` | String | Foreign Key |
| `sender_name` | String | Sender's Name |
| `sender_email`| String | Sender's Email |
| `message` | String | Message text |
| `timestamp` | String | ISO String timestamp |

#### Table D: `time_tracking`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Time Log ID |
| `task_id` | String | Foreign Key linking to `tasks` |
| `user_email` | String | Email of logger |
| `duration_mins`| Number | Spent duration in minutes |
| `description` | String | Description of work |
| `timestamp` | String | ISO String timestamp |

#### Table E: `files`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Drive File ID |
| `project_id` | String | Foreign Key |
| `file_name` | String | Name of File |
| `mime_type` | String | File Type (PDF, PNG, etc.) |
| `size` | Number | File Size in Bytes |
| `uploaded_by` | String | Email of uploader |
| `uploaded_at` | String | ISO String timestamp |

---

### 6. System Architecture (Modular & Scalable)

```
                     ┌──────────────────────────────┐
                     │          React SPA           │
                     │  (Vite + Tailwind CSS + UI)  │
                     └──────────────┬───────────────┘
                                    │
           ┌────────────────────────┼───────────────────────┐
           ▼                        ▼                       ▼
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│   Google Sheets    │   │    Google Drive    │   │  Google Calendar   │
│   Database Sync    │   │   Storage Client   │   │  & Gmail Client    │
└────────────────────┘   └────────────────────┘   └────────────────────┘
           │                        │                       │
           └────────────────────────┼───────────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │      Google API Gateway      │
                     │   (Uses OAuth User Token)    │
                     └──────────────┬───────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │      Google Cloud Server     │
                     │  (Sheet / Drive / Calendar)  │
                     └──────────────────────────────┘
```

- **Client-Side Google Services Client**: The React frontend securely holds the OAuth token in memory and interacts directly with the Google API endpoints for Sheets, Drive, Calendar, and Gmail.
- **Server-Side Proxy for Gemini**: The Express server acts as a secured backend to communicate with the Google Gemini API to analyze project spreadsheets without exposing the Gemini API key to the browser.
- **Modularity Strategy**: Each primary visual component is decoupled inside `/src/components/` and `/src/modules/` so that any enhancement in S-Curve analytics or time-tracking does not disrupt the Kanban or Drive modules.
