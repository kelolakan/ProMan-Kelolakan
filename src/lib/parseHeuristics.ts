// src/lib/parseHeuristics.ts
import type { DocumentType, DocumentItem } from "../types";
import type { ParsedDocumentResult } from "./documentParser";

/* ============================================================
 * 1. PARSER ANGKA RUPIAH
 * Menangani: 4.312.000 | 4,312,000 | 1.500.000,50 | 1500000
 * ============================================================ */
function parseIDRNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return isNaN(input) ? 0 : Math.round(input);

  let cleaned = String(input).replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return 0;

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  if (hasDot && hasComma) {
    if (cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")) {
      cleaned = cleaned.replace(/,/g, ""); // EN: 1,234.56
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(",", "."); // ID: 1.234,56
    }
  } else if (hasDot) {
    // ID ribuan: 4.312.000 → 4312000
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, ""); // EN ribuan
    } else {
      cleaned = cleaned.replace(",", ".");
    }
  }

  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

/* ============================================================
 * 2. NORMALISASI TANGGAL
 * ============================================================ */
const BULAN_ID: Record<string, string> = {
  jan: "01", januari: "01", january: "01",
  feb: "02", februari: "02", february: "02",
  mar: "03", maret: "03", march: "03",
  apr: "04", april: "04",
  mei: "05", may: "05",
  jun: "06", juni: "06", june: "06",
  jul: "07", juli: "07", july: "07",
  agu: "08", agustus: "08", aug: "08", august: "08",
  sep: "09", september: "09",
  okt: "10", oktober: "10", oct: "10", october: "10",
  nov: "11", november: "11",
  des: "12", desember: "12", dec: "12", december: "12",
};

function normalizeDate(input?: string): string | undefined {
  if (!input) return undefined;
  const s = String(input).trim();

  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const bln = BULAN_ID[m[2].toLowerCase()];
    if (bln) return `${m[3]}-${bln}-${m[1].padStart(2, "0")}`;
  }
  return undefined;
}

/* ============================================================
 * 3. DETEKSI TIPE DOKUMEN
 * ============================================================ */
function detectDocTypeWeighted(text: string, preferred?: DocumentType): DocumentType {
  const t = text.toLowerCase();
  let inv = 0, bast = 0, vch = 0;

  if (/invoice|faktur|tagihan|penagihan|billing/i.test(t)) inv += 3;
  if (/jatuh\s*tempo|due\s*date|payment\s*due/i.test(t)) inv += 2;
  if (/\bno\.?\s*po\b|purchase\s*order/i.test(t)) inv += 1;

  if (/berita\s*acara|\bbast\b|serah\s*terima/i.test(t)) bast += 5;
  if (/pihak\s*(pertama|kedua|1|2)/i.test(t)) bast += 3;
  if (/uji\s*(?:terima|kelaikan|fungsi)|\batp\b|acceptance\s*test/i.test(t)) bast += 3;
  if (/lingkup\s*pekerjaan|work\s*scope|milestone|kemajuan/i.test(t)) bast += 2;

  if (/voucher|bukti\s*kas\s*keluar|payment\s*voucher|kas\s*keluar/i.test(t)) vch += 5;
  if (/subkon|subkontraktor|supplier|pemasok/i.test(t)) vch += 2;

  const scores: Record<DocumentType, number> = { INVOICE: inv, BAST: bast, VENDOR_PAYMENT: vch };
  const maxScore = Math.max(inv, bast, vch);

  if (maxScore < 3) return preferred ?? "INVOICE";

  const winner = (Object.entries(scores).find(([, v]) => v === maxScore)?.[0] ?? "INVOICE") as DocumentType;
  if (preferred && scores[preferred] >= maxScore - 1) return preferred;
  return winner;
}

/* ============================================================
 * 4. FIELD EXTRACTORS — masing-masing fokus pada 1 field form
 * ============================================================ */

/** docNumber — contoh: "INV/2026/10/089" */
function extractDocNumber(text: string): string | undefined {
  // const patterns = [
  //   /no\.?\s*invoice\s*[:#.]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,40})/i,
  //   /invoice\s*(?:no|number|#)\s*[:#.]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,40})/i,
  //   /no\.?\s*(?:bast|voucher|dokumen|surat|po)\s*[:#.]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,40})/i,
  //   /(?:nomor|number)\s*[:#.]\s*([A-Z0-9][A-Z0-9\/\-.]{3,40})/i,
  // ];
  // for (const p of patterns) {
  //   const m = text.match(p);
  //   if (m?.[1]) return m[1].trim().replace(/[.,;:]+$/, "");
  // }
  // return undefined;

  const patterns = [
    /\b(\d{2,4}\/[A-Z]+\/[A-Z]+\/[A-Z]+\/\d{4})\b/i, // Format 113/EMS/INV/X/2026
    /no\.?\s*invoice\s*[:#.]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,40})/i,
    /invoice\s*(?:no|number|#)\s*[:#.]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,40})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

/** docDate — contoh: "8 Oktober 2026" → "2026-10-08" */
function extractDocDate(text: string): string | undefined {
  const patterns = [
    /tanggal\s*invoice\s*[:.]?\s*([^\n\r]{6,30})/i,
    /tanggal\s*(?:dokumen|surat|bast|voucher)?\s*[:.]?\s*([^\n\r]{6,30})/i,
    /(?:tgl|date|dikeluarkan|issued)\s*[:.]?\s*([^\n\r]{6,30})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const d = normalizeDate(m[1]);
      if (d) return d;
    }
  }
  // Fallback: cari tanggal Indonesia di seluruh teks
  const globalMatch = text.match(/(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4})/i);
  if (globalMatch) return normalizeDate(globalMatch[1]);
  return undefined;
}

/** dueDate — prioritas: "Jatuh tempo: ..." */
function extractDueDate(text: string): string | undefined {
  const patterns = [
    /jatuh\s*tempo\s*[:.]?\s*([^\n\r)]{6,30})/i,
    /due\s*date\s*[:.]?\s*([^\n\r)]{6,30})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const d = normalizeDate(m[1]);
      if (d) return d;
    }
  }
  return undefined;
}

/** title — prioritas: baris setelah judul dokumen */
function extractTitle(text: string, docType: DocumentType): string | undefined {
  // Prioritas 1: "Perihal: ..."
  const perihal = text.match(/(?:perihal|subject|hal|judul)\s*[:.]?\s*([^\n\r]{5,150})/i);
  if (perihal?.[1]) return perihal[1].trim().replace(/\s{2,}/g, " ");

  // Prioritas 2: baris ALL CAPS yang mengandung kata kunci dokumen
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const key = docType === "INVOICE" ? /invoice|faktur/i
    : docType === "BAST" ? /berita\s*acara|bast/i
    : /voucher|kas\s*keluar/i;

  for (const line of lines) {
    if (key.test(line) && line.length < 100) {
      // Buang tanda markdown (#) dan tanda kurung
      return line.replace(/^#+\s*/, "").replace(/[()]/g, "").trim();
    }
  }

  // Prioritas 3: baris pertama yang cukup panjang
  const fallback = lines.find((l) => l.length > 8 && l.length < 100 && !/^(PT|CV|Jl|Telp|Email)/i.test(l));
  return fallback?.slice(0, 100);
}

/** recipientCompany / Name / Address / Phone */
function extractRecipient(text: string): {
  company?: string;
  name?: string;
  address?: string;
  phone?: string;
} {
  const result: { company?: string; name?: string; address?: string; phone?: string } = {};
  const lines = text.split(/\r?\n/);

  // Cari label "Ditagihkan kepada / Ditujukan / Bill to / Penerima"
  const recipientLabelRe = /(?:ditagihkan\s*kepada|ditujukan\s*(?:kepada|ke)|bill\s*to|sold\s*to|dibayarkan\s*kepada|penerima|kepada\s*yd|kepada)\b[^:\n]*[:.]?\s*(.*)$/i;

  let recipientBlock = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(recipientLabelRe);
    if (m) {
      // Gabungkan baris ini + 3 baris setelahnya
      const blockLines = [m[1] || "", lines[i + 1] || "", lines[i + 2] || "", lines[i + 3] || ""];
      recipientBlock = blockLines.join("\n");
      break;
    }
  }

  const target = recipientBlock || text;

  // Perusahaan: PT / CV / UD ...
  const companyMatch = target.match(/\b(PT\.?\s+[A-Z][A-Z0-9.&]*(?:\s+[A-Z][A-Z0-9.&]*){0,5}|CV\.?\s+[A-Z][A-Za-z0-9.&]+(?:\s+[A-Z][A-Za-z0-9.&]+){0,5}|UD\.?\s+[A-Z][A-Za-z0-9.&]+)/);
  if (companyMatch) {
    // Potong kalau ada kata alamat nyempil
    result.company = companyMatch[0]
      .split(/\s+(?:Jl\.|Jalan|Kawasan|Blok|Ruko|Gedung|Building|Kompleks|Kp\.?)\b/)[0]
      .replace(/[,.\s]+$/, "")
      .trim()
      .slice(0, 80);
  }

  // Alamat: "Jl. ..." dari block recipient, atau global
  const addressMatch = target.match(/((?:Jl\.?|Jalan|Kawasan|Blok|Ruko|Gedung|Building|Kompleks)[^\n\r]{8,120})/i);
  if (addressMatch) result.address = addressMatch[1].trim();

  // Telepon: prioritaskan yang di block recipient, lalu global
  const phoneMatch = target.match(/(?:Telp|Tel|Telepon|Phone|HP|WA)\s*[:.]?\s*((?:\+?62|0|\(0)[\d\-\s()]{6,20})/i)
    || text.match(/(?:Telp|Tel|Telepon|Phone|HP|WA)\s*[:.]?\s*((?:\+?62|0|\(0)[\d\-\s()]{6,20})/i);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  // Nama kontak: Attn / UP / Bapak / Ibu
  const nameMatch = target.match(/(?:Attn|UP|u\.p\.?|Bapak|Ibu|Sdr\.?|Saudara)\s*[:.]?\s*([A-Z][A-Za-z.\s]{3,50})/i)
    || text.match(/(?:Attn|UP|u\.p\.?)\s*[:.]?\s*([A-Z][A-Za-z.\s]{3,50})/i);
  if (nameMatch?.[1]) result.name = nameMatch[1].trim().replace(/[,.\s]+$/, "").slice(0, 60);

  return result;
}

/** items[] — multi-pola. Output siap dimasukkan ke form. */
function extractItems(text: string): DocumentItem[] {
  const items: DocumentItem[] = [];
  const lines = text.split(/\r?\n/);

  const skipRe = /^(no\.?|deskripsi|uraian|item|barang|spesifikasi|qty|quantity|jumlah|satuan|unit|harga|total|amount|rincian|kalkulasi|instruksi|subtotal|sub\s*total|ppn|pajak|grand\s*total|terbilang|catatan|note)/i;

  const extractUnitFromDesc = (desc: string): { desc: string; unit: string } => {
    // Contoh: "Kertas HVS A4 80gr (Rim)" → { desc: "Kertas HVS A4 80gr", unit: "Rim" }
    const m = desc.match(/^(.*?)\s*\(([^)]{1,20})\)\s*$/);
    if (m && /^[A-Za-z\/\s]{2,20}$/.test(m[2])) {
      return { desc: m[1].trim(), unit: m[2].trim() };
    }
    return { desc, unit: "Unit" };
  };

  // Pola dengan satuan eksplisit: desc + qty + satuan + harga + total
  const reWithUnit =
    /^\s*(?:\d+[\.\)]\s*)?(.+?)\s+(\d+(?:[.,]\d+)?)\s+([A-Za-z]{2,12})\s+(?:Rp\.?\s*)?([\d.,]{2,})\s+(?:Rp\.?\s*)?([\d.,]{2,})\s*$/;

  // Pola tanpa satuan (unit ada di dalam kurung desc): desc (unit) + qty + Rp harga + Rp total
  const reNoUnit =
    /^\s*(?:\d+[\.\)]\s*)?(.+?\([^)]+\)|[^()]+?)\s+(\d+(?:[.,]\d+)?)\s+(?:Rp\.?\s*)?([\d.,]{2,})\s+(?:Rp\.?\s*)?([\d.,]{2,})\s*$/;

  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/^[•\-*]\s*/, "");
    if (!line || line.length < 12) continue;
    if (skipRe.test(line)) continue;
    // Harus ada minimal 2 grup angka di akhir
    if (!/[\d.,]{3,}\s*(?:Rp\.?\s*)?[\d.,]{3,}\s*$/.test(line) && !/Rp\.?\s*[\d.,]+\s+Rp\.?\s*[\d.,]+\s*$/.test(line)) continue;

    // Coba pola dengan satuan dulu
    let m = line.match(reWithUnit);
    if (m) {
      const qty = parseIDRNumber(m[2]);
      const unitPrice = parseIDRNumber(m[4]);
      const amount = parseIDRNumber(m[5]);
      if (qty > 0 && (unitPrice > 0 || amount > 0)) {
        items.push({
          id: `parsed-${items.length + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: m[1].trim().slice(0, 250),
          quantity: qty,
          unit: m[3],
          unit_price: unitPrice || (qty ? Math.round(amount / qty) : 0),
          amount: amount || qty * unitPrice,
        });
        continue;
      }
    }

    // Pola tanpa satuan (unit dalam kurung)
    m = line.match(reNoUnit);
    if (m) {
      const qty = parseIDRNumber(m[2]);
      const unitPrice = parseIDRNumber(m[3]);
      const amount = parseIDRNumber(m[4]);
      if (qty > 0 && amount > 0) {
        const { desc, unit } = extractUnitFromDesc(m[1].trim());
        items.push({
          id: `parsed-${items.length + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: desc.slice(0, 250),
          quantity: qty,
          unit,
          unit_price: unitPrice || Math.round(amount / qty),
          amount,
        });
      }
    }
  }

  // Fallback total — hanya kalau tidak ada item sama sekali
  if (items.length === 0) {
    const totalMatch = text.match(/(?:grand\s*total|total\s*(?:tagihan|nilai|bayar|amount)?|jumlah)\s*[:.]?\s*(?:Rp\.?\s*)?([\d.,]{4,})/i);
    if (totalMatch) {
      const total = parseIDRNumber(totalMatch[1]);
      if (total > 0) {
        items.push({
          id: `parsed-total-${Date.now()}`,
          description: "Nilai dari dokumen sumber (harap verifikasi manual)",
          quantity: 1,
          unit: "Lot",
          unit_price: total,
          amount: total,
        });
      }
    }
  }

  return items;
}

/** includeTax — cek keberadaan PPN */
function extractTaxFlag(text: string): boolean | undefined {
  if (/\b(ppn|pajak\s*pertambahan\s*nilai|vat)\b/i.test(text)) return true;
  if (/\b(non[\s-]*ppn|tanpa\s*pajak|exclude\s*tax)\b/i.test(text)) return false;
  return undefined;
}

/** notes — STOP di tanda tangan / tanggal / footer */
function extractNotes(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const notesRe = /^(?:catatan|note|keterangan|remarks)\s*[:.]?\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(notesRe);
    if (m) {
      const collected: string[] = [];
      if (m[1]) collected.push(m[1].trim());

      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const next = lines[j].trim();
        if (!next) break; // baris kosong → stop
        // Stop di tanda tangan / tanggal / nama perusahaan footer
        if (/^(?:hormat\s*kami|ttd|tanda\s*tangan|(?:[a-z]+,\s*)?\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}\s*$|finance\s*department|direktur|manager|pimpinan|\(.*\))/i.test(next)) break;
        if (/^(?:PT\.?|CV\.?|UD\.?)\s+/i.test(next) && collected.length > 0) break; // nama perusahaan footer
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*$/.test(next)) break;
        collected.push(next);
      }

      const joined = collected.join(" ").trim();
      if (joined.length >= 3) return joined.slice(0, 300);
    }
  }
  return undefined;
}

/** Bank info — untuk INVOICE & VENDOR_PAYMENT */
function extractBankInfo(text: string): {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  paymentMethod?: "BANK_TRANSFER" | "CASH" | "GIRO";
} {
  const out: { bankName?: string; accountNumber?: string; accountName?: string; paymentMethod?: "BANK_TRANSFER" | "CASH" | "GIRO" } = {};

  // Bank name: prioritas label, fallback regex nama bank
  const bankLabel = text.match(/nama\s*bank\s*[:.]?\s*([^\n\r]{3,60})/i)
    || text.match(/bank\s*(?:tujuan|penerima)?\s*[:.]?\s*([^\n\r]{3,60})/i);
  if (bankLabel?.[1]) {
    out.bankName = bankLabel[1].trim();
  } else {
    const bankName = text.match(/\b(Bank\s+(?:Mandiri|BCA|BRI|BNI|BJB|CIMB|Niaga|Permata|Danamon|Mega|Panin|OCBC|UOB|Maybank|Sinarmas|DKI|Jatim|Jateng|Nagari|Bukopin)[A-Za-z\s]{0,30})/i);
    if (bankName) out.bankName = bankName[1].trim();
  }

  // Account number: label "no. rekening" dulu, fallback pola nomor rekening
  const accLabel = text.match(/(?:no\.?\s*rek(?:ening)?|nomor\s*rek(?:ening)?|account\s*(?:no|number)|norek)\s*[:.]?\s*([\d\-\s.]{6,30})/i);
  if (accLabel?.[1]) out.accountNumber = accLabel[1].replace(/\s+/g, "").trim();
  else {
    const accFallback = text.match(/\b(\d{3}[\-.]?\d{2,3}[\-.]?\d{4,10}[\-.]?\d?)\b/);
    if (accFallback) out.accountNumber = accFallback[1];
  }

  // Account name: label "a.n. / atas nama"
  const accName = text.match(/(?:a\.?\s*n\.?|atas\s*nama|account\s*name)\s*[:.]?\s*([A-Z][A-Za-z0-9.,&()\s]{3,60})/i);
  if (accName?.[1]) out.accountName = accName[1].trim().replace(/[,.\s]+$/, "");

  // Payment method
  const t = text.toLowerCase();
  if (/\b(?:transfer|via\s*bank)/i.test(t)) out.paymentMethod = "BANK_TRANSFER";
  else if (/\b(?:giro|cek\b|cheque)/i.test(t)) out.paymentMethod = "GIRO";
  else if (/\b(?:tunai|cash|kas\s*tunai)/i.test(t)) out.paymentMethod = "CASH";

  return out;
}

/** BAST-specific fields */
function extractBastFields(text: string) {
  // const out: {
  //   workScope?: string;
  //   milestone?: number;
  //   atpRef?: string;
  // } = {};

  // // Work scope
  // const scopeMatch = text.match(/(?:lingkup\s*pekerjaan|uraian\s*pekerjaan|work\s*scope|scope\s*of\s*work)\s*[:.]?\s*([\s\S]{10,500}?)(?=\n\s*\n|\n\s*(?:milestone|kemajuan|atp|no\.?\s*atp|pihak|catatan|note))/i);
  // if (scopeMatch?.[1]) out.workScope = scopeMatch[1].trim().replace(/\s+/g, " ").slice(0, 400);

  // // Milestone
  // const milestone = text.match(/(?:milestone|kemajuan|progress|penyelesaian)\s*[:.]?\s*(\d{1,3})\s*%/i);
  // if (milestone) {
  //   const v = parseInt(milestone[1], 10);
  //   if (v >= 1 && v <= 100) out.milestone = v;
  // }

  // // ATP Ref
  // const atp = text.match(/(?:no\.?\s*atp|nomor\s*atp|atp\s*ref|acceptance\s*test\s*(?:no|number)?)\s*[:.]?\s*([A-Z0-9][A-Z0-9\-\/.]{3,40})/i)
  //   || text.match(/\bATP[-\/][A-Z0-9\-\/.]{3,40}/i);
  // if (atp) out.atpRef = atp[0].trim();

  // return out;

  const out: any = {};

  const siteMatch = text.match(/Nama Site\s*\(Site Name\)\s*:\s*([^\n]+)/i);
  if (siteMatch) out.site_name = siteMatch[1].trim();

  const typeMatch = text.match(/Tipe Produk \/ Termin\s*:\s*([^\n]+)/i);
  if (typeMatch) out.product_type = typeMatch[1].trim();

  const regionalMatch = text.match(/Regional Site\s*:\s*([^\n]+)/i);
  if (regionalMatch) out.regional_site = regionalMatch[1].trim();

  const poMatch = text.match(/Nomor PO\s*:\s*([^\n]+)/i);
  if (poMatch) out.po_number = poMatch[1].trim();

  const poDateMatch = text.match(/Tanggal\s*:\s*([^\n]+)/i); // Tanggal setelah PO
  if (poDateMatch) out.po_date = normalizeDate(poDateMatch[1]);

  // Penerima (Pihak Kedua) pada BAST
  const pihak2Match = text.match(/2\.\s*Nama\s*:.*?\n.*?Dalam hal ini bertindak untuk dan atas nama\s*([^\n]+)/i);
  if (pihak2Match) out.recipient_company = pihak2Match[1].trim();

  return out;
}

/* ============================================================
 * 5. HITUNG CONFIDENCE REALISTIS
 * ============================================================ */
function computeConfidence(r: ParsedDocumentResult): number {
  const checks: [boolean, number][] = [
    [!!r.doc_number, 1.2],
    [!!r.doc_date, 1.0],
    [!!r.due_date && r.doc_type === "INVOICE", 0.6],
    [!!r.title, 0.8],
    [!!r.recipient_company, 1.2],
    [!!r.recipient_address, 0.6],
    [!!r.recipient_name, 0.4],
    [(r.items?.length ?? 0) >= 1, 1.5],
    [(r.items?.length ?? 0) >= 2, 0.8],
    [!!r.bank_name, 0.5],
    [!!r.bank_account_number, 0.7],
    [!!r.notes, 0.5],
    [typeof r.include_tax === "boolean", 0.3],
    [!!r.work_scope, 0.6],
    [typeof r.milestone_percentage === "number", 0.4],
  ];
  const total = checks.reduce((s, [, w]) => s + w, 0);
  const earned = checks.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
  const ratio = earned / total;
  return Math.min(0.85, Math.max(0.3, 0.35 + ratio * 0.55));
}

/* ============================================================
 * 6. ENTRY POINT
 * ============================================================ */
export function heuristicParse(
  text: string,
  preferredType?: DocumentType
): ParsedDocumentResult {
  const result: ParsedDocumentResult = {};

  result.doc_type = detectDocTypeWeighted(text, preferredType);

  const docNum = extractDocNumber(text);
  if (docNum) result.doc_number = docNum;

  const docDate = extractDocDate(text);
  if (docDate) result.doc_date = docDate;

  const dueDate = extractDueDate(text);
  if (dueDate) result.due_date = dueDate;

  const title = extractTitle(text, result.doc_type);
  if (title) result.title = title;

  const recipient = extractRecipient(text);
  if (recipient.company) result.recipient_company = recipient.company;
  if (recipient.name) result.recipient_name = recipient.name;
  if (recipient.address) result.recipient_address = recipient.address;
  if (recipient.phone) result.recipient_phone = recipient.phone;

  const items = extractItems(text);
  if (items.length > 0) result.items = items;

  const taxFlag = extractTaxFlag(text);
  if (typeof taxFlag === "boolean") result.include_tax = taxFlag;

  const bank = extractBankInfo(text);
  if (bank.bankName) result.bank_name = bank.bankName;
  if (bank.accountNumber) result.bank_account_number = bank.accountNumber;
  if (bank.accountName) result.bank_account_name = bank.accountName;
  if (bank.paymentMethod) result.payment_method = bank.paymentMethod;

  const notes = extractNotes(text);
  if (notes) result.notes = notes;

  // if (result.doc_type === "BAST") {
  //   const b = extractBastFields(text);
  //   if (b.workScope) result.work_scope = b.workScope;
  //   if (typeof b.milestone === "number") result.milestone_percentage = b.milestone;
  //   if (b.atpRef) result.atp_ref_number = b.atpRef;
  // }

  if (result.doc_type === "BAST") {
    const b = extractBastFields(text);
    if (b.site_name) result.site_name = b.site_name;
    if (b.product_type) result.product_type = b.product_type;
    if (b.regional_site) result.regional_site = b.regional_site;
    if (b.po_number) result.po_number = b.po_number;
    if (b.po_date) result.po_date = b.po_date;
    if (b.recipient_company) result.recipient_company = b.recipient_company; // Override jika ada
  }

  if (result.doc_type === "INVOICE") {
    const shipToMatch = text.match(/Ship To:\s*([^\n]+)/i);
    if (shipToMatch) result.ship_to_company = shipToMatch[1].trim();
  }

  result.confidence = computeConfidence(result);
  return result;
}