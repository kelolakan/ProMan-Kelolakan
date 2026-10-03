import React, { useState, useRef } from "react";
import { Project, DriveFileMetadata, TeamMember, UserRole } from "../types";
import { apiUploadFile, apiDeleteFile } from "../lib/apiClient";
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  CloudUpload,
  Download,
  Server
} from "lucide-react";

interface FilesModuleProps {
  activeProject: Project | null;
  files: DriveFileMetadata[];
  userMember: TeamMember | null;
  serverConnected?: boolean;
  onAddFileMetadata: (fileMeta: DriveFileMetadata) => void;
  onDeleteFileMetadata: (fileId: string) => void;
}

export default function FilesModule({
  activeProject,
  files,
  userMember,
  serverConnected = true,
  onAddFileMetadata,
  onDeleteFileMetadata
}: FilesModuleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectFiles = files.filter((f) => f.project_id === activeProject?.id);

  const isAuthorizedToUpload = userMember?.role !== UserRole.VIEWER;

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

    if (!activeProject) {
      alert("Pilih proyek aktif terlebih dahulu sebelum mengunggah file.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedFileMeta = await apiUploadFile(
        file,
        activeProject.id,
        userMember?.email || "admin@exven.co.id"
      );

      onAddFileMetadata(uploadedFileMeta);
      alert(`Berhasil mengunggah "${file.name}" langsung ke penyimpanan server VPS! 📂`);
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengunggah file ke server: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileMeta: DriveFileMetadata) => {
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus file "${fileMeta.file_name}" secara permanen dari server?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!isConfirmed) return;

    try {
      await apiDeleteFile(fileMeta.id);
      onDeleteFileMetadata(fileMeta.id);
      alert("File berhasil dihapus dari server.");
    } catch (err: any) {
      console.error(err);
      onDeleteFileMetadata(fileMeta.id);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
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
          Silakan buka modul **Projects** terlebih dahulu dan pilih salah satu proyek aktif untuk mulai mengelola berkas dokumentasi.
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
                <p className="text-xs font-bold text-slate-700">Mengunggah Berkas ke Server VPS...</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-800">Tarik & Lepas file di sini, atau klik untuk memilih berkas</p>
                <p className="text-[10px] text-gray-400 mt-1">Mendukung berkas PDF Kurva S, lampiran BAST, foto penarikan kabel, surat perizinan, dsb.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Files List Directory */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Direktori Materi Referensi & File Proyek</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Berkas tersimpan aman langsung di dalam server VPS PT. Exven Mitra Solusindo</p>
          </div>
          <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg">
            {projectFiles.length} Berkas
          </span>
        </div>

        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
          {projectFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-300 text-xs">
              Belum ada berkas pendukung yang diunggah di proyek ini.
            </div>
          ) : (
            projectFiles.map((f) => {
              const FileIcon = getFileIcon(f.mime_type);
              const fileUrl = (f as any).url || `/uploads/${f.file_name}`;

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

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg border border-gray-100 flex items-center gap-1.5 text-[10px] font-bold transition-all"
                      title="Buka atau unduh berkas"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh / Buka</span>
                    </a>

                    {isAuthorizedToUpload && (
                      <button
                        onClick={() => handleDeleteFile(f)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg border border-gray-100 cursor-pointer transition-all"
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
