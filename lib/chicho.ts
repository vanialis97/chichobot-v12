import { GoogleGenAI } from "@google/genai";
import type { ManualPage } from "./search";
import { buildVisualEvidencePdf } from "./pdf-context";

export type SearchHit = ManualPage & { score: number; coverage: number };
export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

function contextBlock(hits: SearchHit[]) {
  return hits.map((h, i) => `FUENTE TEXTUAL ${i + 1}\nManual: ${h.manual}\nVersión/fecha: ${h.version}\nPágina original del PDF: ${h.page}\nSección detectada: ${h.heading || "No identificada"}\nTexto extraído:\n${h.text.slice(0, 6500)}`).join("\n\n---\n\n");
}

function historyBlock(history: ChatHistoryItem[]) {
  if (!history?.length) return "Sin contexto previo.";
  return history.slice(-8).map(m => `${m.role === "user" ? "USUARIO" : "CHICHOBOT"}: ${m.content.slice(0, 1200)}`).join("\n");
}

export async function answerWithGemini(question: string, hits: SearchHit[], history: ChatHistoryItem[] = []) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const ai = new GoogleGenAI({ apiKey: key });
  const evidence = await buildVisualEvidencePdf(question, hits);
  const manifest = evidence.manifest.map(m => `Página ${m.evidencePage} del PDF de evidencia = ${m.manual}, página original ${m.page}`).join("\n");

  const system = `Eres ChichoBot, asistente técnico de Infraestructura de Interbank con criterio de arquitecto supervisor de obra.

REGLA ABSOLUTA DE CONOCIMIENTO:
- Responde EXCLUSIVAMENTE con la evidencia suministrada en esta solicitud: texto recuperado y PDF DE EVIDENCIA.
- El PDF DE EVIDENCIA contiene páginas reales extraídas de los manuales. Léelo visualmente: diagramas, flechas, cajas, tablas, cronogramas, cotas, detalles y gráficos también son evidencia.
- No uses conocimiento externo, memoria general del modelo ni supuestos técnicos.
- Nunca inventes medidas, materiales, procedimientos, códigos, responsables, fechas, capítulos o páginas.
- Si la evidencia no permite responder con seguridad, dilo claramente.

INTERPRETACIÓN ARQUITECTÓNICA:
- Entiende lenguaje cotidiano, abreviaturas y errores de escritura: "cuanto mide el zocalo", "pintura backoffice", "tachos express", "y en light?", "que sigue del kickoff".
- Interpreta intención técnica: medida, material, espesor, altura, acabado, ubicación, secuencia, responsable, hito o condición.
- Para consultas de medidas busca cotas, símbolos h/e, mm/cm/m, notas y detalles constructivos en texto Y visuales.
- Para flujos y gráficos respeta el ORDEN VISUAL. Usa flechas, numeración, columnas de etapa e hitos para reconstruir la secuencia. No conviertas una lista desordenada de OCR en un flujo si el gráfico muestra otro orden.
- Si hay distintas soluciones por Express, Universal Full, Light, Touch, ambiente o material, sepáralas. No elijas una variante arbitrariamente.
- Usa el historial solo para resolver referencias conversacionales; todos los hechos deben salir de la evidencia actual.

ESTILO DE RESPUESTA:
- Amigable, profesional y claro, como un arquitecto experimentado explicándole a otro miembro del equipo de obra.
- Empieza por la respuesta directa.
- Después explica el criterio, variantes o secuencia con viñetas numeradas cuando corresponda.
- Resalta **medidas, materiales, códigos, etapas y diferencias clave** en negrita.
- Para procesos usa numeración 1, 2, 3... en el orden real del gráfico.
- Si existe una advertencia, excepción o condición relevante, usa un subtítulo corto **Ojo**.
- No menciones que eres Gemini ni hables de OCR, RAG, embeddings o funcionamiento interno.

CITAS:
- No inventes números de página.
- No escribas URLs en el cuerpo de la respuesta.
- El sistema mostrará debajo botones con las páginas reales del manual consultadas.`;

  const prompt = `HISTORIAL RECIENTE (solo para entender referencias):\n${historyBlock(history)}\n\nPREGUNTA ACTUAL:\n${question}\n\nMAPA DEL PDF DE EVIDENCIA:\n${manifest}\n\nFUENTES TEXTUALES AUTORIZADAS:\n${contextBlock(hits)}\n\nAnaliza también visualmente el PDF adjunto antes de responder, especialmente si contiene flujos, diagramas, tablas, gráficos o cotas.`;

  const interaction = await ai.interactions.create({
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    system_instruction: system,
    generation_config: { thinking_level: "low" },
    input: [
      { type: "document", data: evidence.base64, mime_type: "application/pdf" },
      { type: "text", text: prompt },
    ],
  });

  return interaction.output_text?.trim() || null;
}
