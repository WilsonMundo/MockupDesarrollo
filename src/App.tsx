import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type View = "login" | "dashboard";

interface RichContent {
  type: "table-inventario" | "table-cotizaciones" | "chart-ventas" | "dashboard-kpi";
}

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  rich?: RichContent;
}

interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ventasMes = [
  { mes: "Feb", ventas: 182400, meta: 170000 },
  { mes: "Mar", ventas: 210800, meta: 200000 },
  { mes: "Abr", ventas: 195300, meta: 200000 },
  { mes: "May", ventas: 234500, meta: 220000 },
  { mes: "Jun", ventas: 218700, meta: 220000 },
  { mes: "Jul", ventas: 248500, meta: 230000 },
];

const pieData = [
  { name: "Electrónica", value: 38 },
  { name: "Hogar", value: 24 },
  { name: "Ropa", value: 19 },
  { name: "Otros", value: 19 },
];

const PIE_COLORS = ["#e07b2e", "#f59e0b", "#6366f1", "#374151"];

const inventario = [
  { codigo: "ART-0021", nombre: "Monitor LG 27\"", categoria: "Electrónica", stock: 5, minimo: 10, precio: "Q2,450.00", estado: "crítico" },
  { codigo: "ART-0047", nombre: "Teclado mecánico", categoria: "Periféricos", stock: 22, minimo: 15, precio: "Q580.00", estado: "ok" },
  { codigo: "ART-0088", nombre: "Silla ergonómica", categoria: "Mobiliario", stock: 3, minimo: 8, precio: "Q1,850.00", estado: "crítico" },
  { codigo: "ART-0102", nombre: "Impresora HP LaserJet", categoria: "Periféricos", stock: 11, minimo: 5, precio: "Q3,200.00", estado: "ok" },
  { codigo: "ART-0115", nombre: "Laptop Dell i7", categoria: "Electrónica", stock: 7, minimo: 10, precio: "Q8,900.00", estado: "bajo" },
  { codigo: "ART-0130", nombre: "Mouse inalámbrico", categoria: "Periféricos", stock: 45, minimo: 20, precio: "Q195.00", estado: "ok" },
];

const cotizaciones = [
  { numero: "COT-4521", cliente: "Corporación XYZ", fecha: "22/07/2026", articulos: 8, total: "Q24,850.00", estado: "pendiente" },
  { numero: "COT-4518", cliente: "Distribuidora ABC", fecha: "20/07/2026", articulos: 3, total: "Q8,400.00", estado: "aprobada" },
  { numero: "COT-4511", cliente: "Tech Solutions S.A.", fecha: "17/07/2026", articulos: 15, total: "Q61,200.00", estado: "aprobada" },
  { numero: "COT-4507", cliente: "Farmacia El Roble", fecha: "15/07/2026", articulos: 6, total: "Q12,700.00", estado: "rechazada" },
  { numero: "COT-4502", cliente: "Constructora Norte", fecha: "12/07/2026", articulos: 22, total: "Q88,500.00", estado: "pendiente" },
];

// ─── AI Response Router ────────────────────────────────────────────────────────

function resolveAI(input: string): { text: string; rich?: RichContent } {
  const lower = input.toLowerCase();
  if (lower.includes("@inventario") || lower.includes("@stock")) {
    return {
      text: "Aquí está el estado actual del **inventario**. Hay **2 artículos en nivel crítico** que requieren reorden inmediato.",
      rich: { type: "table-inventario" },
    };
  }
  if (lower.includes("@cotizacion") || lower.includes("@cotizaciones")) {
    return {
      text: "Estas son las **últimas cotizaciones** del sistema. 2 están pendientes de aprobación por un valor total de **Q113,350.00**.",
      rich: { type: "table-cotizaciones" },
    };
  }
  if (lower.includes("@ventas") || lower.includes("@reporte")) {
    return {
      text: "Aquí tienes el **reporte de ventas** de los últimos 6 meses. Julio fue el mejor mes con **Q248,500** — un **7.2%** sobre la meta.",
      rich: { type: "chart-ventas" },
    };
  }
  if (lower.includes("@dashboard") || lower.includes("@resumen")) {
    return {
      text: "Generando **dashboard ejecutivo** con los KPIs principales del ERP al día de hoy.",
      rich: { type: "dashboard-kpi" },
    };
  }
  if (lower.includes("inventar") || lower.includes("stock"))
    return { text: "Actualmente tienes **342 artículos** registrados, de los cuales **18** están bajo el nivel mínimo. Usa **@inventario** para ver la tabla completa." };
  if (lower.includes("cotiz"))
    return { text: "Hay **5 cotizaciones** activas este mes. Usa **@cotizaciones** para ver el listado detallado." };
  if (lower.includes("venta") || lower.includes("ingreso"))
    return { text: "Las ventas de julio alcanzaron **Q248,500** — el mejor mes del año. Escribe **@ventas** para ver el gráfico completo." };
  if (lower.includes("dashboard") || lower.includes("resumen") || lower.includes("kpi"))
    return { text: "Puedo mostrarte un dashboard ejecutivo con todos los KPIs. Escribe **@dashboard** para verlo." };
  return {
    text: "Entendido. Analicé los datos del ERP y puedo ayudarte con reportes visuales. Prueba estos comandos:\n\n**@dashboard** — resumen ejecutivo\n**@ventas** — gráfico de ventas\n**@inventario** — tabla de stock\n**@cotizaciones** — listado de cotizaciones",
  };
}

function now() {
  return new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("login");
  const [username, setUsername] = useState("admin@erp.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (username === "admin@erp.com" && password === "demo1234") {
        setView("dashboard");
      } else {
        setLoginError("Usuario o contraseña incorrectos.");
      }
    }, 1200);
  };

  if (view === "login") {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-4"
        style={{ background: "linear-gradient(160deg, #0f1117 60%, #1a1520 100%)" }}
      >
        <p className="text-sm mb-6 tracking-wide" style={{ color: "#e07b2e" }}>
          Sistema de Gestión Empresarial
        </p>
        <div
          className="w-full max-w-sm rounded-2xl px-8 py-10 flex flex-col gap-6"
          style={{ background: "#1a1d27", border: "1px solid #2a2f42", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
        >
          <h1 className="text-2xl font-bold" style={{ color: "#e8eaf0" }}>Iniciar sesión</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "#e07b2e" }}>Usuario</label>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#12151e", border: "1px solid #2a2f42" }}>
                <UserIcon color="#e07b2e" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario" className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500" style={{ color: "#e8eaf0" }} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "#e07b2e" }}>Contraseña</label>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#12151e", border: "1px solid #2a2f42" }}>
                <LockIcon color="#e07b2e" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña" className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500" style={{ color: "#e8eaf0" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 transition-opacity">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setRemember(!remember)}>
                <div className="w-4 h-4 rounded flex items-center justify-center border transition-colors"
                  style={{ background: remember ? "#e07b2e" : "transparent", borderColor: remember ? "#e07b2e" : "#4b5563" }}>
                  {remember && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span className="text-sm" style={{ color: "#9ca3af" }}>Recordarme</span>
              </label>
              <button type="button" className="text-sm font-medium hover:underline" style={{ color: "#e07b2e" }}>¿Olvidaste tu contraseña?</button>
            </div>
            {loginError && <p className="text-xs text-red-400 -mt-2">{loginError}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
              style={{ background: "#232738", color: "#e8eaf0", border: "1px solid #3a3f52" }}>
              {loading ? <SpinnerIcon /> : <LoginIcon />}
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
          <div className="flex justify-between pt-2 border-t" style={{ borderColor: "#2a2f42" }}>
            <span className="text-xs" style={{ color: "#4b5563", fontFamily: "var(--font-mono)" }}>v2.5.1</span>
            <span className="text-xs" style={{ color: "#4b5563" }}>© 2026</span>
          </div>
        </div>
        <button className="mt-8 text-sm font-medium hover:underline" style={{ color: "#e07b2e" }}>¿Necesitas ayuda?</button>
        <p className="mt-3 text-xs" style={{ color: "#4b5563" }}>
          Demo: <span style={{ fontFamily: "var(--font-mono)", color: "#6b7280" }}>admin@erp.com</span> / <span style={{ fontFamily: "var(--font-mono)", color: "#6b7280" }}>demo1234</span>
        </p>
      </div>
    );
  }

  return <Dashboard onLogout={() => setView("login")} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>("Inventario y Fact.");
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: 1, title: "@dashboard ejecutivo", messages: [] },
    { id: 2, title: "@ventas julio 2026", messages: [] },
    { id: 3, title: "@inventario stock crítico", messages: [] },
  ]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showAtMenu, setShowAtMenu] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === activeSession);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, typing]);

  const atCommands = [
    { cmd: "@dashboard", desc: "Resumen ejecutivo KPIs" },
    { cmd: "@ventas", desc: "Gráfico de ventas" },
    { cmd: "@inventario", desc: "Tabla de stock" },
    { cmd: "@cotizaciones", desc: "Listado de cotizaciones" },
  ];

  const handleInput = (val: string) => {
    setInput(val);
    setShowAtMenu(val.includes("@") && !val.match(/@\w+\s/));
  };

  const insertAt = (cmd: string) => {
    const base = input.replace(/@\w*$/, "");
    setInput(base + cmd + " ");
    setShowAtMenu(false);
    textareaRef.current?.focus();
  };

  const newChat = () => {
    const id = Date.now();
    setSessions((prev) => [{ id, title: "Nueva conversación", messages: [] }, ...prev]);
    setActiveSession(id);
    setInput("");
    setShowAtMenu(false);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || typing) return;

    let sid = activeSession;
    if (!sid) {
      const id = Date.now();
      setSessions((prev) => [{ id, title: text.slice(0, 36), messages: [] }, ...prev]);
      sid = id;
      setActiveSession(id);
    }

    const userMsg: Message = { id: Date.now(), role: "user", text, time: now() };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, title: s.messages.length === 0 ? text.slice(0, 36) : s.title, messages: [...s.messages, userMsg] } : s
      )
    );
    setInput("");
    setShowAtMenu(false);
    setTyping(true);

    setTimeout(() => {
      const { text: aiText, rich } = resolveAI(text);
      const aiMsg: Message = { id: Date.now() + 1, role: "ai", text: aiText, time: now(), rich };
      setSessions((prev) =>
        prev.map((s) => (s.id === sid ? { ...s, messages: [...s.messages, aiMsg] } : s))
      );
      setTyping(false);
    }, 1100);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === "Escape") setShowAtMenu(false);
  };

  const menuGroups = [
    {
      label: "MENÚ PRINCIPAL",
      items: [
        { name: "Configuraciones", icon: <SettingsIcon /> },
        { name: "Cuenta por Cobrar", icon: <InvoiceIcon /> },
        { name: "Inventario y Fact.", icon: <BoxIcon />, children: ["Consultas", "Movimientos", "Cotización", "Pedidos", "Procesos Inv."] },
        { name: "Recursos Humanos", icon: <PeopleIcon /> },
        { name: "Contabilidad", icon: <ChartBarIcon /> },
      ],
    },
    {
      label: "SISTEMA",
      items: [
        { name: "Soporte", icon: <HelpCircleIcon /> },
        { name: "Cerrar sesión", icon: <LogoutIcon />, action: onLogout },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "#0f1117", color: "#e8eaf0" }}>
      {/* Sidebar */}
      <aside className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{ width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, background: "#12151e", borderRight: "1px solid #1e2130" }}>

        <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid #1e2130" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#e07b2e", color: "#fff" }}>ERP</div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none truncate" style={{ color: "#e8eaf0" }}>Sistema ERP</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#e07b2e" }}>IA Empresarial</p>
          </div>
        </div>

        <div className="px-3 pt-3 pb-2">
          <button onClick={newChat} className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:brightness-110"
            style={{ background: "#1e2130", border: "1px solid #2a2f42", color: "#e8eaf0" }}>
            <PlusIcon /><span>Nuevo chat</span>
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#0f1117", border: "1px solid #1e2130" }}>
            <SearchIcon size={14} />
            <input type="text" placeholder="Buscar módulo..." className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600" style={{ color: "#9ca3af" }} />
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="px-3 pb-2">
            <p className="text-xs font-semibold px-1 mb-1" style={{ color: "#4b5563", letterSpacing: "0.08em" }}>CONVERSACIONES</p>
            <div className="flex flex-col gap-0.5">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => setActiveSession(s.id)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg truncate transition-all"
                  style={{ background: activeSession === s.id ? "#1e2130" : "transparent", color: activeSession === s.id ? "#e8eaf0" : "#6b7280", border: activeSession === s.id ? "1px solid #2a2f42" : "1px solid transparent" }}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: "none" }}>
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-semibold px-1 mb-1.5" style={{ color: "#4b5563", letterSpacing: "0.08em" }}>{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <div key={item.name}>
                    <button
                      onClick={() => { if ("action" in item && item.action) { item.action(); return; } setActiveMenu(activeMenu === item.name ? null : item.name); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all"
                      style={{ background: activeMenu === item.name ? "#1e2130" : "transparent", color: activeMenu === item.name ? "#e07b2e" : "#9ca3af" }}>
                      <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                      <span className="flex-1 text-left truncate font-medium">{item.name}</span>
                      {"children" in item && item.children && <ChevronIcon open={activeMenu === item.name} />}
                    </button>
                    {"children" in item && item.children && activeMenu === item.name && (
                      <div className="ml-8 flex flex-col gap-0.5 mt-0.5">
                        {item.children.map((child) => (
                          <button key={child} className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{ color: "#6b7280" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#e07b2e")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}>
                            · {child}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: "1px solid #1e2130" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#e07b2e", color: "#fff" }}>GI</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: "#e8eaf0" }}>GIMImadeGT</p>
            <p className="text-xs truncate" style={{ color: "#e07b2e" }}>Sucursal: Central</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1e2130", background: "#12151e" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg transition-all hover:bg-white/5" style={{ color: "#6b7280" }}><MenuIcon /></button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#e07b2e" }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM6 5.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm.75 2h.5l.5 3h-1.5l.5-3z" /></svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#e8eaf0" }}>Asistente IA · ERP</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs" style={{ background: "#1a1d27", border: "1px solid #1e2130", color: "#6b7280" }}>
            <span className="font-mono" style={{ color: "#e07b2e" }}>@</span> Comandos disponibles
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-xs" style={{ color: "#6b7280" }}>En línea</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2130 transparent" }}>
          {!currentSession || currentSession.messages.length === 0 ? (
            <EmptyState onSuggestion={(s) => { setInput(s); setShowAtMenu(s.includes("@")); textareaRef.current?.focus(); }} />
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              {currentSession.messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
              {typing && <TypingIndicator />}
              <div ref={messagesEnd} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-5 pt-2">
          <div className="max-w-4xl mx-auto relative">
            {/* @ dropdown */}
            {showAtMenu && (
              <div className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-20 w-72"
                style={{ background: "#1a1d27", border: "1px solid #2a2f42", boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}>
                <p className="text-xs px-3 pt-2 pb-1 font-semibold" style={{ color: "#4b5563" }}>COMANDOS DISPONIBLES</p>
                {atCommands.map((c) => (
                  <button key={c.cmd} onClick={() => insertAt(c.cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all hover:bg-white/5">
                    <span className="font-mono font-bold" style={{ color: "#e07b2e" }}>{c.cmd}</span>
                    <span className="text-xs" style={{ color: "#6b7280" }}>{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-3 rounded-2xl px-4 py-3" style={{ background: "#1a1d27", border: "1px solid #2a2f42" }}>
              <button className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 self-center" style={{ color: "#6b7280" }}><PlusIcon /></button>
              <textarea ref={textareaRef} value={input} onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKey} placeholder="Escribe @ para comandos o pregunta algo al asistente ERP…"
                rows={1} className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-gray-600 leading-relaxed"
                style={{ color: "#e8eaf0", maxHeight: 120, overflowY: "auto" }} />
              <button onClick={sendMessage} disabled={!input.trim() || typing}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all self-center"
                style={{ background: input.trim() && !typing ? "#e07b2e" : "#2a2f42", color: input.trim() && !typing ? "#fff" : "#4b5563" }}>
                <SendIcon />
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: "#374151" }}>
              Escribe <span style={{ color: "#e07b2e", fontFamily: "var(--font-mono)" }}>@dashboard</span> · <span style={{ color: "#e07b2e", fontFamily: "var(--font-mono)" }}>@ventas</span> · <span style={{ color: "#e07b2e", fontFamily: "var(--font-mono)" }}>@inventario</span> · <span style={{ color: "#e07b2e", fontFamily: "var(--font-mono)" }}>@cotizaciones</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  const suggestions = [
    { label: "@dashboard", desc: "Ver resumen ejecutivo", cmd: "@dashboard" },
    { label: "@ventas", desc: "Gráfico de ventas mensual", cmd: "@ventas" },
    { label: "@inventario", desc: "Estado del stock actual", cmd: "@inventario" },
    { label: "@cotizaciones", desc: "Últimas cotizaciones", cmd: "@cotizaciones" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1a1d27", border: "1px solid #2a2f42" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#e07b2e" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M2 17l10 5 10-5" stroke="#e07b2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12l10 5 10-5" stroke="#e07b2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#e8eaf0" }}>¿En qué puedo ayudarte?</h2>
        <p className="text-sm" style={{ color: "#6b7280" }}>Usa <span style={{ color: "#e07b2e" }}>@comandos</span> para generar reportes visuales instantáneos</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s) => (
          <button key={s.cmd} onClick={() => onSuggestion(s.cmd)}
            className="text-left px-4 py-3 rounded-xl transition-all"
            style={{ background: "#1a1d27", border: "1px solid #2a2f42" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e07b2e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2f42"; }}>
            <span className="text-sm font-bold font-mono block" style={{ color: "#e07b2e" }}>{s.label}</span>
            <span className="text-xs mt-0.5 block" style={{ color: "#6b7280" }}>{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: isUser ? "#2a2f42" : "#1e2130", border: `1px solid ${isUser ? "#3a3f52" : "#2a2f42"}`, color: isUser ? "#e8eaf0" : "#e07b2e" }}>
        {isUser ? "GI" : "IA"}
      </div>
      <div className={`flex flex-col gap-2 ${isUser ? "items-end max-w-[70%]" : "items-start w-full"}`}>
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? "#1e2130" : "#12151e",
            border: `1px solid ${isUser ? "#2a2f42" : "#1e2130"}`,
            color: "#e8eaf0",
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            maxWidth: isUser ? "100%" : "100%",
          }}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#e07b2e'>$1</strong>").replace(/\n/g, "<br/>") }}
        />
        {msg.rich && <RichBlock rich={msg.rich} />}
        <span className="text-xs px-1" style={{ color: "#374151" }}>{msg.time}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#1e2130", border: "1px solid #2a2f42", color: "#e07b2e" }}>IA</div>
      <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ background: "#12151e", border: "1px solid #1e2130", borderRadius: "4px 18px 18px 18px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#e07b2e", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Rich Blocks ──────────────────────────────────────────────────────────────

function RichBlock({ rich }: { rich: RichContent }) {
  if (rich.type === "chart-ventas") return <ChartVentas />;
  if (rich.type === "table-inventario") return <TableInventario />;
  if (rich.type === "table-cotizaciones") return <TableCotizaciones />;
  if (rich.type === "dashboard-kpi") return <DashboardKPI />;
  return null;
}

const tooltipStyle = {
  contentStyle: { background: "#1a1d27", border: "1px solid #2a2f42", borderRadius: 10, color: "#e8eaf0", fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
  cursor: { fill: "rgba(224,123,46,0.06)" },
};

function ChartVentas() {
  return (
    <div className="w-full rounded-2xl p-4" style={{ background: "#0f1117", border: "1px solid #1e2130" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold" style={{ color: "#e8eaf0" }}>Ventas vs Meta — 2026</p>
          <p className="text-xs" style={{ color: "#6b7280" }}>Últimos 6 meses · en Quetzales</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#e07b2e" }} />Ventas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#374151" }} />Meta</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={ventasMes} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e07b2e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#e07b2e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
          <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`Q${v.toLocaleString()}`, ""]} />
          <Area type="monotone" dataKey="meta" stroke="#374151" strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} />
          <Area type="monotone" dataKey="ventas" stroke="#e07b2e" strokeWidth={2} fill="url(#gVentas)" dot={{ fill: "#e07b2e", r: 3 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableInventario() {
  const estadoStyle: Record<string, { bg: string; color: string; label: string }> = {
    crítico: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Crítico" },
    bajo: { bg: "rgba(234,179,8,0.12)", color: "#eab308", label: "Bajo" },
    ok: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "OK" },
  };
  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2130" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0f1117", borderBottom: "1px solid #1e2130" }}>
        <p className="text-sm font-bold" style={{ color: "#e8eaf0" }}>Inventario — Estado de stock</p>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "#1e2130", color: "#e07b2e" }}>{inventario.length} artículos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#0f1117", borderBottom: "1px solid #1e2130" }}>
              {["Código", "Nombre", "Categoría", "Stock", "Mínimo", "Precio", "Estado"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold" style={{ color: "#6b7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventario.map((row, i) => (
              <tr key={row.codigo} style={{ background: i % 2 === 0 ? "#12151e" : "#0f1117", borderBottom: "1px solid #1e2130" }}>
                <td className="px-4 py-2.5 font-mono" style={{ color: "#e07b2e" }}>{row.codigo}</td>
                <td className="px-4 py-2.5 font-medium" style={{ color: "#e8eaf0" }}>{row.nombre}</td>
                <td className="px-4 py-2.5" style={{ color: "#9ca3af" }}>{row.categoria}</td>
                <td className="px-4 py-2.5 font-bold" style={{ color: row.estado === "crítico" ? "#ef4444" : row.estado === "bajo" ? "#eab308" : "#22c55e" }}>{row.stock}</td>
                <td className="px-4 py-2.5" style={{ color: "#6b7280" }}>{row.minimo}</td>
                <td className="px-4 py-2.5 font-mono" style={{ color: "#e8eaf0" }}>{row.precio}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: estadoStyle[row.estado].bg, color: estadoStyle[row.estado].color }}>
                    {estadoStyle[row.estado].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableCotizaciones() {
  const estadoStyle: Record<string, { bg: string; color: string }> = {
    pendiente: { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
    aprobada: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
    rechazada: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  };
  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2130" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0f1117", borderBottom: "1px solid #1e2130" }}>
        <p className="text-sm font-bold" style={{ color: "#e8eaf0" }}>Cotizaciones recientes</p>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "#1e2130", color: "#e07b2e" }}>Julio 2026</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#0f1117", borderBottom: "1px solid #1e2130" }}>
              {["Número", "Cliente", "Fecha", "Artículos", "Total", "Estado"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold" style={{ color: "#6b7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((row, i) => (
              <tr key={row.numero} style={{ background: i % 2 === 0 ? "#12151e" : "#0f1117", borderBottom: "1px solid #1e2130" }}>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: "#e07b2e" }}>{row.numero}</td>
                <td className="px-4 py-3 font-medium" style={{ color: "#e8eaf0" }}>{row.cliente}</td>
                <td className="px-4 py-3" style={{ color: "#9ca3af" }}>{row.fecha}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#e8eaf0" }}>{row.articulos}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: "#e8eaf0" }}>{row.total}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{ background: estadoStyle[row.estado].bg, color: estadoStyle[row.estado].color }}>
                    {row.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardKPI() {
  const kpis = [
    { label: "Ventas del mes", value: "Q248,500", delta: "+12.4%", up: true, sub: "vs mes anterior" },
    { label: "Órdenes activas", value: "34", delta: "+7", up: true, sub: "esta semana" },
    { label: "Stock crítico", value: "18 art.", delta: "-3", up: false, sub: "vs semana pasada" },
    { label: "Cotizaciones", value: "Q194,450", delta: "+2 pend.", up: true, sub: "pendientes de aprobación" },
  ];
  return (
    <div className="w-full rounded-2xl p-4 flex flex-col gap-4" style={{ background: "#0f1117", border: "1px solid #1e2130" }}>
      <p className="text-sm font-bold" style={{ color: "#e8eaf0" }}>Dashboard Ejecutivo · Hoy, 22 jul 2026</p>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl p-3" style={{ background: "#12151e", border: "1px solid #1e2130" }}>
            <p className="text-xs mb-1" style={{ color: "#6b7280" }}>{k.label}</p>
            <p className="text-lg font-bold" style={{ color: "#e8eaf0" }}>{k.value}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-semibold" style={{ color: k.up ? "#22c55e" : "#ef4444" }}>{k.delta}</span>
              <span className="text-xs" style={{ color: "#4b5563" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div>
        <p className="text-xs mb-2" style={{ color: "#6b7280" }}>Ventas por mes (Q)</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={ventasMes} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`Q${v.toLocaleString()}`, "Ventas"]} />
            <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
              {ventasMes.map((_, i) => (
                <Cell key={i} fill={i === ventasMes.length - 1 ? "#e07b2e" : "#1e2130"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Pie */}
      <div className="flex items-center gap-4">
        <div style={{ width: 110, height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <p className="text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>Ventas por categoría</p>
          {pieData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="text-xs" style={{ color: "#9ca3af" }}>{d.name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: "#e8eaf0" }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UserIcon({ color = "#6b7280" }: { color?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function LockIcon({ color = "#6b7280" }: { color?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
function LoginIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>;
}
function SpinnerIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function SearchIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function SendIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}
function MenuIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function InvoiceIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}
function BoxIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}
function PeopleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function ChartBarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>;
}
function HelpCircleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function ChevronIcon({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="9 18 15 12 9 6" /></svg>;
}
