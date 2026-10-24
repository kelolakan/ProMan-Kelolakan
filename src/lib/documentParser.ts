// src/lib/documentParser.ts
import type { DocumentType, DocumentItem } from "../types";

// pdfjs worker
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface ParsedDocumentResult {
  doc_type?: DocumentType;
  doc_number?: string;
  doc_date?: string;
  due_date?: string;
  title?: string;
  recipient_name?: string;
  recipient_company?: string;
  recipient_address?: string;
  recipient_phone?: string;
  items?: DocumentItem[];
  include_tax?: boolean;
  notes?: string;
  work_scope?: string;
  milestone_percentage?: number;
  atp_ref_number?: string;
  payment_method?: "BANK_TRANSFER" | "CASH" | "GIRO";
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  confidence?: number;
  raw_text_preview?: string;

  // Optional fields for additional metadata
  ship_to_company?: string;
  ship_to_address?: string;
  site_name?: string;
  product_type?: string;
  regional_site?: string;
  po_number?: string;
  po_date?: string;
  site_list?: string;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return extractPdfText(file);
  if (ext === "docx" || ext === "doc") return extractDocxText(file);
  if (ext === "txt") return file.text();
  throw new Error("Format file tidak didukung. Gunakan PDF, DOCX, atau TXT.");
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        fullText += line.trim() + "\n";
        line = "";
      }
      line += item.str + " ";
      lastY = y;
    }
    fullText += line.trim() + "\n\n";
  }
  return fullText;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function parseDocumentText(
  rawText: string,
  preferredType?: DocumentType
): Promise<ParsedDocumentResult> {
  try {
    const res = await fetch("/api/parse-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, preferredType }),
    });

    if (res.status === 204) throw new Error("NO_LLM");

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      throw new Error("BACKEND_NOT_JSON");
    }

    const textBody = await res.text();
    if (!textBody || textBody.trim().length === 0) throw new Error("EMPTY_BODY");

    const data = JSON.parse(textBody) as ParsedDocumentResult;
    if (data && Object.keys(data).length > 0) {
      return { ...data, raw_text_preview: rawText.slice(0, 500) };
    }
  } catch (err) {
    console.warn("[Parser] LLM gagal, fallback ke heuristik:", err);
  }

  const { heuristicParse } = await import("./parseHeuristics");
  return {
    ...heuristicParse(rawText, preferredType),
    raw_text_preview: rawText.slice(0, 500),
  };
}

export async function parseDocumentFile(
  file: File,
  preferredType?: DocumentType
): Promise<ParsedDocumentResult> {
  const text = await extractTextFromFile(file);
  if (!text || text.trim().length < 10) {
    throw new Error("Tidak dapat membaca teks dari file. Coba file lain.");
  }
  return parseDocumentText(text, preferredType);
}