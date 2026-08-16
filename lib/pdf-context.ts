import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import type { SearchHit } from "./chicho";

const FILES: Record<string, string> = {
  universal: "manual-universal.pdf",
  express: "manual-express.pdf",
  obra: "manual-obra.pdf",
};

export type EvidencePage = {
  manualId: string;
  manual: string;
  page: number;
  evidencePage: number;
};

function isVisualIntent(question: string) {
  const q = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(flujo|grafico|grafica|diagrama|cronograma|hito|hitos|etapa|proceso|secuencia|despues|antes|siguiente|pasos)\b/.test(q);
}

export async function buildVisualEvidencePdf(question: string, hits: SearchHit[]) {
  const visual = isVisualIntent(question);
  const wanted = new Map<string, Set<number>>();

  for (const hit of hits.slice(0, visual ? 6 : 4)) {
    if (!FILES[hit.manualId]) continue;
    const set = wanted.get(hit.manualId) || new Set<number>();
    set.add(hit.page);
    // Los flujos suelen continuar en páginas contiguas. Añadimos contexto visual limitado.
    if (visual) {
      if (hit.page > 1) set.add(hit.page - 1);
      set.add(hit.page + 1);
    }
    wanted.set(hit.manualId, set);
  }

  const output = await PDFDocument.create();
  const manifest: EvidencePage[] = [];
  let evidencePage = 1;

  for (const [manualId, pageSet] of wanted) {
    const filename = FILES[manualId];
    if (!filename) continue;
    const fullPath = path.join(process.cwd(), "public", "manuals", filename);
    const bytes = await fs.readFile(fullPath);
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const maxPage = src.getPageCount();
    const pageNumbers = [...pageSet].filter(p => p >= 1 && p <= maxPage).sort((a,b) => a-b);
    const limited = pageNumbers.slice(0, visual ? 10 : 6);
    const indices = limited.map(p => p - 1);
    const copied = await output.copyPages(src, indices);
    const manualName = hits.find(h => h.manualId === manualId)?.manual || manualId;
    copied.forEach((p, i) => {
      output.addPage(p);
      manifest.push({ manualId, manual: manualName, page: limited[i], evidencePage });
      evidencePage += 1;
    });
  }

  const pdfBytes = await output.save();
  return { base64: Buffer.from(pdfBytes).toString("base64"), manifest };
}
