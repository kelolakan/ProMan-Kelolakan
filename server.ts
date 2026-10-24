import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  readDatabase,
  writeDatabase,
  authenticateUser,
  changeUserPassword,
  getSystemSettings,
  updateSystemSettings,
  adminResetUserPassword,
  adminDeleteMember,
  adminSaveMember,
  resetDatabaseToDefault,
  saveProjectDocument,
  deleteProjectDocument,
  UPLOADS_DIR,
  DB_FILE,
  StoredUser,
} from "./server/db";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 4000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Serve static files uploaded by the team
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Configure Multer for local VPS disk storage
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  });

  // ==========================================
  // 1. AUTHENTICATION ENDPOINTS
  // ==========================================
  app.post("/api/auth/login", (req, res) => {
    const { email, username, password } = req.body;
    const identifier = (username || email || "").trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }

    const authResult = authenticateUser(identifier, password);
    if (!authResult) {
      return res.status(401).json({ error: "Username atau password yang Anda masukkan salah." });
    }

    return res.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
    });
  });

  app.post("/api/auth/change-password", (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Data ganti password tidak lengkap." });
    }

    const verify = authenticateUser(email.trim(), oldPassword);
    if (!verify) {
      return res.status(401).json({ error: "Password lama tidak sesuai." });
    }

    const success = changeUserPassword(email.trim(), newPassword);
    if (!success) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    return res.json({ success: true, message: "Password berhasil diperbarui!" });
  });

  // ==========================================
  // 2. CENTRALIZED DATABASE SYNC & SETTINGS
  // ==========================================
  app.get("/api/settings", (_req, res) => {
    return res.json(getSystemSettings());
  });

  app.post("/api/settings", (req, res) => {
    const updated = updateSystemSettings(req.body);
    return res.json({ success: true, settings: updated });
  });

  // Admin: Reset user password directly
  app.post("/api/admin/reset-user-password", (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email dan password baru wajib diisi." });
    }
    const success = adminResetUserPassword(email, newPassword);
    if (!success) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }
    return res.json({ success: true, message: `Password akun ${email} berhasil direset.` });
  });

  // Admin: Add or update member with custom password
  app.post("/api/admin/save-member", (req, res) => {
    const { email, name, role, division, points, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email dan nama wajib diisi." });
    }
    const member: StoredUser = {
      email,
      name,
      role: role || "Team Member",
      division: division || "General",
      points: points || 0,
      passwordHash: password || "exven2026",
    };
    adminSaveMember(member);
    return res.json({ success: true, message: "Data anggota tim berhasil disimpan." });
  });

  // Admin: Delete member
  app.delete("/api/admin/members/:email", (req, res) => {
    const { email } = req.params;
    if (email.toLowerCase() === "kelolakan@gmail.com") {
      return res.status(403).json({ error: "Akun Super Admin utama tidak dapat dihapus." });
    }
    const success = adminDeleteMember(email);
    if (!success) {
      return res.status(404).json({ error: "Anggota tim tidak ditemukan." });
    }
    return res.json({ success: true, message: "Anggota tim berhasil dihapus." });
  });

  // Admin: Download database JSON backup
  app.get("/api/admin/backup-db", (_req, res) => {
    res.download(DB_FILE, `exven-backup-${new Date().toISOString().slice(0, 10)}.json`);
  });

  // Admin: Restore database from JSON
  app.post("/api/admin/restore-db", (req, res) => {
    const data = req.body;
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.members)) {
      return res.status(400).json({ error: "Format file backup JSON tidak valid." });
    }
    writeDatabase(data);
    return res.json({ success: true, message: "Database berhasil direstore dari file backup." });
  });

  // Admin: Reset database to initial factory settings
  app.post("/api/admin/reset-db", (_req, res) => {
    const resetDb = resetDatabaseToDefault();
    return res.json({ success: true, message: "Database berhasil direset ke konfigurasi awal.", data: resetDb });
  });

  app.get("/api/data", (_req, res) => {
    const db = readDatabase();
    // Return members without sensitive password hashes
    const safeMembers = db.members.map(({ passwordHash, ...safe }) => safe);
    return res.json({
      projects: db.projects || [],
      tasks: db.tasks || [],
      chats: db.chats || [],
      timeLogs: db.timeLogs || [],
      files: db.files || [],
      members: safeMembers,
      transactions: db.transactions || [],
      documents: db.documents || [],
      settings: db.settings || getSystemSettings(),
    });
  });

  // ==========================================
  // 3. PROJECT DOCUMENTS (INVOICE, BAST, VENDOR VOUCHER)
  // ==========================================
  app.get("/api/documents", (_req, res) => {
    const db = readDatabase();
    return res.json(db.documents || []);
  });

  app.post("/api/documents", (req, res) => {
    const doc = req.body;
    if (!doc || !doc.title || !doc.type) {
      return res.status(400).json({ error: "Data dokumen tidak lengkap." });
    }
    saveProjectDocument(doc);
    return res.json({ success: true, message: "Dokumen berhasil disimpan.", document: doc });
  });

  app.delete("/api/documents/:id", (req, res) => {
    const { id } = req.params;
    deleteProjectDocument(id);
    return res.json({ success: true, message: "Dokumen berhasil dihapus." });
  });

  app.post("/api/parse-document", async (req, res) => {
    try {
      const { text, preferredType } = req.body || {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Field 'text' wajib diisi." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("[Parse] GEMINI_API_KEY kosong → fallback ke heuristik di frontend.");
        // 204 = No Content → frontend otomatis fallback ke parseHeuristics
        return res.status(204).end();
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Anda adalah ekstraktor dokumen bisnis Indonesia (Invoice, BAST, Voucher Pembayaran, Purchase Order).
Tugas: ekstrak data dari teks dokumen menjadi JSON valid.
Balas HANYA JSON, tanpa markdown, tanpa penjelasan tambahan.

Skema JSON yang harus diisi (hilangkan key yang tidak ada di dokumen):
{
  "doc_type": "INVOICE" | "BAST" | "VENDOR_PAYMENT",
  "doc_number": string,
  "doc_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "title": string,
  "recipient_name": string,
  "recipient_company": string,
  "recipient_address": string,
  "recipient_phone": string,
  "items": [{"description": string, "quantity": number, "unit": string, "unit_price": number, "amount": number}],
  "include_tax": boolean,
  "notes": string,
  "work_scope": string,
  "milestone_percentage": number,
  "atp_ref_number": string,
  "payment_method": "BANK_TRANSFER" | "CASH" | "GIRO",
  "bank_name": string,
  "bank_account_number": string,
  "bank_account_name": string,
  "confidence": number,
  // Optional fields for additional metadata
  "site_name": string,
  "product_type": string,
  "regional_site": string,
  "po_number": string,
  "po_date": "YYYY-MM-DD",
  "ship_to_company": string,
  "ship_to_address": string
}

Aturan:
- Semua angka rupiah dalam bentuk number (tanpa titik/koma).
- Tanggal format YYYY-MM-DD.
- doc_type default "INVOICE" jika tidak jelas.
- confidence: 0.0 sampai 1.0 sesuai keyakinan.
${preferredType ? `- Tipe yang diharapkan dari UI: ${preferredType}` : ""}

TEKS DOKUMEN:
${text.slice(0, 15000)}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const jsonText = response.text || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        console.error("[Parse] Gemini bukan JSON valid:", jsonText.slice(0, 200));
        return res.status(204).end(); // fallback ke heuristik
      }

      return res.json(parsed);
    } catch (err: any) {
      console.error("[Parse] Error:", err?.message || err);
      // Return 204 supaya frontend tidak crash, langsung fallback ke heuristik
      return res.status(204).end();
    }
  });

  app.post("/api/data/sync", (req, res) => {
    const { projects, tasks, chats, timeLogs, files, members, transactions, documents } = req.body;
    const db = readDatabase();

    if (projects) db.projects = projects;
    if (tasks) db.tasks = tasks;
    if (chats) db.chats = chats;
    if (timeLogs) db.timeLogs = timeLogs;
    if (files) db.files = files;
    if (transactions) db.transactions = transactions;
    if (documents) db.documents = documents;

    if (members && Array.isArray(members)) {
      // Preserve existing password hashes for updated members
      db.members = members.map((m: any) => {
        const existing = db.members.find((em) => em.email.toLowerCase() === m.email?.toLowerCase());
        return {
          email: m.email,
          name: m.name,
          role: m.role,
          division: m.division,
          points: m.points ?? 0,
          passwordHash: existing?.passwordHash || "exven2026",
        };
      });
    }

    writeDatabase(db);
    return res.json({ success: true, message: "Data berhasil disinkronisasi ke server VPS." });
  });

  // Mutations: Projects
  app.post("/api/projects", (req, res) => {
    const project = req.body;
    if (!project || !project.id) {
      return res.status(400).json({ error: "Data proyek tidak valid." });
    }
    const db = readDatabase();
    const idx = db.projects.findIndex((p) => p.id === project.id);
    if (idx !== -1) {
      db.projects[idx] = { ...db.projects[idx], ...project };
    } else {
      db.projects.unshift(project);
    }
    writeDatabase(db);
    return res.json({ success: true, project });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    db.projects = db.projects.filter((p) => p.id !== id);
    writeDatabase(db);
    return res.json({ success: true });
  });

  // Mutations: Tasks
  app.post("/api/tasks", (req, res) => {
    const task = req.body;
    if (!task || !task.id) {
      return res.status(400).json({ error: "Data tugas tidak valid." });
    }
    const db = readDatabase();
    const idx = db.tasks.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      db.tasks[idx] = { ...db.tasks[idx], ...task };
    } else {
      db.tasks.unshift(task);
    }
    writeDatabase(db);
    return res.json({ success: true, task });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    writeDatabase(db);
    return res.json({ success: true });
  });

  // Mutations: Finances / Transactions
  app.post("/api/finances", (req, res) => {
    const transaction = req.body;
    if (!transaction || !transaction.id) {
      return res.status(400).json({ error: "Data transaksi tidak valid." });
    }
    const db = readDatabase();
    const idx = db.transactions.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) {
      db.transactions[idx] = { ...db.transactions[idx], ...transaction };
    } else {
      db.transactions.unshift(transaction);
    }
    writeDatabase(db);
    return res.json({ success: true, transaction });
  });

  app.delete("/api/finances/:id", (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    db.transactions = db.transactions.filter((t) => t.id !== id);
    writeDatabase(db);
    return res.json({ success: true });
  });

  // Mutations: Chats
  app.post("/api/chats", (req, res) => {
    const chat = req.body;
    if (!chat || !chat.id) {
      return res.status(400).json({ error: "Pesan chat tidak valid." });
    }
    const db = readDatabase();
    db.chats.push(chat);
    writeDatabase(db);
    return res.json({ success: true, chat });
  });

  // Mutations: Time Logs
  app.post("/api/time_logs", (req, res) => {
    const timeLog = req.body;
    if (!timeLog || !timeLog.id) {
      return res.status(400).json({ error: "Data log waktu tidak valid." });
    }
    const db = readDatabase();
    db.timeLogs.push(timeLog);

    // Automatically award points to member
    const memberIdx = db.members.findIndex((m) => m.email.toLowerCase() === timeLog.user_email?.toLowerCase());
    if (memberIdx !== -1) {
      db.members[memberIdx].points = (db.members[memberIdx].points || 0) + 15;
    }

    writeDatabase(db);
    return res.json({ success: true, timeLog });
  });

  // Mutations: Team Members (Admin only)
  app.post("/api/members", (req, res) => {
    const member = req.body;
    if (!member || !member.email) {
      return res.status(400).json({ error: "Email anggota tim wajib diisi." });
    }
    const db = readDatabase();
    const idx = db.members.findIndex((m) => m.email.toLowerCase() === member.email.toLowerCase());
    if (idx !== -1) {
      db.members[idx] = {
        ...db.members[idx],
        name: member.name || db.members[idx].name,
        role: member.role || db.members[idx].role,
        division: member.division || db.members[idx].division,
        points: member.points ?? db.members[idx].points,
      };
    } else {
      const newMember: StoredUser = {
        email: member.email.toLowerCase(),
        name: member.name || member.email.split("@")[0],
        role: member.role || "Team Member",
        division: member.division || "Operasional",
        points: member.points ?? 10,
        passwordHash: member.password || "exven2026",
      };
      db.members.push(newMember);
    }
    writeDatabase(db);
    return res.json({ success: true, member });
  });

  // ==========================================
  // 3. FILE STORAGE (DIRECT VPS UPLOADS)
  // ==========================================
  app.post("/api/files/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Harap pilih berkas untuk diunggah." });
    }

    const { projectId, uploadedBy } = req.body;
    const fileId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileMeta = {
      id: fileId,
      project_id: projectId || "",
      file_name: req.file.originalname,
      mime_type: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      uploaded_by: uploadedBy || "admin@exven.co.id",
      uploaded_at: new Date().toISOString(),
      url: `/uploads/${req.file.filename}`,
    };

    const db = readDatabase();
    db.files.unshift(fileMeta);
    writeDatabase(db);

    return res.json({ success: true, file: fileMeta });
  });

  app.delete("/api/files/:id", (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const idx = db.files.findIndex((f) => f.id === id);
    if (idx !== -1) {
      const fileMeta = db.files[idx];
      if (fileMeta.url && fileMeta.url.startsWith("/uploads/")) {
        const filename = path.basename(fileMeta.url);
        const physicalPath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(physicalPath)) {
          try {
            fs.unlinkSync(physicalPath);
          } catch (e) {
            console.warn("Failed to remove file from disk:", e);
          }
        }
      }
      db.files.splice(idx, 1);
      writeDatabase(db);
    }
    return res.json({ success: true });
  });

  // Serve static assets or use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Exven Project Management Server running on port ${PORT}`);
  });
}

startServer();
