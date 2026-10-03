import React, { useState, useMemo } from "react";
import {
  FileText,
  FileCheck,
  Plus,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Building,
  DollarSign,
  Receipt,
  CreditCard,
  Shield,
  X,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { Project, ProjectDocument, DocumentType, DocumentItem, TeamMember, UserRole } from "../types";
import { formatIDR, terbilang, generateDocNumber, INITIAL_DOCUMENTS } from "../lib/documentUtils";

interface DocumentsModuleProps {
  projects: Project[];
  activeProjectId: string;
  userMember: TeamMember | null;
  documents: ProjectDocument[];
  onSaveDocument: (doc: ProjectDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export default function DocumentsModule({
  projects,
  activeProjectId,
  userMember,
  documents,
  onSaveDocument,
  onDeleteDocument,
  onRefreshData
}: DocumentsModuleProps) {
  const isAuthorized =
    userMember?.role === UserRole.ADMIN ||
    userMember?.role === UserRole.MANAGER ||
    userMember?.role === "Admin / Division Head" ||
    userMember?.role === "Project Manager";

  // Filter States
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Print Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Create / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Form State
  const [docType, setDocType] = useState<DocumentType>("INVOICE");
  const [docProjectId, setDocProjectId] = useState<string>(activeProjectId || (projects[0]?.id ?? ""));
  const [docNumber, setDocNumber] = useState<string>("");
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [title, setTitle] = useState<string>("");

  // Recipient details
  const [recipientName, setRecipientName] = useState<string>("");
  const [recipientCompany, setRecipientCompany] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");

  // Items
  const [items, setItems] = useState<DocumentItem[]>([
    {
      id: "item-1",
      description: "Pekerjaan Penarikan Kabel Feeder / Distribusi FTTH",
      quantity: 1,
      unit: "Lot",
      unit_price: 50000000,
      amount: 50000000
    }
  ]);

  // Tax and Notes
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // BAST specific
  const [workScope, setWorkScope] = useState<string>("");
  const [milestonePct, setMilestonePct] = useState<number>(50);
  const [atpRefNumber, setAtpRefNumber] = useState<string>("");

  // Vendor payment specific
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "CASH" | "GIRO">("BANK_TRANSFER");
  const [bankName, setBankName] = useState<string>("Bank Mandiri");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("125-00-1122334-5");
  const [bankAccountName, setBankAccountName] = useState<string>("PT. Exven Mitra Solusindo");

  // Signers
  const [signerFirstName, setSignerFirstName] = useState<string>("Hendra SITAC");
  const [signerFirstTitle, setSignerFirstTitle] = useState<string>("Project Manager PT. Exven Mitra Solusindo");
  const [signerSecondName, setSignerSecondName] = useState<string>("Kelolakan (Project Director)");
  const [signerSecondTitle, setSignerSecondTitle] = useState<string>("Director of Rollout Management");
  const [docStatus, setDocStatus] = useState<"DRAFT" | "ISSUED" | "PAID" | "COMPLETED">("ISSUED");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculations for current form
  const formSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const formTaxAmount = useMemo(() => {
    return includeTax ? Math.round(formSubtotal * 0.11) : 0;
  }, [formSubtotal, includeTax]);

  const formTotal = useMemo(() => {
    return formSubtotal + formTaxAmount;
  }, [formSubtotal, formTaxAmount]);

  const formTerbilang = useMemo(() => {
    return terbilang(formTotal);
  }, [formTotal]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchType = filterType === "ALL" || doc.type === filterType;
      const matchProject = filterProject === "ALL" || doc.project_id === filterProject;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        doc.doc_number.toLowerCase().includes(query) ||
        doc.title.toLowerCase().includes(query) ||
        doc.recipient_company.toLowerCase().includes(query) ||
        doc.recipient_name.toLowerCase().includes(query);
      return matchType && matchProject && matchSearch;
    });
  }, [documents, filterType, filterProject, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let invoiceTotal = 0;
    let invoiceCount = 0;
    let bastCount = 0;
    let vendorTotal = 0;
    let vendorCount = 0;

    documents.forEach((d) => {
      if (d.type === "INVOICE") {
        invoiceTotal += d.total_amount;
        invoiceCount++;
      } else if (d.type === "BAST") {
        bastCount++;
      } else if (d.type === "VENDOR_PAYMENT") {
        vendorTotal += d.total_amount;
        vendorCount++;
      }
    });

    return { invoiceTotal, invoiceCount, bastCount, vendorTotal, vendorCount };
  }, [documents]);

  // Handle open editor for new document
  const handleOpenCreateModal = (type: DocumentType = "INVOICE") => {
    setEditingDocId(null);
    setDocType(type);
    setDocProjectId(activeProjectId || (projects[0]?.id ?? ""));
    setDocNumber(generateDocNumber(type, documents.length + 1));
    setDocDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
    setDocStatus("ISSUED");

    if (type === "INVOICE") {
      setTitle("Tagihan Termin Proyek FTTH");
      setRecipientName("Bapak Direktur Pengadaan / Finance");
      setRecipientCompany("PT. Fiber Media Nusantara (Client Operator)");
      setRecipientAddress("Cyber Building Lt. 8, Jl. Kuningan Barat No. 8, Jakarta Selatan");
      setRecipientPhone("021-52901234");
      setIncludeTax(true);
      setNotes(
        "Pembayaran mohon ditransfer ke Bank Mandiri KCP Cakung No. Rek: 125-00-1122334-5 a.n. PT. Exven Mitra Solusindo. Bukti pembayaran mohon diemail ke finance@exven.co.id."
      );
      setBankName("Bank Mandiri");
      setBankAccountNumber("125-00-1122334-5");
      setBankAccountName("PT. Exven Mitra Solusindo");
      setItems([
        {
          id: "item-1",
          description: "Pembayaran Termin Proyek Penggelaran FTTH Cluster Cakung",
          quantity: 1,
          unit: "Lot",
          unit_price: 135000000,
          amount: 135000000
        }
      ]);
      setSignerFirstName(userMember?.name || "Hendra SITAC");
      setSignerFirstTitle("Project Manager PT. Exven Mitra Solusindo");
      setSignerSecondName("Kelolakan (Project Director)");
      setSignerSecondTitle("Director of Rollout Management");
    } else if (type === "BAST") {
      setTitle("Berita Acara Serah Terima Pekerjaan (BAST)");
      setRecipientName("Ir. Bambang Trihatmojo");
      setRecipientCompany("PT. Fiber Media Nusantara");
      setRecipientAddress("Cyber Building Lt. 8, Jl. Kuningan Barat No. 8, Jakarta Selatan");
      setRecipientPhone("021-52901234");
      setIncludeTax(false);
      setWorkScope(
        "Pekerjaan penarikan kabel feeder 96C, pemasangan ODC 144, dan pengujian redaman OTDR sesuai spesifikasi teknis kontrak."
      );
      setMilestonePct(50);
      setAtpRefNumber(`ATP-QC-${Date.now().toString().slice(-4)}/2026`);
      setNotes(
        "Pihak Pertama telah menyelesaikan pekerjaan dan menyerahkan kepada Pihak Kedua dalam kondisi baik, lengkap, dan memenuhi standar uji ATP."
      );
      setItems([
        {
          id: "bast-item-1",
          description: "Penarikan Kabel Fiber Feeder Udara 96C (Tiang 1 - 25)",
          quantity: 1200,
          unit: "Meter",
          unit_price: 65000,
          amount: 78000000
        },
        {
          id: "bast-item-2",
          description: "Instalasi, Grounding, & Terminasi ODC 144",
          quantity: 2,
          unit: "Unit",
          unit_price: 35000000,
          amount: 70000000
        }
      ]);
      setSignerFirstName("Rizky OSP Lead");
      setSignerFirstTitle("Manager FTTH Rollout PT. Exven Mitra Solusindo");
      setSignerSecondName("Ir. Bambang Trihatmojo");
      setSignerSecondTitle("Head of Project Delivery PT. Fiber Media Nusantara");
    } else {
      // VENDOR_PAYMENT
      setTitle("Voucher Pembayaran Vendor / Bukti Kas Keluar");
      setRecipientName("PT. Surya Optik Nusantara");
      setRecipientCompany("PT. Surya Optik Nusantara (Vendor Material)");
      setRecipientAddress("Kawasan Industri Pulo Gadung Blok C No. 12, Jakarta Timur");
      setRecipientPhone("021-46820011");
      setIncludeTax(false);
      setPaymentMethod("BANK_TRANSFER");
      setBankName("Bank BCA");
      setBankAccountNumber("542-0998877");
      setBankAccountName("PT. Surya Optik Nusantara");
      setNotes("Pembayaran lunas pembelian material kabel dan perlengkapan joint closure.");
      setItems([
        {
          id: "bkk-item-1",
          description: "Kabel Fiber Optik Aerial Feeder Single Mode 96C G.652D",
          quantity: 2,
          unit: "Drum",
          unit_price: 26000000,
          amount: 52000000
        }
      ]);
      setSignerFirstName("Finance PT. Exven Mitra Solusindo");
      setSignerFirstTitle("Disiapkan Oleh (Finance & Kasir)");
      setSignerSecondName("Kelolakan (Project Director)");
      setSignerSecondTitle("Disetujui Oleh (Project Director)");
    }

    setIsEditorOpen(true);
  };

  // Handle edit existing document
  const handleOpenEditModal = (doc: ProjectDocument) => {
    setEditingDocId(doc.id);
    setDocType(doc.type);
    setDocProjectId(doc.project_id);
    setDocNumber(doc.doc_number);
    setDocDate(doc.doc_date);
    setDueDate(doc.due_date || "");
    setTitle(doc.title);
    setRecipientName(doc.recipient_name);
    setRecipientCompany(doc.recipient_company);
    setRecipientAddress(doc.recipient_address || "");
    setRecipientPhone(doc.recipient_phone || "");
    setItems(doc.items && doc.items.length > 0 ? doc.items : []);
    setIncludeTax(doc.tax_percent > 0);
    setNotes(doc.notes || "");
    setWorkScope(doc.work_scope || "");
    setMilestonePct(doc.milestone_percentage || 50);
    setAtpRefNumber(doc.atp_ref_number || "");
    setPaymentMethod(doc.payment_method || "BANK_TRANSFER");
    setBankName(doc.bank_name || "");
    setBankAccountNumber(doc.bank_account_number || "");
    setBankAccountName(doc.bank_account_name || "");
    setSignerFirstName(doc.signer_first_name);
    setSignerFirstTitle(doc.signer_first_title);
    setSignerSecondName(doc.signer_second_name || "");
    setSignerSecondTitle(doc.signer_second_title || "");
    setDocStatus(doc.status);

    setIsEditorOpen(true);
  };

  // Line item handlers
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unit: "Lot",
        unit_price: 0,
        amount: 0
      }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      const q = field === "quantity" ? Number(value) : item.quantity;
      const p = field === "unit_price" ? Number(value) : item.unit_price;
      item.amount = (Number(q) || 0) * (Number(p) || 0);
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Submit save document
  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber || !title || !recipientCompany) {
      alert("Harap lengkapi nomor dokumen, judul, dan nama perusahaan penerima.");
      return;
    }

    setIsSubmitting(true);
    try {
      const docToSave: ProjectDocument = {
        id: editingDocId || `doc-${docType.toLowerCase()}-${Date.now()}`,
        project_id: docProjectId,
        type: docType,
        doc_number: docNumber,
        doc_date: docDate,
        due_date: dueDate,
        title,
        recipient_name: recipientName,
        recipient_company: recipientCompany,
        recipient_address: recipientAddress,
        recipient_phone: recipientPhone,
        subtotal: formSubtotal,
        tax_percent: includeTax ? 11 : 0,
        tax_amount: formTaxAmount,
        total_amount: formTotal,
        amount_in_words: formTerbilang,
        notes,
        work_scope: docType === "BAST" ? workScope : undefined,
        milestone_percentage: docType === "BAST" ? milestonePct : undefined,
        atp_ref_number: docType === "BAST" ? atpRefNumber : undefined,
        payment_method: docType === "VENDOR_PAYMENT" ? paymentMethod : undefined,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
        items,
        signer_first_name: signerFirstName,
        signer_first_title: signerFirstTitle,
        signer_second_name: signerSecondName,
        signer_second_title: signerSecondTitle,
        created_by: userMember?.email || "admin@exven.co.id",
        created_at: new Date().toISOString(),
        status: docStatus
      };

      await onSaveDocument(docToSave);
      setIsEditorOpen(false);
      setPreviewDoc(docToSave); // Automatically show print preview
    } catch (err: any) {
      alert("Gagal menyimpan dokumen: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Document
  const handleDelete = async (id: string, docNum: string) => {
    if (!window.confirm(`Hapus dokumen ${docNum} dari sistem?`)) return;
    try {
      await onDeleteDocument(id);
    } catch (err: any) {
      alert("Gagal menghapus dokumen: " + err.message);
    }
  };

  // Trigger Native Print Dialog
  const handleTriggerPrint = () => {
    window.print();
  };

  const getProjectName = (pid: string) => {
    const p = projects.find((prj) => prj.id === pid);
    return p ? p.name : "Proyek FTTH";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white shrink-0">
              <FileCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Dokumen & Administrasi Proyek Resmi</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Kop PT. Exven
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Penerbitan dan cetak Invoice Klien, Berita Acara Serah Terima (BAST), dan Voucher Pembayaran Vendor berstandar resmi.
              </p>
            </div>
          </div>

          {/* Quick Actions Dropdown / Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal("INVOICE")}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Invoice</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal("BAST")}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat BAST</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal("VENDOR_PAYMENT")}
              className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Voucher Vendor</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-800">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total Invoice Klien ({metrics.invoiceCount})
              </span>
              <span className="text-base font-black text-emerald-400 mt-0.5 block">
                {formatIDR(metrics.invoiceTotal)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                BAST Serah Terima
              </span>
              <span className="text-base font-black text-white mt-0.5 block">
                {metrics.bastCount} Dokumen Diterbitkan
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Pembayaran ke Vendor ({metrics.vendorCount})
              </span>
              <span className="text-base font-black text-amber-400 mt-0.5 block">
                {formatIDR(metrics.vendorTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Toggle Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Dokumen ({documents.length})
          </button>

          <button
            onClick={() => setFilterType("INVOICE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "INVOICE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Invoice ({metrics.invoiceCount})
          </button>

          <button
            onClick={() => setFilterType("BAST")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "BAST"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            BAST ({metrics.bastCount})
          </button>

          <button
            onClick={() => setFilterType("VENDOR_PAYMENT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "VENDOR_PAYMENT"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Voucher Vendor ({metrics.vendorCount})
          </button>
        </div>

        {/* Search & Project Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no surat, klien, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.length > 30 ? p.name.slice(0, 30) + "..." : p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocuments.map((doc) => {
          const isInvoice = doc.type === "INVOICE";
          const isBast = doc.type === "BAST";
          const isVendor = doc.type === "VENDOR_PAYMENT";

          const badgeColor = isInvoice
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : isBast
            ? "bg-indigo-100 text-indigo-800 border-indigo-200"
            : "bg-amber-100 text-amber-800 border-amber-200";

          const typeLabel = isInvoice
            ? "Invoice Tagihan"
            : isBast
            ? "BAST Serah Terima"
            : "Voucher Kas Keluar";

          return (
            <div
              key={doc.id}
              className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-3xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                    {typeLabel}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">
                    {doc.doc_number}
                  </span>
                </div>

                {/* Title & Project */}
                <div className="mt-3.5 space-y-1">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 block truncate">
                    Proyek: {getProjectName(doc.project_id)}
                  </span>
                </div>

                {/* Recipient Details */}
                <div className="mt-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{doc.recipient_company}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.recipient_name}</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Total Nilai Dokumen:</span>
                  <span className="text-base font-black text-slate-900">
                    {formatIDR(doc.total_amount)}
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{doc.doc_date}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600 text-[10px]">
                    {doc.status}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Lihat & Cetak A4</span>
                </button>

                {isAuthorized && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
                      title="Edit Dokumen"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.doc_number)}
                      className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Belum Ada Dokumen yang Cocok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ditemukan dokumen sesuai filter. Silakan klik tombol di atas untuk menerbitkan Invoice, BAST, atau Voucher Vendor baru.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORM EDITOR (INVOICE, BAST, PAYMENT VOUCHER) */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-up">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingDocId ? "Edit Dokumen Proyek" : "Penerbitan Dokumen Resmi Baru"}
                  </h2>
                  <p className="text-xs text-slate-500">PT. Exven Mitra Solusindo & Kelolakan</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDocument} className="space-y-6 pt-5">
              {/* Step 1: Select Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Jenis Dokumen:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal("INVOICE")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      docType === "INVOICE"
                        ? "bg-emerald-50/60 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Receipt className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="font-bold text-xs block">Invoice Tagihan Klien</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Penagihan termin DP & milestone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal("BAST")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      docType === "BAST"
                        ? "bg-indigo-50/60 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <FileCheck className="w-5 h-5 text-indigo-600 mb-1" />
                    <span className="font-bold text-xs block">BAST Serah Terima</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Serah terima hasil uji fisik/ATP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal("VENDOR_PAYMENT")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      docType === "VENDOR_PAYMENT"
                        ? "bg-amber-50/60 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="font-bold text-xs block">Voucher Pembayaran Vendor</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Bukti kas keluar material & subkon</span>
                  </button>
                </div>
              </div>

              {/* General Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Dokumen</label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Dokumen</label>
                  <input
                    type="date"
                    required
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {docType === "INVOICE" ? "Jatuh Tempo Pembayaran" : "Status Dokumen"}
                  </label>
                  {docType === "INVOICE" ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  ) : (
                    <select
                      value={docStatus}
                      onChange={(e) => setDocStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ISSUED">DITERBITKAN (ISSUED)</option>
                      <option value="PAID">LUNAS (PAID)</option>
                      <option value="COMPLETED">SELESAI (COMPLETED)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Title & Project context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Dokumen / Perihal</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Tagihan Termin 1 (DP 30%) Proyek FTTH Cakung"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proyek Terkait</label>
                  <select
                    value={docProjectId}
                    onChange={(e) => setDocProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {docType === "VENDOR_PAYMENT" ? "Informasi Vendor / Penerima Pembayaran" : "Informasi Klien / Pemberi Kerja"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Perusahaan / Instansi</label>
                    <input
                      type="text"
                      required
                      value={recipientCompany}
                      onChange={(e) => setRecipientCompany(e.target.value)}
                      placeholder="Contoh: PT. Fiber Media Nusantara"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Kontak / Penanggung Jawab</label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Contoh: Bapak Ir. Bambang Trihatmojo"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Alamat Kantor / Operasional</label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Contoh: Cyber Building Lt. 8, Jakarta Selatan"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Telepon / Kontak</label>
                    <input
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="021-52901234"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* BAST Specific Fields */}
              {docType === "BAST" && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Kelengkapan Serah Terima & ATP Lapangan
                  </h3>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Uraian Lingkup Pekerjaan Fisik</label>
                    <textarea
                      rows={2}
                      value={workScope}
                      onChange={(e) => setWorkScope(e.target.value)}
                      placeholder="Jelaskan volume tiang, kabel feeder/distribusi, ODC, FAT yang telah terpasang dan lulus uji..."
                      className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Milestone Pekerjaan (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={milestonePct}
                        onChange={(e) => setMilestonePct(Number(e.target.value))}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Referensi Uji ATP</label>
                      <input
                        type="text"
                        value={atpRefNumber}
                        onChange={(e) => setAtpRefNumber(e.target.value)}
                        placeholder="ATP-QC-CKG-004/2026"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor Payment Specific Fields */}
              {docType === "VENDOR_PAYMENT" && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Instruksi Pembayaran ke Vendor / Subkon
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Metode Bayar</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                      >
                        <option value="BANK_TRANSFER">Transfer Bank</option>
                        <option value="CASH">Kas Tunai</option>
                        <option value="GIRO">Cek / Giro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Tujuan</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Contoh: Bank BCA / Mandiri"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">No. Rekening Vendor</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="Contoh: 542-0998877"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rincian Pos Tagihan / Pekerjaan
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={it.id || idx} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          required
                          placeholder="Deskripsi item pekerjaan atau material..."
                          value={it.description}
                          onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          min={1}
                          placeholder="Vol"
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                          className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-center text-slate-900 focus:outline-none focus:border-indigo-500"
                        />

                        <input
                          type="text"
                          placeholder="Satuan"
                          value={it.unit}
                          onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)}
                          className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-center text-slate-900 focus:outline-none focus:border-indigo-500"
                        />

                        <input
                          type="number"
                          placeholder="Harga Satuan"
                          value={it.unit_price}
                          onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                          className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-right text-slate-900 focus:outline-none focus:border-indigo-500"
                        />

                        <span className="w-28 text-right font-mono font-bold text-xs text-slate-800 pr-1">
                          {formatIDR(it.amount)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                          title="Hapus baris"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculations Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatIDR(formSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ppnToggle"
                      checked={includeTax}
                      onChange={(e) => setIncludeTax(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <label htmlFor="ppnToggle" className="text-slate-700 font-semibold cursor-pointer">
                      Kenakan Pajak Pertambahan Nilai (PPN 11%)
                    </label>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{formatIDR(formTaxAmount)}</span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-300 font-bold">
                  <span className="text-slate-900">Total Tagihan / Pembayaran:</span>
                  <span className="font-mono text-base text-indigo-700">{formatIDR(formTotal)}</span>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="font-semibold text-slate-700">Terbilang: </span>
                  {formTerbilang}
                </div>
              </div>

              {/* Signers and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan / Instruksi</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruksi nomor rekening bank atau ketentuan pengujian..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pihak 1 (Penandatangan PT. Exven)</label>
                    <input
                      type="text"
                      value={signerFirstName}
                      onChange={(e) => setSignerFirstName(e.target.value)}
                      placeholder="Nama & Jabatan Penandatangan 1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pihak 2 (Klien / Vendor / Direktur)</label>
                    <input
                      type="text"
                      value={signerSecondName}
                      onChange={(e) => setSignerSecondName(e.target.value)}
                      placeholder="Nama & Jabatan Penandatangan 2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:bg-slate-300"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan Dokumen..." : "Simpan & Pratinjau Cetak"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: OFFICIAL A4 LETTERHEAD PRINT PREVIEW (PRINT / PDF EXPORT) */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Action Bar at Top (Hidden on Print) */}
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-4 max-h-[96vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  Pratinjau Dokumen Cetak ({previewDoc.doc_number})
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">• Standar Kertas A4 Kop Resmi</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerPrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 PRINT CONTAINER */}
            <div id="official-document-print-sheet" className="p-6 sm:p-10 bg-white font-sans text-slate-900 border border-slate-200 sm:my-4 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0">
              {/* 1. KOP SURAT PERUSAHAAN (OFFICIAL LETTERHEAD) */}
              <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md">
                      EX
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                        PT. EXVEN MITRA SOLUSINDO
                      </h1>
                      <p className="text-xs font-bold text-indigo-700 tracking-wide">
                        TELECOMMUNICATION INFRASTRUCTURE & FTTH ROLLOUT CONTRACTOR
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Jl. Raya Cakung No. 45, Jakarta Timur | Telp: (021) 8899-7711 | Email: admin@exven.co.id
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Project Partner</span>
                    <span className="text-xs font-bold text-indigo-600 block">KELOLAKAN</span>
                    <span className="text-[10px] text-slate-400 block font-mono">proman.kelolakan.my.id</span>
                  </div>
                </div>
              </div>

              {/* 2. DOCUMENT HEADER TITLE & METADATA */}
              <div className="text-center mb-6">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-2 underline-offset-4">
                  {previewDoc.type === "INVOICE"
                    ? "INVOICE / FAKTUR PENAGIHAN"
                    : previewDoc.type === "BAST"
                    ? "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)"
                    : "BUKTI KAS KELUAR / PAYMENT VOUCHER"}
                </h2>
                <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                  Nomor: {previewDoc.doc_number}
                </p>
              </div>

              {/* 3. RECIPIENT & CONTEXT DETAILS */}
              <div className="grid grid-cols-2 gap-6 text-xs mb-6 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {previewDoc.type === "VENDOR_PAYMENT" ? "Dibayarkan Kepada (Vendor):" : "Ditujukan Kepada (Klien):"}
                  </span>
                  <p className="font-bold text-sm text-slate-900">{previewDoc.recipient_company}</p>
                  <p className="font-medium text-slate-700">Attn: {previewDoc.recipient_name}</p>
                  <p className="text-slate-500 leading-relaxed text-[11px]">{previewDoc.recipient_address}</p>
                  {previewDoc.recipient_phone && (
                    <p className="text-slate-500 text-[11px]">Telp: {previewDoc.recipient_phone}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tanggal Dokumen:</span>
                    <p className="font-bold text-slate-800">{previewDoc.doc_date}</p>
                  </div>
                  {previewDoc.due_date && previewDoc.type === "INVOICE" && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Jatuh Tempo:</span>
                      <p className="font-bold text-red-600">{previewDoc.due_date}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Proyek Terkait:</span>
                    <p className="font-bold text-slate-800 truncate max-w-xs ml-auto">
                      {getProjectName(previewDoc.project_id)}
                    </p>
                  </div>
                </div>
              </div>

              {/* BAST Special Scope Text */}
              {previewDoc.type === "BAST" && previewDoc.work_scope && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <p className="leading-relaxed text-slate-800">
                    Pada hari ini, bertempat di lokasi proyek, Pihak Pertama (<strong>PT. Exven Mitra Solusindo</strong>) telah menyerahkan hasil penyelesaian pekerjaan fisik kepada Pihak Kedua (<strong>{previewDoc.recipient_company}</strong>) dengan rincian kemajuan sebagai berikut:
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-medium text-slate-700 text-[11px] space-y-1">
                    <p>• <strong>Lingkup Fisik:</strong> {previewDoc.work_scope}</p>
                    <p>• <strong>Milestone Kemajuan:</strong> {previewDoc.milestone_percentage}% Selesai</p>
                    {previewDoc.atp_ref_number && (
                      <p>• <strong>No. Uji Kelaikan (ATP):</strong> {previewDoc.atp_ref_number}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. ITEMS TABLE */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-10">No</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Uraian Pekerjaan / Material</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Volume</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Satuan</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right w-32">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right w-36">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {previewDoc.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-medium leading-snug">
                          {it.description}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center">{it.quantity}</td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">{it.unit}</td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">
                          {formatIDR(it.unit_price)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatIDR(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 font-bold text-xs bg-slate-50/50">
                    <tr>
                      <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-200">
                        Subtotal:
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatIDR(previewDoc.subtotal)}</td>
                    </tr>
                    {previewDoc.tax_percent > 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-200">
                          PPN 11%:
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{formatIDR(previewDoc.tax_amount)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 text-slate-900 text-sm">
                      <td colSpan={5} className="py-2.5 px-3 text-right border-r border-slate-200 uppercase font-black">
                        Total {previewDoc.type === "INVOICE" ? "Tagihan" : "Nilai"}:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900">
                        {formatIDR(previewDoc.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 5. TERBILANG & INSTRUCTIONS */}
              <div className="mb-6 space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider">
                    Terbilang:
                  </span>
                  <p className="font-semibold text-slate-800 italic mt-0.5">
                    # {previewDoc.amount_in_words || terbilang(previewDoc.total_amount)} #
                  </p>
                </div>

                {previewDoc.notes && (
                  <div className="p-3 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                      Catatan & Instruksi Pembayaran:
                    </span>
                    <p className="leading-relaxed text-[11px]">{previewDoc.notes}</p>
                  </div>
                )}
              </div>

              {/* 6. SIGNATURE BLOCKS */}
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  {/* Pihak 1 */}
                  <div className="space-y-16">
                    <div>
                      <p className="font-semibold text-slate-500 text-[11px]">Dibuat & Diserahkan Oleh:</p>
                      <p className="font-bold text-slate-900">PT. EXVEN MITRA SOLUSINDO</p>
                    </div>
                    <div className="border-t border-slate-400 w-48 mx-auto pt-1.5">
                      <p className="font-bold text-slate-900">{previewDoc.signer_first_name}</p>
                      <p className="text-[10px] text-slate-500">{previewDoc.signer_first_title}</p>
                    </div>
                  </div>

                  {/* Pihak 2 */}
                  <div className="space-y-16">
                    <div>
                      <p className="font-semibold text-slate-500 text-[11px]">Diterima & Disetujui Oleh:</p>
                      <p className="font-bold text-slate-900 truncate">{previewDoc.recipient_company}</p>
                    </div>
                    <div className="border-t border-slate-400 w-48 mx-auto pt-1.5">
                      <p className="font-bold text-slate-900">{previewDoc.signer_second_name || previewDoc.recipient_name}</p>
                      <p className="text-[10px] text-slate-500">{previewDoc.signer_second_title || "Penanggung Jawab / Authorized"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
