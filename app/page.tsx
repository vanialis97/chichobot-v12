"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type Source = { manual: string; version: string; page: number; chapter: string; pdfUrl: string; score: number };
type Message = { id: string; role: "user" | "assistant"; content: string; confidence?: string; sources?: Source[] };
type Conversation = { id: string; title: string; favorite: boolean; messages: Message[]; updatedAt: number };

const initial: Message = {
  id: "welcome", role: "assistant",
  content: "¡Hola! 👋 Soy ChichoBot, tu asistente de Infraestructura. Consulto únicamente los manuales cargados. ¿En qué te puedo ayudar hoy?",
};

const quick = ["Flujo de un Express", "Hitos de obra", "¿Cuánto mide el zócalo?", "Pintura en backoffice"];
const nav = [
  ["💬", "Chat IA"], ["🕘", "Historial"], ["★", "Favoritos"], ["📘", "Manuales"],
];
const admin = [["▦", "Panel administrativo"], ["👥", "Usuarios"], ["📊", "Reportes"], ["🎨", "Configuración"]];

function confidenceLabel(v?: string) {
  if (v === "alta") return "Confianza alta";
  if (v === "media") return "Confianza media";
  if (v === "baja") return "Confianza baja";
  if (v === "sin_evidencia") return "Sin evidencia suficiente";
  return "";
}

function inlineFormat(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={i}>{part.slice(2, -2)}</strong>
    : <span key={i}>{part}</span>);
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return <div className="rich-text">{lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div className="spacer" key={i} />;
    if (/^#{1,3}\s/.test(trimmed)) return <div className="answer-heading" key={i}>{inlineFormat(trimmed.replace(/^#{1,3}\s*/, ""))}</div>;
    if (/^(•|-|\*)\s+/.test(trimmed)) return <div className="answer-bullet" key={i}><span>•</span><div>{inlineFormat(trimmed.replace(/^(•|-|\*)\s+/, ""))}</div></div>;
    return <div className="answer-line" key={i}>{inlineFormat(line)}</div>;
  })}</div>;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("demo");
  const [messages, setMessages] = useState<Message[]>([initial]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Chat IA");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("chichobot-conversations");
    if (stored) setConversations(JSON.parse(stored));
  }, []);
  useEffect(() => {
    if (conversations.length) localStorage.setItem("chichobot-conversations", JSON.stringify(conversations));
  }, [conversations]);

  const visibleConversations = useMemo(() => conversations
    .filter(c => activeTab !== "Favoritos" || c.favorite)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase())), [conversations, activeTab, search]);

  function persist(next: Message[]) {
    const now = Date.now();
    setConversations(prev => {
      const current = prev.find(c => c.id === activeId);
      const firstUser = next.find(m => m.role === "user")?.content || "Nueva conversación";
      const item: Conversation = { id: activeId, title: firstUser.slice(0, 48), favorite: current?.favorite || false, messages: next, updatedAt: now };
      return [item, ...prev.filter(c => c.id !== activeId)].slice(0, 50);
    });
  }

  async function ask(text = question) {
    const q = text.trim(); if (!q || loading) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content: q };
    const next = [...messages, user]; setMessages(next); setQuestion(""); setLoading(true); persist(next);
    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      const bot: Message = { id: crypto.randomUUID(), role: "assistant", content: data.answer || data.error || "No pude responder.", confidence: data.confidence, sources: data.sources };
      const final = [...next, bot]; setMessages(final); persist(final);
    } catch {
      const final = [...next, { id: crypto.randomUUID(), role: "assistant" as const, content: "No pude conectarme con el servidor de ChichoBot." }];
      setMessages(final); persist(final);
    } finally { setLoading(false); }
  }

  function newChat() {
    setActiveId(crypto.randomUUID()); setMessages([initial]); setActiveTab("Chat IA");
  }
  function openConversation(c: Conversation) { setActiveId(c.id); setMessages(c.messages); setActiveTab("Chat IA"); }
  function toggleFavorite() {
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, favorite: !c.favorite } : c));
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="avatar"><img src="/chicho.png" alt="ChichoBot" /></div><div><b>ChichoBot</b><span>Asistente de Infraestructura · Interbank</span></div></div>
      <button className="new-chat" onClick={newChat}>＋ Nuevo chat</button>
      <nav>{nav.map(([icon,label]) => <button key={label} className={activeTab===label?"nav active":"nav"} onClick={() => setActiveTab(label)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="section-title">ADMINISTRACIÓN</div>
      <nav>{admin.map(([icon,label]) => <button key={label} className={activeTab===label?"nav active":"nav"} onClick={() => setActiveTab(label)}><span>{icon}</span>{label}<small>Próximamente</small></button>)}</nav>
      <div className="sidebar-foot">Gemini V1.2 · Multimodal</div>
    </aside>

    <main className="main">
      <header><div><h1>{activeTab}</h1><p>{activeTab === "Chat IA" ? "Pregunta sobre los manuales de Infraestructura" : "ChichoBot · prototipo V1.2"}</p></div><div className="header-actions"><button onClick={toggleFavorite}>★ Favorito</button></div></header>

      {(activeTab === "Historial" || activeTab === "Favoritos") ? <section className="library-view">
        <div className="searchbox"><span>⌕</span><input placeholder="Buscar conversaciones..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <div className="conversation-grid">{visibleConversations.map(c => <button className="conversation-card" onClick={()=>openConversation(c)} key={c.id}><b>{c.favorite?"★ ":""}{c.title}</b><span>{new Date(c.updatedAt).toLocaleString("es-PE")}</span><small>{c.messages.length} mensajes</small></button>)}</div>
      </section> : activeTab === "Manuales" ? <section className="library-view"><h2>Biblioteca de manuales</h2><p className="library-intro">Haz clic en un manual para abrir el PDF completo. En las respuestas, ChichoBot te llevará directamente a la página utilizada.</p><div className="manual-grid">
        {[['Manual IBK Universal','241 páginas','2025','/manuals/manual-universal.pdf'],['Manual IBK Express','87 páginas','2025','/manuals/manual-express.pdf'],['Manual de obra','191 páginas','2026','/manuals/manual-obra.pdf']].map(m=><a className="manual-card" href={m[3]} target="_blank" rel="noreferrer" key={m[0]}><span className="manual-icon">📘</span><b>{m[0]}</b><span>{m[1]}</span><span>Versión {m[2]} · Activo</span></a>)}
      </div></section> : activeTab !== "Chat IA" ? <section className="placeholder"><div>🚧</div><h2>{activeTab}</h2><p>Esta sección está definida en la arquitectura y se implementará en las siguientes fases.</p></section> :
      <section className="chat-stage">
        <div className="chat-scroll">
          {messages.length === 1 && <div className="quick-row">{quick.map(q=><button onClick={()=>ask(q)} key={q}>{q}</button>)}</div>}
          {messages.map(m => <div className={`message-row ${m.role}`} key={m.id}>
           {m.role === "assistant" && <div className="avatar mini"><img src="/chicho.png" alt="ChichoBot" /></div>}
            <div className={`bubble ${m.role}`}>
              {m.role === "assistant" && m.confidence && <span className={`confidence ${m.confidence}`}>{confidenceLabel(m.confidence)}</span>}
              <div className="message-text">{m.role === "assistant" ? <RichText text={m.content}/> : m.content}</div>
              {m.sources && m.sources.length > 0 && <div className="sources">
                <div className="sources-title">PÁGINAS DEL MANUAL CONSULTADAS</div>
                {m.sources.map((s,i)=><a className="source-card" href={s.pdfUrl} target="_blank" rel="noreferrer" key={`${s.manual}-${s.page}-${i}`}>
                  <span><b>{s.manual}</b><small>{s.chapter}</small></span>
                  <span><b>Pág. {s.page}</b><small>Versión {s.version}</small></span>
                  <strong>Abrir página ↗</strong>
                </a>)}
              </div>}
            </div>
            {m.role === "user" && <div className="you">TÚ</div>}
          </div>)}
          {loading && <div className="message-row assistant"><div className="avatar mini"><img src="/chicho.png" alt="ChichoBot" /></div><div className="bubble assistant typing">Buscando únicamente en los manuales<span>•••</span></div></div>}
        </div>
        <form className="composer" onSubmit={(e:FormEvent)=>{e.preventDefault();ask()}}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Escribe tu pregunta sobre los manuales..."/><button disabled={loading}>➤</button></form>
        <div className="disclaimer">ChichoBot responde solo con información encontrada en los manuales cargados. Cada fuente abre el PDF directamente en la página consultada.</div>
      </section>}
    </main>
  </div>;
}
