/**
 * PixelPush
 * HTML Template Broadcast Dashboard for CasparCG
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// ─── Config ───────────────────────────────────────────────────────────────────
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const TEMPLATE_PREVIEW_BASE =
  import.meta.env.VITE_TEMPLATE_PREVIEW_BASE || "http://192.168.25.100:8080/templates";
const CASPAR_HOST = import.meta.env.VITE_CASPAR_HOST || "192.168.25.100";
const CASPAR_PORT = import.meta.env.VITE_CASPAR_PORT || "5250";
const DEFAULT_CHANNEL = 1;
const DEFAULT_LAYER = 20;

// ─── Socket singleton ─────────────────────────────────────────────────────────
const socket = io(SERVER_URL, { autoConnect: true, reconnectionDelay: 2000 });

// ─── Styles (injected once) ───────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0b0d;
    --surface:   #111318;
    --panel:     #16191f;
    --border:    #252931;
    --amber:     #f59e0b;
    --amber-dim: #92610a;
    --green:     #10b981;
    --red:       #ef4444;
    --blue:      #3b82f6;
    --text:      #e2e8f0;
    --muted:     #64748b;
    --font-mono: 'Share Tech Mono', monospace;
    --font-cond: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
  }

  html, body, #root {
    height: 100%; width: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    overflow: hidden;
  }

  /* ── Layout ── */
  .app {
    display: grid;
    grid-template-rows: 44px 1fr 24px;
    grid-template-columns: 280px 1fr;
    height: 100vh;
    width: 100vw;
  }

  /* ── Topbar ── */
  .topbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .topbar__logo-img {
    height: 28px;
    width: auto;
    object-fit: contain;
    flex-shrink: 0;
  }
  .topbar__logo {
    font-family: var(--font-cond);
    font-weight: 900;
    font-size: 18px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
    text-shadow: 0 0 18px rgba(245,158,11,.45);
  }
  .topbar__subtitle {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .topbar__spacer { flex: 1; }
  .topbar__server {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted);
  }
  .status-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 3px;
    font-family: var(--font-cond);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border: 1px solid transparent;
    transition: all .3s;
  }
  .status-pill.online  { color: var(--green); border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.08); }
  .status-pill.offline { color: var(--red);   border-color: rgba(239,68,68,.3);  background: rgba(239,68,68,.08);  }
  .status-pill.connecting { color: var(--amber); border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.08); }
  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    animation: pulse 1.8s ease-in-out infinite;
  }
  .online .status-dot  { background: var(--green); }
  .offline .status-dot { background: var(--red);   animation: none; }
  .connecting .status-dot { background: var(--amber); }
  @keyframes pulse {
    0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
    50%      { opacity: .6; box-shadow: 0 0 0 4px transparent; }
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .sidebar__title {
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    flex: 1;
  }
  .badge {
    padding: 2px 7px;
    border-radius: 2px;
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--panel);
    color: var(--amber);
    border: 1px solid var(--amber-dim);
  }
  .sidebar__search {
    padding: 8px 14px;
    border-bottom: 1px solid var(--border);
  }
  .search-input {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 6px 10px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 11px;
    outline: none;
    transition: border-color .2s;
  }
  .search-input:focus { border-color: var(--amber); }
  .search-input::placeholder { color: var(--muted); }

  .template-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
  }
  .template-list::-webkit-scrollbar { width: 4px; }
  .template-list::-webkit-scrollbar-track { background: transparent; }
  .template-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .template-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: all .15s;
    user-select: none;
  }
  .template-item:hover     { background: var(--panel); border-left-color: var(--amber-dim); }
  .template-item.selected  { background: rgba(245,158,11,.08); border-left-color: var(--amber); }
  .template-item__icon {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--amber);
    opacity: .7;
    width: 14px;
    text-align: center;
  }
  .template-item__name {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .template-item.selected .template-item__name { color: var(--amber); }
  .template-item__path {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--muted);
  }

  .sidebar__refresh {
    padding: 10px 14px;
    border-top: 1px solid var(--border);
  }

  /* ── Main ── */
  .main {
    display: grid;
    grid-template-rows: 1fr 180px;
    overflow: hidden;
  }

  /* ── Control Panel ── */
  .control-panel {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .control-panel::-webkit-scrollbar { width: 4px; }
  .control-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* ── Section ── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Channel / Layer Row ── */
  .channel-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .field-group { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    font-family: var(--font-cond);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .field-input, .field-select {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 7px 10px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    width: 100%;
    -webkit-appearance: none;
  }
  .field-input:focus, .field-select:focus {
    border-color: var(--amber);
    box-shadow: 0 0 0 2px rgba(245,158,11,.12);
  }

  /* ── Preview panel ── */
  .preview-panel {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    flex-direction: column;
  }
  .preview-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .preview-toolbar span {
    font-family: var(--font-cond);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .preview-frame {
    width: 960px;
    height: 540px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: #000;
    position: relative;
    overflow: hidden;
  }
  .preview-frame iframe {
    position: absolute;
    left: -480px;
    top: -270px;
    width: 1920px;
    height: 1080px;
    transform: scale(.5);
    transform-origin: top left;
  }

  /* ── Transport bar ── */
  .transport-bar {
    background: var(--panel);
    border-top: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .transport-label {
    font-family: var(--font-cond);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-right: 4px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border-radius: 3px;
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .15s;
    user-select: none;
    position: relative;
    overflow: hidden;
  }
  .btn:disabled { opacity: .35; cursor: not-allowed; }
  .btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: white;
    opacity: 0;
    transition: opacity .1s;
  }
  .btn:active:not(:disabled)::after { opacity: .06; }

  .btn-play {
    background: rgba(16,185,129,.12);
    border-color: rgba(16,185,129,.4);
    color: var(--green);
  }
  .btn-play:hover:not(:disabled) {
    background: rgba(16,185,129,.2);
    border-color: var(--green);
    box-shadow: 0 0 12px rgba(16,185,129,.2);
  }

  .btn-update {
    background: rgba(59,130,246,.12);
    border-color: rgba(59,130,246,.4);
    color: var(--blue);
  }
  .btn-update:hover:not(:disabled) {
    background: rgba(59,130,246,.2);
    border-color: var(--blue);
    box-shadow: 0 0 12px rgba(59,130,246,.2);
  }

  .btn-stop {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.4);
    color: var(--red);
  }
  .btn-stop:hover:not(:disabled) {
    background: rgba(239,68,68,.2);
    border-color: var(--red);
    box-shadow: 0 0 12px rgba(239,68,68,.2);
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 11px;
    letter-spacing: 1.5px;
  }

  .btn-ghost {
    background: transparent;
    border-color: var(--border);
    color: var(--muted);
  }
  .btn-ghost:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }

  .btn-amber {
    background: rgba(245,158,11,.12);
    border-color: rgba(245,158,11,.4);
    color: var(--amber);
  }
  .btn-amber:hover:not(:disabled) { background: rgba(245,158,11,.2); border-color: var(--amber); }

  .transport-spacer { flex: 1; }

  /* ── Playlist ── */
  .playlist {
    margin-top: 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--panel);
  }
  .playlist-header,
  .playlist-row {
    display: grid;
    grid-template-columns: 40px 1.6fr 0.7fr 110px 120px;
    gap: 8px;
    align-items: center;
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .playlist-header {
    background: rgba(15,23,42,.9);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1.4px;
    font-size: 10px;
  }
  .playlist-row {
    border-top: 1px solid rgba(15,23,42,.9);
    cursor: default;
  }
  .playlist-row:nth-child(even) {
    background: rgba(15,23,42,.6);
  }
  .playlist-row:hover {
    background: rgba(30,64,175,.35);
  }
  .playlist-row__index {
    color: var(--muted);
  }
  .playlist-row__template {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .playlist-row__route {
    color: var(--amber);
  }
  .playlist-row__actions {
    display: flex;
    gap: 4px;
  }
  .playlist-row__air {
    justify-self: flex-end;
    min-width: 54px;
    text-align: center;
    font-family: var(--font-cond);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 24px;
    border: 1px solid rgba(248,113,113,.8);
    color: #fecaca;
    background: radial-gradient(circle at 0 0, rgba(248,113,113,.45), transparent);
    box-shadow: 0 0 14px rgba(248,113,113,.45);
    animation: airPulse 1.4s ease-in-out infinite;
  }
  @keyframes airPulse {
    0%, 100% { transform: translateX(0); opacity: 1; }
    50% { transform: translateX(-4px); opacity: .8; }
  }

  /* ── Footer ── */
  .footer {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: #05060a;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
  }
  .footer__left {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .footer__brand {
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--amber);
  }
  .footer__right {
    text-align: right;
    line-height: 1.2;
  }

  /* ── Activity log ── */
  .log-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .last-cmd {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    max-width: 360px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .last-cmd span { color: var(--amber); }

  /* ── Toast ── */
  .toast-container {
    position: fixed;
    bottom: 200px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 999;
    pointer-events: none;
  }
  .toast {
    padding: 8px 14px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 11px;
    border: 1px solid;
    animation: slideIn .2s ease, fadeOut .3s ease 2.5s forwards;
    pointer-events: none;
  }
  .toast.ok    { background: rgba(16,185,129,.12);  border-color: rgba(16,185,129,.4);  color: var(--green); }
  .toast.error { background: rgba(239,68,68,.12);   border-color: rgba(239,68,68,.4);   color: var(--red); }
  .toast.info  { background: rgba(245,158,11,.1);   border-color: rgba(245,158,11,.3);  color: var(--amber); }

  @keyframes slideIn {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes fadeOut {
    to { opacity: 0; transform: translateY(-4px); }
  }

  /* ── Selected template info ── */
  .template-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(245,158,11,.06);
    border: 1px solid rgba(245,158,11,.2);
    border-radius: 3px;
  }
  .template-info__name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--amber);
    flex: 1;
  }
  .template-info__clear {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    transition: color .15s;
  }
  .template-info__clear:hover { color: var(--red); }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 80px;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    border: 1px dashed var(--border);
    border-radius: 3px;
  }
  .empty-state__icon { font-size: 22px; opacity: .4; }

  .loading-spinner {
    display: inline-block;
    width: 12px; height: 12px;
    border: 2px solid var(--border);
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Inject styles ────────────────────────────────────────────────────────────
(function injectStyles() {
  const existing = document.getElementById("caspar-styles");
  if (existing) return;
  const el = document.createElement("style");
  el.id = "caspar-styles";
  el.textContent = STYLE;
  document.head.appendChild(el);
})();

// ─── Toast hook ───────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

// ─── Dev logger (frontend → backend) ──────────────────────────────────────────
function useDevLogger() {
  const log = useCallback((event, payload) => {
    try {
      // Local console for quick inspection
      console.log("[PixelPush]", event, payload);
      // Backend log sink
      socket.emit("CLIENT_LOG", {
        event,
        payload,
        ts: Date.now(),
      });
    } catch {
      // ignore
    }
  }, []);
  return log;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Connection
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Channel / Layer
  const [channel, setChannel] = useState(String(DEFAULT_CHANNEL));
  const [layer, setLayer] = useState(String(DEFAULT_LAYER));

  // Preview iframe
  const iframeRef = useRef(null);

  // Activity
  const [lastCommand, setLastCommand] = useState(null);

  // Playlist (CGClient_OK-style, simplified)
  const [playlist, setPlaylist] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const nextRowId = useRef(1);

  const { toasts, add: addToast } = useToasts();
  const devLog = useDevLogger();

  // ── Socket.io events ────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on("connect", () => {
      setConnecting(false);
      addToast("Socket connected", "ok");
      devLog("socket_connect", {});
    });
    socket.on("disconnect", () => {
      setConnecting(false);
      devLog("socket_disconnect", {});
    });
    socket.on("caspar_status", ({ connected: c }) => {
      setConnected(c);
      setConnecting(false);
      addToast(c ? "CasparCG Online" : "CasparCG Offline", c ? "ok" : "error");
       devLog("caspar_status", { connected: c });
    });
    socket.on("command_sent", (payload) => {
      setLastCommand(payload.command);
      devLog("amcp_ok", payload);
    });
    socket.on("command_error", (payload) => {
      addToast(`Error: ${payload.error}`, "error");
      devLog("amcp_error", payload);
    });
    return () => socket.removeAllListeners();
  }, []);

  // ── Fetch templates (CGClient_OK style: Socket GET_TEMPLATES or REST fallback) ──
  const fetchTemplates = useCallback(() => {
    setTemplatesLoading(true);

    const applyResult = (data) => {
      if (data?.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
        addToast(`${data.templates.length} templates loaded`, "ok");
        devLog("templates_loaded", {
          source: data.source || "unknown",
          count: data.templates.length,
        });
      } else {
        addToast(data?.error || "Failed to load templates", "error");
        setTemplates([]);
        devLog("templates_failed", { error: data?.error });
      }
      setTemplatesLoading(false);
    };

    if (socket.connected) {
      socket.emit("GET_TEMPLATES", {}, (data) => {
        applyResult(data || { success: false });
      });
    } else {
      fetch(`${SERVER_URL}/api/templates`)
        .then((res) => res.json())
        .then(applyResult)
        .catch(() => {
          addToast("Cannot reach backend server", "error");
          setTemplatesLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const handler = (data) => {
      if (data?.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    };
    socket.on("templates_list", handler);
    return () => socket.off("templates_list", handler);
  }, []);

  // ── Preview controls ─────────────────────────────────────────────────────────
  const previewUrl = selectedTemplate
    ? `${TEMPLATE_PREVIEW_BASE}/${String(selectedTemplate.path || selectedTemplate.name).toLowerCase()}.html`
    : null;

  const handlePreviewPlay = () => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (win && typeof win.play === "function") {
        win.play();
      }
    } catch (e) {
      console.error("Preview play failed", e);
      addToast("Preview play failed", "error");
    }
  };

  const handlePreviewStop = () => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (win && typeof win.stop === "function") {
        win.stop();
      }
    } catch (e) {
      console.error("Preview stop failed", e);
      addToast("Preview stop failed", "error");
    }
  };

  // ── Transport actions ────────────────────────────────────────────────────────
  const emit = (event, extra = {}) => {
    if (!selectedTemplate && event !== "STOP_LAYER") {
      addToast("Select a template first", "error");
      return;
    }
    const payload = {
      channel: parseInt(channel) || 1,
      layer: parseInt(layer) || 20,
      template: selectedTemplate?.path,
      data: {},
      ...extra,
    };
    devLog("amcp_emit", { event, payload });
    socket.emit(event, payload, (ack) => {
      if (ack?.success) addToast(`${event} OK`, "ok");
      else addToast(ack?.error || "Unknown error", "error");
    });
  };

  // ── Playlist helpers ─────────────────────────────────────────────────────────
  const handleAddToPlaylist = () => {
    if (!selectedTemplate) {
      addToast("Select a template first", "error");
      return;
    }
    const ch = parseInt(channel) || DEFAULT_CHANNEL;
    const ly = parseInt(layer) || DEFAULT_LAYER;
    const row = {
      id: nextRowId.current++,
      template: selectedTemplate,
      channel: ch,
      layer: ly,
      onAir: false,
    };
    setPlaylist((p) => [...p, row]);
    setSelectedRow(row.id);
    devLog("playlist_add", { row });
  };

  const markOnAir = (rowId) => {
    setPlaylist((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, onAir: true } : { ...r, onAir: false }))
    );
  };

  const handleRowPlay = (row) => {
    setChannel(String(row.channel));
    setLayer(String(row.layer));
    setSelectedTemplate(row.template);
    emit("PLAY_TEMPLATE", {
      channel: row.channel,
      layer: row.layer,
      template: row.template.path || row.template.name,
    });
    markOnAir(row.id);
    devLog("playlist_play", { rowId: row.id });
  };

  const handleRowStop = (row) => {
    emit("STOP_LAYER", { channel: row.channel, layer: row.layer, template: undefined });
    setPlaylist((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, onAir: false } : r))
    );
    devLog("playlist_stop", { rowId: row.id });
  };

  const handleRowPreview = (row) => {
    setChannel(String(row.channel));
    setLayer(String(row.layer));
    setSelectedTemplate(row.template);
    // fire local preview play after iframe loads
    setTimeout(() => handlePreviewPlay(), 200);
    devLog("playlist_preview", { rowId: row.id });
  };

  // ── Filtered templates ───────────────────────────────────────────────────────
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const statusClass = connecting ? "connecting" : connected ? "online" : "offline";
  const statusLabel = connecting ? "Connecting" : connected ? "Online" : "Offline";

  return (
    <>
      <div className="app">
        {/* ── Topbar ── */}
        <header className="topbar">
          <img src="/assets/logo/dbc-news.svg" alt="PixelPush" className="topbar__logo-img" />
          <div className="topbar__logo">PixelPush</div>
          <div className="topbar__subtitle">HTML Template Broadcast Dashboard</div>
          <div className="topbar__spacer" />
          <div className="topbar__server">{CASPAR_HOST}:{CASPAR_PORT}</div>
          <div className={`status-pill ${statusClass}`}>
            <div className="status-dot" />
            {statusLabel}
          </div>
        </header>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar__header">
            <span className="sidebar__title">Template Library</span>
            {templatesLoading
              ? <div className="loading-spinner" />
              : <span className="badge">{templates.length}</span>
            }
          </div>
          <div className="sidebar__search">
            <input
              className="search-input"
              placeholder="Search templates…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
          </div>
          <div className="template-list">
            {filteredTemplates.length === 0 && (
              <div style={{ padding: "20px 14px", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {templatesLoading ? "Loading…" : "No templates found"}
              </div>
            )}
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className={`template-item ${selectedTemplate?.id === tpl.id ? "selected" : ""}`}
                onClick={() => setSelectedTemplate(tpl)}
              >
                <div className="template-item__icon">▶</div>
                <div className="template-item__name" title={tpl.path}>{tpl.name}</div>
              </div>
            ))}
          </div>
          <div className="sidebar__refresh">
            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={fetchTemplates}>
              {templatesLoading ? <><div className="loading-spinner" /> Fetching…</> : "↺  Refresh"}
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="main">
          <div className="control-panel">

            {/* Selected template */}
            <div>
              <div className="section-label">Selected Template</div>
              {selectedTemplate ? (
                <div className="template-info">
                  <div className="template-item__icon">▶</div>
                  <div className="template-info__name">{selectedTemplate.path}</div>
                  <button className="template-info__clear" onClick={() => setSelectedTemplate(null)}>✕</button>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state__icon">◈</div>
                  <span>Select a template from the library</span>
                </div>
              )}
            </div>

            {/* Channel / Layer */}
            <div>
              <div className="section-label">Output Routing</div>
              <div className="channel-row">
                <div className="field-group">
                  <label className="field-label">Channel</label>
                  <input className="field-input" type="number" min={1} max={16}
                    value={channel} onChange={(e) => setChannel(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Layer</label>
                  <input className="field-input" type="number" min={1} max={99}
                    value={layer} onChange={(e) => setLayer(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Target</label>
                  <input className="field-input" readOnly
                    value={`${channel}-${layer}`}
                    style={{ color: "var(--amber)", cursor: "default" }} />
                </div>
              </div>
            </div>

            {/* Playlist */}
            <div>
              <div className="section-label">
                Playlist
              </div>
              <div className="playlist">
                <div className="playlist-header">
                  <div>#</div>
                  <div>Template</div>
                  <div>Route</div>
                  <div>Controls</div>
                  <div>AIR</div>
                </div>
                {playlist.length === 0 && (
                  <div className="playlist-row">
                    <div className="playlist-row__index">–</div>
                    <div className="playlist-row__template" style={{ color: "var(--muted)" }}>
                      No items yet. Add from Selected Template.
                    </div>
                    <div />
                    <div />
                    <div />
                  </div>
                )}
                {playlist.map((row, idx) => (
                  <div
                    key={row.id}
                    className="playlist-row"
                    onClick={() => setSelectedRow(row.id)}
                    style={
                      row.id === selectedRow
                        ? { boxShadow: "inset 0 0 0 1px rgba(59,130,246,.65)" }
                        : undefined
                    }
                  >
                    <div className="playlist-row__index">{idx + 1}</div>
                    <div className="playlist-row__template">
                      {row.template.path || row.template.name}
                    </div>
                    <div className="playlist-row__route">
                      {row.channel}-{row.layer}
                    </div>
                    <div className="playlist-row__actions">
                      <button
                        className="btn btn-amber btn-sm"
                        disabled={!connected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowPlay(row);
                        }}
                      >
                        ▶
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={!connected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowStop(row);
                        }}
                      >
                        ■
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowPreview(row);
                        }}
                      >
                        ⌘
                      </button>
                    </div>
                    <div>
                      {row.onAir && <div className="playlist-row__air">AIR</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-amber btn-sm"
                  onClick={handleAddToPlaylist}
                  disabled={!selectedTemplate}
                >
                  + Add from selection
                </button>
              </div>
            </div>

            {/* Template Preview */}
            <div>
              <div className="section-label">Template Preview</div>
              <div className="preview-panel">
                <div className="preview-toolbar">
                  <span>Local Preview</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!selectedTemplate}
                    onClick={handlePreviewPlay}
                  >
                    ▶ Play
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!selectedTemplate}
                    onClick={handlePreviewStop}
                  >
                    ■ Stop
                  </button>
                </div>
                {selectedTemplate && previewUrl ? (
                  <iframe
                    key={previewUrl}
                    ref={iframeRef}
                    className="preview-frame"
                    src={previewUrl}
                    title="Template preview"
                  />
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">⌘</div>
                    <span>Select a template to preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Transport bar ── */}
          <div className="transport-bar">
            <div className="transport-label">Transport</div>

            <button
              className="btn btn-play"
              disabled={!connected || !selectedTemplate}
              onClick={() => emit("PLAY_TEMPLATE")}
            >
              ▶ F0 Play
            </button>

            <button
              className="btn btn-update"
              disabled={!connected || !selectedTemplate}
              onClick={() => emit("UPDATE_TEMPLATE")}
            >
              ⟳ F1 Update
            </button>

            <button
              className="btn btn-stop"
              disabled={!connected}
              onClick={() => emit("STOP_LAYER", { template: undefined })}
            >
              ■ Stop
            </button>

            <div className="transport-spacer" />

            {lastCommand && (
              <div className="last-cmd">
                <span>AMCP › </span>{lastCommand}
              </div>
            )}
          </div>
        </main>

        <footer className="footer">
          <div className="footer__left">
            <span className="footer__brand">PixelPush</span>
            <span>CasparCG HTML Ticker Client</span>
          </div>
          <div className="footer__right">
            <div>© Ridoy Kanto Joy</div>
            <div>DBC News, Broadcasting Operation &amp; Engineering</div>
            <div>Executive IT · ridoykanto@gmail.com</div>
          </div>
        </footer>
      </div>

      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}
