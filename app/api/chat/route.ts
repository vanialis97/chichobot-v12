import { NextResponse } from "next/server";
import { answerWithGemini, type ChatHistoryItem } from "@/lib/chicho";
import { confidenceFor, searchManuals } from "@/lib/search";

function contextualSearchQuery(question: string, history: ChatHistoryItem[]) {
  const q = question.trim();

  // Solo usamos contexto previo cuando la pregunta realmente parece
  // una continuación del tema anterior.
  const looksReferential =
    /^(¿?\s*)?(y|también|entonces|además)\b/i.test(q) ||
    /\b(eso|esa|ese|esto|esta|este|ahí|allí|lo mismo|la misma|el mismo)\b/i.test(q) ||
    /\b(el alto|la altura|la medida|el material|el color|el código|la ubicación|la distancia|el ancho|el largo)\b/i.test(q);

  if (!looksReferential) return null;

  const previousUser = [...history]
    .reverse()
    .find(
      m =>
        m.role === "user" &&
        m.content.trim() &&
        m.content.trim() !== q
    );

  return previousUser ? `${previousUser.content} ${q}` : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    const history = Array.isArray(body?.history)
      ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string").slice(-8)
      : [];

    if (!question) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });

    // Siempre buscamos primero la pregunta actual sola.
let hits = searchManuals(question, 8);
let confidence = confidenceFor(hits);

// Solo si no hay evidencia suficiente,
// intentamos recuperar contexto de la conversación.
if (!hits.length || confidence === "sin_evidencia") {
  const contextualQuery = contextualSearchQuery(question, history);

  if (contextualQuery) {
    const contextualHits = searchManuals(contextualQuery, 8);
    const contextualConfidence = confidenceFor(contextualHits);

    if (
      contextualHits.length &&
      contextualConfidence !== "sin_evidencia"
    ) {
      hits = contextualHits;
      confidence = contextualConfidence;
    }
  }
}

    if (!hits.length || confidence === "sin_evidencia") {
      return NextResponse.json({
        answer: "No encontré evidencia suficiente en los manuales cargados para responder esta consulta con seguridad. Si quieres, prueba mencionando la tipología o el elemento exacto que estás buscando.",
        confidence: "sin_evidencia",
        sources: [],
      });
    }

    let answer = await answerWithGemini(question, hits, history);
    if (!answer) {
      const top = hits.slice(0, 3);
      answer = `Encontré información relacionada, pero la API de Gemini todavía no está configurada. Estos son los fragmentos más relevantes:\n\n${top.map((h, i) => `${i + 1}. ${h.text.slice(0, 650).replace(/\n+/g, " ")}`).join("\n\n")}`;
    }

    // Entrega solo las fuentes con mejor evidencia. El enlace abre el PDF exactamente en esa página.
    const sources = hits.slice(0, 4).map(h => ({
      manual: h.manual,
      version: h.version,
      page: h.page,
      chapter: h.heading || "Sección no identificada",
      pdfUrl: `${h.pdfUrl}${h.pdfUrl.includes("#") ? "&" : "#"}zoom=page-width`,
      score: h.score,
    }));

    return NextResponse.json({ answer, confidence, sources });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No pude procesar la consulta." }, { status: 500 });
  }
}
