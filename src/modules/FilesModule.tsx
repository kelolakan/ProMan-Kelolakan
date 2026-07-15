import React, { useState, useRef } from "react";
import { Project, DriveFileMetadata, TeamMember, UserRole } from "../types";
import { getOrCreateAttachmentsFolder, uploadFileToDrive, deleteFileFromDrive } from "../lib/googleDrive";
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  HelpCircle,
  CloudUpload,
  Clock
} from "lucide-react";

interface FilesModuleProps {
  activeProject: Project | null;
  files: DriveFileMetadata[];
  userMember: TeamMember | null;
  sheetsConnected: boolean;
  accessToken: string | null;
  onAddFileMetadata: (fileMeta: DriveFileMetadata) => void;
  onDeleteFileMetadata: (fileId: string) => void;
}

export default function FilesModule({
  activeProject,
  files,
  userMember,
  sheetsConnected,
  accessToken,
  onAddFileMetadata,
  onDeleteFileMetadata
}: FilesModuleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectFiles = files.filter((f) => f.project_id === activeProject?.id);

  const isAuthorizedToUpload =
    userMember?.role !== UserRole.VIEWER;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileUpload(e.target.files[0]);
    }
  };

  const processFileUpload = async (file: File) => {
    if (!isAuthorizedToUpload) {
      alert("Maaf, peran Anda tidak diizinkan untuk mengunggah file.");
      return;
    }
    if (!sheetsConnected || !accessToken) {
      alert("Harap hubungkan akun Google Workspace Anda terlebih dahulu untuk mengaktifkan upload Drive!");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Find or create root folder on Drive
      const folderId = await getOrCreateAttachmentsFolder(accessToken);

      // 2. Upload file to Drive
      const uploadResult = await uploadFileToDrive(accessToken, file, folderId);

      // 3. Save metadata
      const newFileMeta: DriveFileMetadata = {
        id: uploadResult.id,
        project_id: activeProject?.id || "",
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        uploaded_by: userMember?.email || "anonymous@gmail.com",
        uploaded_at: new Date().toISOString(),
      };

      onAddFileMetadata(newFileMeta);
      alert(`Berhasil mengunggah "${file.name}" langsung ke Google Drive Anda! 📂`);
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengunggah file ke Google Drive: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileMeta: DriveFileMetadata) => {
    // SECURITY RULES REQUIRE EXPLICIT USER CONFIRMATION DIALOG FOR MUTATION
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus file "${fileMeta.file_name}" secara permanen dari Google Drive?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!isConfirmed) return;

    if (!sheetsConnected || !accessToken) {
      alert("Harap hubungkan akun Google Workspace terlebih dahulu!");
      return;
    }

    try {
      // 1. Delete from Drive
      await deleteFileFromDrive(accessToken, memberFileIdAdjuster(fileMeta.id));
      
      // 2. Delete from Sheets
      onDeleteFileMetadata(fileMeta.id);
      alert("File berhasil dihapus secara permanen.");
    } catch (err: any) {
      console.error(err);
      // Even if Google Drive fails (e.g. file already deleted manually), let's clear the metadata to keep sheet clean
      onDeleteFileMetadata(fileMeta.id);
      alert("Dihapus dari database sistem.");
    }
  };

  // Helper to resolve mock Drive IDs from default states
  const memberFileIdAdjuster = (id: string) => {
    if (id.startsWith("mock-")) return "dummy"; // Guard mock default files
    return id;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return ImageIcon;
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return FileText;
    return File;
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <File className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan buka modul **Projects** terlebih dahulu dan pilih salah satu proyek aktif untuk mulai mengelola berkas dokumentasi Google Drive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* File Drag and Drop Uploader */}
      {isAuthorizedToUpload && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-indigo-600 bg-indigo-50/30"
              : "border-gray-200 hover:border-indigo-400 hover:bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <CloudUpload className="w-6 h-6" />
          </div>

          <div>
            {isUploading ? (
              <div className="space-y-2">
                <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto block"></span>
                <p className="text-xs font-bold text-slate-700">Mengunggah Berkas ke Google Drive...</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-800">Tarik & Lepas file di sini, atau klik untuk telusuri</p>
                <p className="text-[10px] text-gray-400 mt-1">Mendukung file proposal, gambar desain, spreadsheet XLS, dll.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Files List Directory */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Direktori Materi Referensi & File Proyek</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Daftar file yang disimpan aman langsung di dalam Google Drive pengguna</p>
        </div>

        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
          {projectFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-300 text-xs">
              Belum ada berkas pendukung di proyek ini.
            </div>
          ) : (
            projectFiles.map((f) => {
              const FileIcon = getFileIcon(f.mime_type);
              const downloadUrl = f.id.startsWith("mock-")
                ? "#"
                : `https://drive.google.com/file/d/${f.id}/view`;

              return (
                <div key={f.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-200/50">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-800 truncate block">
                        {f.file_name}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        Ukuran: {formatBytes(f.size)} • Diunggah oleh: {f.uploaded_by}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    {!f.id.startsWith("mock-") && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg border border-gray-100 flex items-center gap-1.5 text-[10px] font-bold"
                        title="Buka berkas di Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Pratinjau Drive</span>
                      </a>
                    )}

                    {isAuthorizedToUpload && (
                      <button
                        onClick={() => handleDeleteFile(f)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg border border-gray-100 cursor-pointer"
                        title="Hapus file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
