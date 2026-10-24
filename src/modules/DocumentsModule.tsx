import React, { useState, useMemo,useEffect } from "react";
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
  ArrowRight,
  Upload,
  FileUp,
  Loader2,
  Wand2,
  CheckCheck,
  Info,
} from "lucide-react";
import { Project, ProjectDocument, DocumentType, DocumentItem, TeamMember, UserRole } from "../types";
import { formatIDR, terbilang, generateDocNumber, INITIAL_DOCUMENTS } from "../lib/documentUtils";
import { parseDocumentFile, type ParsedDocumentResult } from "../lib/documentParser";
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
    // Sinkronisasi filter dokumen dengan Project Aktif di header
  useEffect(() => {
    if (activeProjectId) {
      setFilterProject(activeProjectId);
    } else {
      setFilterProject("ALL");
    }
  }, [activeProjectId]);
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

  // invoice
  const [shipToCompany, setShipToCompany] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [shipToPhone, setShipToPhone] = useState("");
  const [siteList, setSiteList] = useState("");
  const [invoiceDivision, setInvoiceDivision] = useState<string>("Sales");

  // BAST specific
  const [siteName, setSiteName] = useState("");
  const [productType, setProductType] = useState("");
  const [regionalSite, setRegionalSite] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
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
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedDocumentResult | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>("");
  const [showParsedDetail, setShowParsedDetail] = useState<boolean>(false);
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

  // Dokumen terfilter
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
    resetParserPanel(); 
    setEditingDocId(null);
    setDocType(type);
    setDocProjectId(activeProjectId || (projects[0]?.id ?? ""));
    setDocNumber(generateDocNumber(type, documents.length + 1));
    setDocDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
    setDocStatus("ISSUED");
    setInvoiceDivision("Sales"); // Default value

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
    resetParserPanel();
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

    // Optional metadata fields
    setSiteName(doc.site_name || "");
    setProductType(doc.product_type || "");
    setRegionalSite(doc.regional_site || "");
    setPoNumber(doc.po_number || "");
    setPoDate(doc.po_date || "");
    setShipToCompany(doc.ship_to_company || "");
    setShipToAddress(doc.ship_to_address || "");
    setShipToPhone(doc.ship_to_phone || "");
    setSiteList(doc.site_list || "");
    setInvoiceDivision(doc.invoice_division || "Sales");

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
  const handleSubmitDocument = async (e: React.FormEvent <HTMLFormElement>) => {
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
        status: docStatus,
        site_name: docType === "BAST" ? siteName : undefined,
        product_type: docType === "BAST" ? productType : undefined,
        regional_site: docType === "BAST" ? regionalSite : undefined,
        po_number: docType === "BAST" ? poNumber : undefined,
        po_date: docType === "BAST" ? poDate : undefined,
        ship_to_company: docType === "INVOICE" ? shipToCompany : undefined,
        ship_to_address: docType === "INVOICE" ? shipToAddress : undefined,
        ship_to_phone: docType === "INVOICE" ? shipToPhone : undefined,
        site_list: docType === "INVOICE" ? siteList : undefined,
        invoice_division: docType === "INVOICE" ? invoiceDivision : undefined,
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

const applyParsedData = (parsed: ParsedDocumentResult) => {
  if (parsed.doc_type) setDocType(parsed.doc_type);
  if (parsed.doc_number) setDocNumber(parsed.doc_number);
  if (parsed.doc_date) setDocDate(parsed.doc_date);
  if (parsed.due_date) setDueDate(parsed.due_date);
  if (parsed.title) setTitle(parsed.title);
  if (parsed.recipient_name) setRecipientName(parsed.recipient_name);
  if (parsed.recipient_company) setRecipientCompany(parsed.recipient_company);
  if (parsed.recipient_address) setRecipientAddress(parsed.recipient_address);
  if (parsed.recipient_phone) setRecipientPhone(parsed.recipient_phone);
  if (parsed.notes) setNotes(parsed.notes);
  if (typeof parsed.include_tax === "boolean") setIncludeTax(parsed.include_tax);

  // BAST-specific
  if (parsed.work_scope) setWorkScope(parsed.work_scope);
  if (typeof parsed.milestone_percentage === "number")
    setMilestonePct(parsed.milestone_percentage);
  if (parsed.atp_ref_number) setAtpRefNumber(parsed.atp_ref_number);

  // Vendor-specific
  if (parsed.payment_method) setPaymentMethod(parsed.payment_method);
  if (parsed.bank_name) setBankName(parsed.bank_name);
  if (parsed.bank_account_number) setBankAccountNumber(parsed.bank_account_number);
  if (parsed.bank_account_name) setBankAccountName(parsed.bank_account_name);

  // Items — hanya timpa jika hasil parsing punya items
  if (parsed.items && parsed.items.length > 0) {
    setItems(parsed.items);
  }

  if (parsed.site_name) setSiteName(parsed.site_name);
  if (parsed.product_type) setProductType(parsed.product_type);
  if (parsed.regional_site) setRegionalSite(parsed.regional_site);
  if (parsed.po_number) setPoNumber(parsed.po_number);
  if (parsed.po_date) setPoDate(parsed.po_date);
  if (parsed.ship_to_company) setShipToCompany(parsed.ship_to_company);
  if (parsed.ship_to_address) setShipToAddress(parsed.ship_to_address);
};

const handleSmartUpload = async (file: File) => {
  setIsParsing(true);
  setParseError(null);
  setParsedPreview(null);
  setParsedFileName(file.name);

  try {
    const parsed = await parseDocumentFile(file, docType);
    setParsedPreview(parsed);
    applyParsedData(parsed);
  } catch (err: any) {
    setParseError(err?.message || "Gagal memproses dokumen.");
  } finally {
    setIsParsing(false);
  }
};

// Handler input change
const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // validasi ekstensi
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
    setParseError("Format tidak didukung. Gunakan PDF, DOCX, atau TXT.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setParseError("Ukuran file maksimal 10MB.");
    return;
  }
  void handleSmartUpload(file);
  // reset input supaya bisa upload file yang sama dua kali
  e.target.value = "";
};

// Reset panel parsing saat modal dibuka/tutup
const resetParserPanel = () => {
  setParsedPreview(null);
  setParseError(null);
  setParsedFileName("");
  setShowParsedDetail(false);
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
                onClick={() => {setIsEditorOpen(false); resetParserPanel();}}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDocument} className="space-y-6 pt-5">
              {!editingDocId && (
                <div className="p-4 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                        <Wand2 className="w-4.5 h-4.5" />
                      </div> */}
                      <div>
                        <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          Smart Auto-Fill
                          {/* <Sparkles className="w-3 h-3 text-violet-600" /> */}
                        </h3>
                        <p className="text-[11px] text-indigo-700/80 mt-0.5">
                          Upload PO, Invoice lama, atau Kontrak — form akan terisi otomatis.
                        </p>
                      </div>
                    </div>

                    {parsedPreview && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" />
                        Auto-filled
                      </span>
                    )}
                  </div>

                  {/* Drop zone */}
                  <label
                    htmlFor="smart-upload-input"
                    className={`flex flex-col items-center justify-center gap-2 w-full py-5 px-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                      isParsing
                        ? "border-indigo-400 bg-white/60 pointer-events-none"
                        : "border-indigo-300 hover:border-indigo-500 hover:bg-white/70 bg-white/40"
                    }`}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <span className="text-xs font-bold text-indigo-700">
                          Menganalisis {parsedFileName || "dokumen"}...
                        </span>
                        <span className="text-[10px] text-indigo-500">Mohon tunggu sebentar</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-6 h-6 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-800">
                          Klik untuk upload / drop file di sini
                        </span>
                        <span className="text-[10px] text-indigo-500">
                          Format: PDF, DOCX, atau TXT (maks 10MB)
                        </span>
                      </>
                    )}
                    <input
                      id="smart-upload-input"
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                      onChange={handleFileInputChange}
                      disabled={isParsing}
                    />
                  </label>

                  {/* Error */}
                  {parseError && (
                    <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-red-700 font-medium">{parseError}</span>
                    </div>
                  )}

                  {/* Preview hasil parsing */}
                  {parsedPreview && (
                    <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Info className="w-3 h-3 text-indigo-600" />
                          Berhasil ekstrak data
                        </span>
                        {/* {typeof parsedPreview.confidence === "number" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                            Confidence: {Math.round(parsedPreview.confidence * 100)}%
                          </span>
                        )} */}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {parsedPreview.doc_number && (
                          <div className="truncate">
                            <span className="text-slate-400">No:</span>{" "}
                            <span className="font-semibold text-slate-800">{parsedPreview.doc_number}</span>
                          </div>
                        )}
                        {parsedPreview.recipient_company && (
                          <div className="truncate">
                            <span className="text-slate-400">Penerima:</span>{" "}
                            <span className="font-semibold text-slate-800">
                              {parsedPreview.recipient_company}
                            </span>
                          </div>
                        )}
                        {parsedPreview.items && (
                          <div>
                            <span className="text-slate-400">Items:</span>{" "}
                            <span className="font-semibold text-slate-800">
                              {parsedPreview.items.length} baris
                            </span>
                          </div>
                        )}
                        {parsedPreview.doc_date && (
                          <div>
                            <span className="text-slate-400">Tanggal:</span>{" "}
                            <span className="font-semibold text-slate-800">{parsedPreview.doc_date}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowParsedDetail((v) => !v)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        {showParsedDetail ? "Sembunyikan detail" : "Lihat detail teks mentah"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showParsedDetail ? "rotate-180" : ""}`} />
                      </button>

                      {showParsedDetail && parsedPreview.raw_text_preview && (
                        <pre className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                          {parsedPreview.raw_text_preview}
                        </pre>
                      )}

                      <button
                        type="button"
                        onClick={() => applyParsedData(parsedPreview)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        Terapkan Ulang ke Form
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              {/* Input Khusus Invoice (Ship To) */}
                {docType === "INVOICE" && (
                <div className="space-y-4">
                  {/* DROPDOWN DIVISI INVOICE */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Divisi Penerbit Invoice</h3>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Divisi</label>
                      <select
                        value={invoiceDivision}
                        onChange={(e) => setInvoiceDivision(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Sales">Sales</option>
                        <option value="Engineering">tech</option>
                        <option value="Operations">Marketing</option>
                        <option value="Finance">Design</option>
                        <option value="Human Resources">HR</option>
                        <option value="Management">Finance</option>
                        <option value="Management">Admin</option>
                        <option value="Management">Operational</option>
                      </select>
                    </div>
                  </div>

                  {/* SHIP TO (EXVEN) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ship To (Pengirim / PT. Exven)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Perusahaan</label>
                          <input type="text" value={shipToCompany} onChange={(e) => setShipToCompany(e.target.value)} placeholder="PT. EXVEN MITRA SOLUSINDO" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Alamat</label>
                          <input type="text" value={shipToAddress} onChange={(e) => setShipToAddress(e.target.value)} placeholder="Epicentrum Walk..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                          <input type="text" value={shipToPhone} onChange={(e) => setShipToPhone(e.target.value)} placeholder="021-5682703" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* BILL TO (KLIEN) */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bill To (Penerima Tagihan / Klien)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Perusahaan Klien</label>
                          <input type="text" value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} placeholder="PT.BAISELINDO ASA NETWORK" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attn / Kontak</label>
                          <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Dept Procurement" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Alamat Klien</label>
                          <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="Gedung Menara Duta..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Khusus BAST (Info Site & PO) */}
                {docType === "BAST" && (
                <div className="space-y-4">
                  {/* Info Site & PO */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Informasi Site & PO</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Site</label>
                        <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Garut – Cibatu Jabar" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipe Produk / Termin</label>
                        <input type="text" value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="Service Instalasi..." className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Regional Site</label>
                        <input type="text" value={regionalSite} onChange={(e) => setRegionalSite(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor PO</label>
                        <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO/CSA/26/P003438" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal PO</label>
                        <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan BAST */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Penandatangan (Pihak 1 & Pihak 2)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pihak 1 */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-800">Pihak 1 (PT. Exven Mitra Solusindo)</p>
                        <input type="text" value={signerFirstName} onChange={(e) => setSignerFirstName(e.target.value)} placeholder="Nama Lengkap" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                        <input type="text" value={signerFirstTitle} onChange={(e) => setSignerFirstTitle(e.target.value)} placeholder="Jabatan (Cth: General Manager)" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                      {/* Pihak 2 */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-800">Pihak 2 (Klien / CSA)</p>
                        <input type="text" value={signerSecondName} onChange={(e) => setSignerSecondName(e.target.value)} placeholder="Nama Lengkap" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                        <input type="text" value={signerSecondTitle} onChange={(e) => setSignerSecondTitle(e.target.value)} placeholder="Jabatan (Cth: Area Project)" className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

              {/* BAST Specific Fields
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
              )} */}

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
              {docType !== "BAST" && (
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
                            placeholder="Deskripsi item / Site List..."
                            value={it.description}
                            onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {/* Tampilkan Qty & Satuan & Harga hanya jika BUKAN Invoice */}
                          {docType !== "INVOICE" && (
                            <>
                              <input type="number" min={1} placeholder="Vol" value={it.quantity} onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)} className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-center" />
                              <input type="text" placeholder="Satuan" value={it.unit} onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)} className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-center" />
                              <input type="number" placeholder="Harga" value={it.unit_price} onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)} className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-right" />
                            </>
                          )}

                          {/* Input Total / Amount (Selalu ada) */}
                          <input 
                            type="number"
                            placeholder="Total Rp"
                            value={it.amount}
                            onChange={(e) => {
                                // Khusus invoice, update amount langsung
                                if(docType === "INVOICE") {
                                    const updated = [...items];
                                    updated[idx].amount = Number(e.target.value);
                                    updated[idx].unit_price = Number(e.target.value);
                                    setItems(updated);
                                } else {
                                    handleUpdateItem(idx, "amount", e.target.value)
                                }
                            }}
                            className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-right"
                          />

                          <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculations Box */}
              {docType !== "BAST" && (
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
              )}

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
                        {/* A4 PRINT CONTAINER */}
            <div id="official-document-print-sheet" className="p-6 sm:p-10 bg-white font-sans text-slate-900 border border-slate-200 sm:my-4 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0">
              
              {/* ========================================================================= */}
              {/* 1. LAYOUT INVOICE (Persis Gambar Referensi Sales Invoice)                 */}
              {/* ========================================================================= */}
              {previewDoc.type === "INVOICE" && (
                <div className="text-[13px]">
                  {/* Header: Logo & Title */}
                  <div className="flex justify-between items-start mb-6">
                    {/* Placeholder Logo Exven (Warna-warni) */}
                    <div className="flex items-center">
                      <div className="flex text-4xl font-black tracking-tighter">
                        <span className="text-red-500">E</span>
                        <span className="text-green-500">x</span>
                        <span className="text-yellow-500">v</span>
                        <span className="text-blue-500">e</span>
                        <span className="text-indigo-600">n</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        {previewDoc.invoice_division || "Sales"} Invoice
                      </h2>
                    </div>
                  </div>

                  {/* Top Right Boxes (Date, Invoice, PO) */}
                  <div className="flex justify-end mb-6">
                    <div className="w-64 border border-slate-400 text-xs">
                      <div className="flex border-b border-slate-400">
                        <div className="w-20 py-1 px-2 bg-slate-50 text-slate-500">Date</div>
                        <div className="flex-1 py-1 px-2">{previewDoc.doc_date}</div>
                      </div>
                      <div className="flex border-b border-slate-400">
                        <div className="w-20 py-1 px-2 bg-slate-50 text-slate-500">Invoice #</div>
                        <div className="flex-1 py-1 px-2 font-bold">{previewDoc.doc_number}</div>
                      </div>
                      <div className="flex">
                        <div className="w-20 py-1 px-2 bg-slate-50 text-slate-500">Purchase Order #</div>
                        <div className="flex-1 py-1 px-2">{previewDoc.po_number || "PO/2026"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Ship To & Bill To */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-bold text-xs mb-1">Ship To:</h3>
                      <div className="border-b border-slate-400 w-full mb-2"></div>
                      <p className="font-bold text-xs">{previewDoc.ship_to_company || "PT. EXVEN MITRA SOLUSINDO"}</p>
                      <p className="text-xs whitespace-pre-line text-slate-600">{previewDoc.ship_to_address}</p>
                      <p className="text-xs text-slate-600">Phone: {previewDoc.ship_to_phone}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-xs mb-1">Bill To:</h3>
                      <div className="border-b border-slate-400 w-full mb-2"></div>
                      <p className="text-xs">{previewDoc.recipient_name}</p>
                      <p className="font-bold text-xs">{previewDoc.recipient_company}</p>
                      <p className="text-xs whitespace-pre-line text-slate-600">{previewDoc.recipient_address}</p>
                    </div>
                  </div>

                  {/* Tabel Harga Utama */}
                  <table className="w-full text-left text-xs mb-6">
                    <thead>
                      <tr>
                        <th className="py-2 font-bold border-b-2 border-slate-400">Description</th>
                        <th className="py-2 font-bold border-b-2 border-slate-400 text-right w-40">Line Total (IDR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewDoc.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 border-b border-slate-300 whitespace-pre-line">{it.description}</td>
                          <td className="py-2 border-b border-slate-300 text-right font-mono">{formatIDR(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Area Bawah: Site List & Kalkulasi */}
                  <div className="flex justify-between items-start gap-8 mb-12">
                    {/* Site List Box (Kiri) */}
                    <div className="w-1/2">
                      {previewDoc.site_list ? (
                        <div className="border border-slate-400 p-2">
                          <h4 className="font-bold text-xs text-center border-b border-slate-400 pb-1 mb-1">Site List</h4>
                          <table className="w-full text-[10px]">
                            <tbody>
                              {previewDoc.site_list.split('\n').map((site, idx) => (
                                <tr key={idx}>
                                  <td className="py-0.5 px-1 w-5 align-top font-bold">{idx + 1}</td>
                                  <td className="py-0.5 px-1 font-mono">{site.replace(/^\d+[\.\)]\s*/, '')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <div />}
                    </div>

                    {/* Kalkulasi (Kanan) */}
                    <div className="w-1/2">
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="py-1 px-2 text-left font-bold text-slate-600">SUB TOTAL</td>
                            <td className="py-1 px-2 text-right font-mono">{formatIDR(previewDoc.subtotal)}</td>
                          </tr>
                          {previewDoc.tax_percent > 0 && (
                            <tr>
                              <td className="py-1 px-2 text-left font-bold text-slate-600">PPN {previewDoc.tax_percent} %</td>
                              <td className="py-1 px-2 text-right font-mono">{formatIDR(previewDoc.tax_amount)}</td>
                            </tr>
                          )}
                          <tr className="border-t border-slate-400">
                            <td className="py-1 px-2 text-left font-bold">TOTAL</td>
                            <td className="py-1 px-2 text-right font-mono font-bold">{formatIDR(previewDoc.total_amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signature Area */}
                  <div className="mt-16 flex justify-start pl-8">
                    <div className="text-center">
                      {/* Placeholder Stempel */}
                      <div className="mb-2 text-red-500/30 text-xs italic">Stempel & Tanda Tangan</div>
                      <div className="border-t border-slate-400 w-48 pt-1 mx-auto">
                        <p className="font-bold text-xs underline">{previewDoc.signer_first_name}</p>
                        <p className="text-[10px] text-slate-600">PT. EXVEN MITRA SOLUSINDO</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. LAYOUT BAST (Persis Gambar Referensi CSA)                              */}
              {/* ========================================================================= */}
              {previewDoc.type === "BAST" && (
                <div className="text-[13px] text-slate-900 leading-relaxed font-sans">
                  {/* Header Logo CSA */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                       {/* Placeholder Logo CSA */}
                       <div className="text-3xl font-black text-blue-900 tracking-tighter">CSA</div>
                       <div className="text-[8px] leading-tight text-blue-900 font-semibold max-w-[80px]">Ciptajaya Sejahtera Abadi</div>
                    </div>
                    <div className="text-xs text-slate-700">PM.01.01-HR/Rev.00</div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-base font-bold underline decoration-1 underline-offset-4 uppercase">BERITA ACARA SERAH TERIMA (BAST)</h2>
                  </div>

                  {/* Info Atas */}
                  <div className="mb-6 space-y-1 text-sm">
                    <div className="grid grid-cols-[160px_10px_1fr]">
                      <span>Nama Site (Site Name)</span><span>:</span><span>{previewDoc.site_name}</span>
                    </div>
                    <div className="grid grid-cols-[160px_10px_1fr]">
                      <span>Tipe Produk / Termin</span><span>:</span><span>{previewDoc.product_type}</span>
                    </div>
                    <div className="grid grid-cols-[160px_10px_1fr]">
                      <span>Regional Site</span><span>:</span><span>{previewDoc.regional_site}</span>
                    </div>
                    <div className="grid grid-cols-[160px_10px_1fr] mt-4">
                      <span className="text-right pr-2">No.</span><span>:</span><span>{previewDoc.doc_number}</span>
                    </div>
                  </div>

                  <p className="mb-4 text-sm">Kami yang bertanda tangan di bawah ini:</p>

                  {/* Pihak 1 & 2 */}
                  <div className="mb-6 space-y-4 text-sm">
                    <div>
                      <div className="grid grid-cols-[160px_10px_1fr]">
                        <span className="text-right pr-2">1. Nama</span><span>:</span><span>{previewDoc.signer_first_name}</span>
                      </div>
                      <div className="grid grid-cols-[160px_10px_1fr]">
                        <span className="text-right pr-2">Jabatan</span><span>:</span><span>{previewDoc.signer_first_title}</span>
                      </div>
                      <p className="mt-1 pl-4">Dalam hal ini bertindak untuk dan atas nama <strong>PT. Exven Mitra Solusindo</strong>, selanjutnya disebut <strong>Mitra</strong>.</p>
                    </div>
                    <div>
                      <div className="grid grid-cols-[160px_10px_1fr]">
                        <span className="text-right pr-2">2. Nama</span><span>:</span><span>{previewDoc.signer_second_name}</span>
                      </div>
                      <div className="grid grid-cols-[160px_10px_1fr]">
                        <span className="text-right pr-2">Jabatan</span><span>:</span><span>{previewDoc.signer_second_title}</span>
                      </div>
                      <p className="mt-1 pl-4">Dalam hal ini bertindak untuk dan atas nama <strong>{previewDoc.recipient_company}</strong></p>
                    </div>
                  </div>

                  <p className="font-bold mb-2 text-sm">Berdasarkan :</p>
                  <div className="mb-6 space-y-1 text-sm">
                    <p>1. PO <em>(Purchase Order)</em></p>
                    <div className="grid grid-cols-[160px_10px_1fr] pl-4">
                      <span className="text-right pr-2">a. Nama Site</span><span>:</span><span>{previewDoc.site_name}</span>
                    </div>
                    <div className="grid grid-cols-[160px_10px_1fr] pl-4">
                      <span className="text-right pr-2">b. Nomor PO</span><span>:</span><span>{previewDoc.po_number}</span>
                    </div>
                    <div className="grid grid-cols-[160px_10px_1fr] pl-4">
                      <span className="text-right pr-2">c. Tanggal</span><span>:</span><span>{previewDoc.po_date}</span>
                    </div>
                  </div>

                  <p className="mb-2 text-sm text-justify">
                    <strong>{previewDoc.recipient_company} (CSA) dan Mitra</strong> telah melaksanakan dan menyelesaikan terhadap pekerjaan tersebut di atas dengan hasil sebagai berikut:
                  </p>
                  <ol className="list-decimal pl-8 mb-8 space-y-1 text-sm text-justify">
                    <li>Mitra telah menyelesaikan pekerjaan sesuai dengan jenisnya dengan baik kepada CSA sesuai dengan Kontrak/ PO dan termin yang berlaku</li>
                    <li>CSA telah melakukan pemeriksaan dan menerima hasil pekerjaan tersebut dalam kondisi baik, lengkap, dan sesuai spesifikasi.</li>
                  </ol>

                  <div className="text-right mb-12 pr-12 text-sm">
                    <p>Jakarta, {previewDoc.doc_date}</p>
                    <p className="font-bold mt-1">{previewDoc.recipient_company}</p>
                  </div>

                  {/* Tanda Tangan Bersebelahan */}
                  <div className="flex justify-between w-full pr-8 text-sm">
                    <div className="text-center w-1/2">
                      <div className="border-t border-slate-800 pt-1 w-48 mx-auto">
                        <p className="font-bold">{previewDoc.signer_first_name}</p>
                        <p className="text-[11px]">Jabatan: {previewDoc.signer_first_title}</p>
                      </div>
                    </div>
                    <div className="text-center w-1/2">
                      <div className="border-t border-slate-800 pt-1 w-48 mx-auto">
                        <p className="font-bold">{previewDoc.signer_second_name}</p>
                        <p className="text-[11px]">Jabatan: {previewDoc.signer_second_title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer CSA */}
                  <div className="mt-16 text-center text-[10px] text-slate-500">
                    © 2023 All Rights Reserved - PT. CIPTAJAYA SEJAHTERA ABADI
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 3. LAYOUT VENDOR (Tetap pakai kode lama Anda)                             */}
              {/* ========================================================================= */}
              {previewDoc.type === "VENDOR_PAYMENT" && (
                <div>
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
                    </div>
                  </div>

                  {/* 2. DOCUMENT HEADER TITLE */}
                  <div className="text-center mb-6">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-2 underline-offset-4">
                      BUKTI KAS KELUAR / PAYMENT VOUCHER
                    </h2>
                    <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                      Nomor: {previewDoc.doc_number}
                    </p>
                  </div>

                  {/* 3. RECIPIENT DETAILS */}
                  <div className="grid grid-cols-2 gap-6 text-xs mb-6 pb-4 border-b border-slate-200">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Dibayarkan Kepada (Vendor):
                      </span>
                      <p className="font-bold text-sm text-slate-900">{previewDoc.recipient_company}</p>
                      <p className="font-medium text-slate-700">Attn: {previewDoc.recipient_name}</p>
                      <p className="text-slate-500 leading-relaxed text-[11px]">{previewDoc.recipient_address}</p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Tanggal Dokumen:</span>
                        <p className="font-bold text-slate-800">{previewDoc.doc_date}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Proyek Terkait:</span>
                        <p className="font-bold text-slate-800 truncate max-w-xs ml-auto">
                          {getProjectName(previewDoc.project_id)}
                        </p>
                      </div>
                    </div>
                  </div>

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
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-medium leading-snug">{it.description}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center">{it.quantity}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">{it.unit}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">{formatIDR(it.unit_price)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{formatIDR(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-300 font-bold text-xs bg-slate-50/50">
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-200">Subtotal:</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIDR(previewDoc.subtotal)}</td>
                        </tr>
                        {previewDoc.tax_percent > 0 && (
                          <tr>
                            <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-200">PPN {previewDoc.tax_percent}%:</td>
                            <td className="py-2 px-3 text-right font-mono">{formatIDR(previewDoc.tax_amount)}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-100 text-slate-900 text-sm">
                          <td colSpan={5} className="py-2.5 px-3 text-right border-r border-slate-200 uppercase font-black">Total Nilai:</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900">{formatIDR(previewDoc.total_amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. NOTES */}
                  {previewDoc.notes && (
                    <div className="mb-6 p-3 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">Catatan:</span>
                      <p className="leading-relaxed text-[11px]">{previewDoc.notes}</p>
                    </div>
                  )}

                  {/* 6. SIGNATURE BLOCKS */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-8 text-center text-xs">
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
