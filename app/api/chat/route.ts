import { NextResponse } from "next/server";
import { answerWithGemini, type ChatHistoryItem } from "@/lib/chicho";
import { confidenceFor, searchManuals } from "@/lib/search";

function contextualSearchQuery(question: string, history: ChatHistoryItem[]) {
  const q = question.trim();
  // Si la pregunta es muy corta o referencial ("¿y en Express?", "¿y el alto?"),
  // añade la última pregunta del usuario para recuperar el contexto técnico.
  const looksReferential = q.split(/\s+/).length <= 5 || /\b(y|eso|esa|ese|ahi|allí|mismo|misma|tambien|también)\b/i.test(q);
  if (!looksReferential) return q;
  const previousUser = [...history].reverse().find(m => m.role === "user" && m.content.trim() && m.content.trim() !== q);
  return previousUser ? `${previousUser.content} ${q}` : q;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    const history = Array.isArray(body?.history)
      ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string").slice(-8)
      : [];

    if (!question) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });

    const searchQuery = contextualSearchQuery(question, history);
    const hits = searchManuals(searchQuery, 8);
    const confidence = confidenceFor(hits);

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
