import index from "@/data/manual-index.json";

export type ManualPage = {
  manualId: string;
  manual: string;
  version: string;
  page: number;
  heading: string;
  text: string;
  pdfUrl: string;
};

const pages = index as ManualPage[];

const STOP = new Set("de la el los las un una unos unas y o e a en por para con sin del al que se es son como su sus sobre entre desde hasta donde cual qué cómo quiero necesito dame dime puedes puede favor porfavor".split(" "));

// Diccionario técnico para interpretar lenguaje cotidiano y abreviaturas del equipo.
const SYNONYMS: Record<string, string[]> = {
  zocalo: ["zócalo", "zocalo", "sanitario", "rodapie", "rodapié", "altura", "h"],
  zócalo: ["zócalo", "zocalo", "sanitario", "rodapie", "rodapié", "altura", "h"],
  backoffice: ["backoffice", "back office", "back of house", "boh"],
  boh: ["boh", "back of house", "backoffice", "back office"],
  tacho: ["tacho", "tachos", "papelera", "basurero", "canasta"],
  tachos: ["tacho", "tachos", "papelera", "basurero", "canasta"],
  piso: ["piso", "pisos", "porcelanato", "baldosa", "baldosas", "acabado"],
  pintura: ["pintura", "pintado", "ecoacrilico", "ecoacrílico", "satinado", "mate", "pantone"],
  nube: ["nube", "nubes", "cielo raso", "falso cielo", "luminaria", "luminarias"],
  atm: ["atm", "atms", "cajero", "cajeros", "autoservicio", "24 horas", "24hrs"],
  cajero: ["cajero", "cajeros", "atm", "atms", "autoservicio", "24 horas"],
  express: ["express", "plaza vea", "centro comercial"],
  light: ["light", "universal light"],
  full: ["full", "universal full"],
  touch: ["touch", "universal touch"],
  electricidad: ["eléctrica", "electrica", "eléctricas", "electricas", "tablero", "tomacorriente", "ups", "trafo"],
  seguridad: ["seguridad", "daci", "aci", "alarma", "detección", "deteccion", "cctv"],
  mobiliario: ["mobiliario", "mueble", "muebles", "mdf", "formica", "formipak"],
  medida: ["medida", "dimensión", "dimension", "altura", "ancho", "largo", "espesor", "h", "e", "mm", "cm", "m"],
  mide: ["medida", "dimensión", "dimension", "altura", "ancho", "largo", "espesor", "h", "e", "mm", "cm", "m"],
  cuanto: ["medida", "dimensión", "dimension", "altura", "ancho", "largo", "espesor", "mm", "cm", "m"],
  cuánto: ["medida", "dimensión", "dimension", "altura", "ancho", "largo", "espesor", "mm", "cm", "m"],
  flujo: ["flujo", "etapa", "proceso", "procedimiento", "paso", "pasos"],
  hito: ["hito", "hitos", "etapa", "cronograma", "tiempos"],
  hitos: ["hito", "hitos", "etapa", "cronograma", "tiempos"],
  tiempo: ["tiempo", "tiempos", "duración", "duracion", "demora", "plazo", "cronograma", "día", "dias", "días", "total"],
tiempos: ["tiempo", "tiempos", "duración", "duracion", "demora", "plazo", "cronograma", "día", "dias", "días", "total"],
duracion: ["duración", "duracion", "tiempo", "tiempos", "demora", "plazo", "días", "dias", "total"],
duración: ["duración", "duracion", "tiempo", "tiempos", "demora", "plazo", "días", "dias", "total"],
demora: ["demora", "duración", "duracion", "tiempo", "tiempos", "plazo", "días", "dias"],
obra: ["obra", "construcción", "construccion", "desmontaje", "implementación", "implementacion", "apertura"],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ#.+/-]+/gi, " ")
    .trim();
}

function baseTerms(q: string) {
  return [...new Set(normalize(q).split(/\s+/).filter(t => t.length > 1 && !STOP.has(t)))];
}

function expandedTerms(q: string) {
  const base = baseTerms(q);
  const expanded = new Set(base);
  for (const term of base) {
    for (const alias of SYNONYMS[term] || []) {
      for (const token of normalize(alias).split(/\s+/)) {
        if (token.length > 1 && !STOP.has(token)) expanded.add(token);
      }
    }
  }
  return { base, expanded: [...expanded] };
}

function measurementIntent(query: string) {
  const q = normalize(query);
  return /\b(cuanto|cuánto|mide|medida|medidas|altura|ancho|largo|espesor|dimension|dimensión)\b/.test(q);
}

function timeIntent(query: string) {
  const q = normalize(query);
  return /\b(tiempo|tiempos|duracion|dura|durar|demora|plazo|cronograma|dias|dia)\b/.test(q);
}

function countWord(body: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Math.min(10, (body.match(new RegExp(`\\b${escaped}\\b`, "g")) || []).length);
}

export function searchManuals(query: string, limit = 8) {
  const q = normalize(query);
  const { base, expanded } = expandedTerms(query);
  const wantsMeasure = measurementIntent(query);
  const wantsTime = timeIntent(query);
  const primaryObject = base.find(t => !["cuanto", "mide", "medida", "medidas", "altura", "ancho", "largo", "espesor", "dimension"].includes(t));

  const scored = pages.map(page => {
    const heading = normalize(page.heading);
    const body = normalize(`${page.heading} ${page.text}`);
    let score = 0;

    // La frase exacta es una señal muy fuerte.
    if (q.length > 3 && body.includes(q)) score += 55;

    // Los términos escritos por el usuario pesan más que sinónimos expandidos.
    for (const t of base) {
      const count = countWord(body, t);
      score += count * (t.length >= 6 ? 7 : 4);
      if (heading.includes(t)) score += 10;
    }

    for (const t of expanded) {
      if (base.includes(t)) continue;
      const count = countWord(body, t);
      score += count * (t.length >= 6 ? 2.5 : 1.5);
      if (heading.includes(t)) score += 3;
    }

    // Premia páginas donde el elemento principal y una medida aparecen juntos.
    if (wantsMeasure && primaryObject && body.includes(primaryObject)) {
      if (/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|mts|metros?)\b/.test(body)) score += 22;
      if (/\bh\s*[=:]\s*\d/.test(body)) score += 14;
      if (/\be\s*[=:]\s*\d/.test(body)) score += 8;
    }
// Si preguntan por tiempos, prioriza páginas con duración total,
// días, hitos y etapas de obra.
if (wantsTime) {
  if (body.includes("tiempos de obra")) score += 45;
  if (/\btotal\s+\d+\s*dias\b/.test(body)) score += 30;
  if (/\b\d+\s*dias\b/.test(body)) score += 12;
  if (body.includes("hito")) score += 10;
  if (body.includes("implementacion")) score += 8;
  if (body.includes("desmontaje")) score += 8;
  if (body.includes("apertura")) score += 8;
}
    // Cobertura de términos originales: evita páginas con coincidencias accidentales.
    const coverage = base.filter(t => body.includes(t)).length;
    score += coverage * coverage * 4;

    return { ...page, score, coverage };
  }).filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score || b.coverage - a.coverage);

  const result: typeof scored = [];
  const seen = new Set<string>();
  for (const row of scored) {
    const key = `${row.manualId}-${row.page}`;
    if (seen.has(key)) continue;
    result.push(row);
    seen.add(key);
    if (result.length >= limit) break;
  }
  return result;
}

export function confidenceFor(results: ReturnType<typeof searchManuals>) {
  if (!results.length) return "sin_evidencia" as const;
  const top = results[0];
  if (top.score >= 70 || (top.coverage >= 2 && top.score >= 48)) return "alta" as const;
  if (top.score >= 28 || top.coverage >= 1) return "media" as const;
  return "baja" as const;
}
