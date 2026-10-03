import { DocumentType, ProjectDocument } from "../types";

/**
 * Currency Formatter for Indonesian Rupiah
 */
export function formatIDR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert number into formal Indonesian Terbilang words
 * Example: 135000000 -> "Seratus Tiga Puluh Lima Juta Rupiah"
 */
export function terbilang(n: number): string {
  if (isNaN(n) || n === 0) return "Nol Rupiah";
  
  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas"
  ];

  function konversi(x: number): string {
    if (x < 12) return satuan[x];
    if (x < 20) return konversi(x - 10) + " Belas";
    if (x < 100) return konversi(Math.floor(x / 10)) + " Puluh " + konversi(x % 10);
    if (x < 200) return "Seratus " + konversi(x - 100);
    if (x < 1000) return konversi(Math.floor(x / 100)) + " Ratus " + konversi(x % 100);
    if (x < 2000) return "Seribu " + konversi(x - 1000);
    if (x < 1000000) return konversi(Math.floor(x / 1000)) + " Ribu " + konversi(x % 1000);
    if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + " Juta " + konversi(x % 1000000);
    if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + " Miliar " + konversi(x % 1000000000);
    return konversi(Math.floor(x / 1000000000000)) + " Triliun " + konversi(x % 1000000000000);
  }

  const raw = konversi(Math.floor(Math.abs(n))).replace(/\s+/g, " ").trim();
  return `${raw} Rupiah`;
}

/**
 * Generate official corporate document numbering format
 */
export function generateDocNumber(type: DocumentType, index: number = 1): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const num = String(index).padStart(3, "0");

  switch (type) {
    case "INVOICE":
      return `INV/EXV/${year}/${month}/${num}`;
    case "BAST":
      return `BAST/EXV-KLK/${year}/${month}/${num}`;
    case "VENDOR_PAYMENT":
      return `BKK/EXV/${year}/${month}/${num}`;
    default:
      return `DOC/EXV/${year}/${month}/${num}`;
  }
}

/**
 * Seed initial sample documents for PT. Exven Mitra Solusindo
 */
export const INITIAL_DOCUMENTS: ProjectDocument[] = [
  {
    id: "doc-inv-01",
    project_id: "p-ftth-01",
    type: "INVOICE",
    doc_number: "INV/EXV/2026/06/001",
    doc_date: "2026-06-16",
    due_date: "2026-06-30",
    title: "Tagihan Termin 1 (Down Payment 30%) Proyek FTTH Cluster Cakung",
    recipient_name: "Bapak Direktur Pengadaan / Finance",
    recipient_company: "PT. Fiber Media Nusantara (Client Operator)",
    recipient_address: "Cyber Building Lt. 8, Jl. Kuningan Barat No. 8, Jakarta Selatan",
    recipient_phone: "021-52901234",
    subtotal: 135000000,
    tax_percent: 11,
    tax_amount: 14850000,
    total_amount: 149850000,
    amount_in_words: "Seratus Empat Puluh Sembilan Juta Delapan Ratus Lima Puluh Ribu Rupiah",
    notes: "Pembayaran mohon ditransfer ke Bank Mandiri KCP Cakung No. Rek: 125-00-1122334-5 a.n. PT. Exven Mitra Solusindo. Bukti pembayaran mohon diemail ke finance@exven.co.id.",
    payment_method: "BANK_TRANSFER",
    bank_name: "Bank Mandiri",
    bank_account_number: "125-00-1122334-5",
    bank_account_name: "PT. Exven Mitra Solusindo",
    items: [
      {
        id: "item-1",
        description: "Pembayaran Down Payment (DP 30%) Kontrak Penggelaran Jaringan FTTH 1.500 HP Cluster Cakung (Ref Kontrak: SPK-FTTH-098/FMN/2026)",
        quantity: 1,
        unit: "Lot",
        unit_price: 135000000,
        amount: 135000000,
      }
    ],
    signer_first_name: "Hendra SITAC",
    signer_first_title: "Project Manager PT. Exven Mitra Solusindo",
    signer_second_name: "Kelolakan (Project Director)",
    signer_second_title: "Director of Rollout Management",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-06-16T08:30:00.000Z",
    status: "PAID",
  },
  {
    id: "doc-bast-01",
    project_id: "p-ftth-01",
    type: "BAST",
    doc_number: "BAST/EXV-FMN/2026/07/002",
    doc_date: "2026-07-20",
    title: "Berita Acara Serah Terima Pekerjaan Milestone 50% Penggelaran Feeder & ODC",
    recipient_name: "Ir. Bambang Trihatmojo",
    recipient_company: "PT. Fiber Media Nusantara",
    recipient_address: "Cyber Building Lt. 8, Jl. Kuningan Barat No. 8, Jakarta Selatan",
    recipient_phone: "021-52901234",
    subtotal: 180000000,
    tax_percent: 0,
    tax_amount: 0,
    total_amount: 180000000,
    amount_in_words: "Seratus Delapan Puluh Juta Rupiah",
    work_scope: "Pekerjaan Penarikan Kabel Feeder Udara 96C sepanjang 1.2 KM (Tiang 1 s/d Tiang 25), Pemasangan & Terminasi 2 Unit Optical Distribution Cabinet (ODC 144), dan Pengujian Redaman OTDR (Rata-rata loss 0.18 dB/splice - Memenuhi Standar ATP).",
    milestone_percentage: 50,
    atp_ref_number: "ATP-QC-CKG-004/2026",
    notes: "Pihak Pertama telah menyelesaikan pekerjaan fisik milestone 50% sesuai spesifikasi teknis dan diserahkan kepada Pihak Kedua dalam kondisi baik serta berfungsi normal.",
    items: [
      {
        id: "bast-item-1",
        description: "Penarikan Kabel Fiber Feeder Udara 96C (Tiang 1 - 25)",
        quantity: 1200,
        unit: "Meter",
        unit_price: 65000,
        amount: 78000000,
      },
      {
        id: "bast-item-2",
        description: "Instalasi, Grounding, & Terminasi ODC 144 Kapasitas Penuh",
        quantity: 2,
        unit: "Unit",
        unit_price: 35000000,
        amount: 70000000,
      },
      {
        id: "bast-item-3",
        description: "Splicing Core, Uji OTDR, Power Meter Testing, & Berkas As-Built Drawing",
        quantity: 1,
        unit: "Lot",
        unit_price: 32000000,
        amount: 32000000,
      }
    ],
    signer_first_name: "Rizky OSP Lead",
    signer_first_title: "Manager FTTH Rollout PT. Exven Mitra Solusindo",
    signer_second_name: "Ir. Bambang Trihatmojo",
    signer_second_title: "Head of Project Delivery PT. Fiber Media Nusantara",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-07-20T11:00:00.000Z",
    status: "COMPLETED",
  },
  {
    id: "doc-bkk-01",
    project_id: "p-ftth-01",
    type: "VENDOR_PAYMENT",
    doc_number: "BKK/EXV/2026/06/003",
    doc_date: "2026-06-25",
    title: "Voucher Kas Keluar Pembayaran Pembelian Kabel Feeder 96C & Joint Closure",
    recipient_name: "PT. Surya Optik Nusantara",
    recipient_company: "PT. Surya Optik Nusantara (Vendor Material)",
    recipient_address: "Kawasan Industri Pulo Gadung Blok C No. 12, Jakarta Timur",
    recipient_phone: "021-46820011",
    subtotal: 65000000,
    tax_percent: 0,
    tax_amount: 0,
    total_amount: 65000000,
    amount_in_words: "Enam Puluh Lima Juta Rupiah",
    payment_method: "BANK_TRANSFER",
    bank_name: "Bank BCA",
    bank_account_number: "542-0998877",
    bank_account_name: "PT. Surya Optik Nusantara",
    notes: "Pembayaran Lunas untuk Invoice Vendor No: INV-SON-2026-88. Barang telah diterima lengkap dan diinspeksi oleh QA/QC Dimas pada tanggal 24 Juni 2026.",
    items: [
      {
        id: "bkk-item-1",
        description: "Kabel Fiber Optik Aerial Feeder Single Mode 96 Core G.652D (2 Drum @ 1000 M)",
        quantity: 2,
        unit: "Drum",
        unit_price: 26000000,
        amount: 52000000,
      },
      {
        id: "bkk-item-2",
        description: "Dome Joint Closure 96 Core + Aksesoris Bracket Tiang & Stainless Steel Band",
        quantity: 10,
        unit: "Set",
        unit_price: 1300000,
        amount: 13000000,
      }
    ],
    signer_first_name: "Finance PT. Exven Mitra Solusindo",
    signer_first_title: "Disiapkan Oleh (Finance & Kasir)",
    signer_second_name: "Kelolakan (Project Director)",
    signer_second_title: "Disetujui Oleh (Project Director)",
    created_by: "kelolakan@gmail.com",
    created_at: "2026-06-25T14:20:00.000Z",
    status: "PAID",
  }
];
