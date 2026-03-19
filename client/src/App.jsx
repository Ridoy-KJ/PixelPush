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
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f5f5f0;
    --surface:   #ffffff;
    --panel:     #f0f0eb;
    --border:    #ddddd8;
    --border-strong: #c8c8c2;
    --accent:    #1a6bcc;
    --accent-dim:#e8f0fa;
    --green:     #1a7a4a;
    --green-bg:  #e8f5ee;
    --red:       #c0392b;
    --red-bg:    #fdf0ee;
    --blue:      #1a5fa0;
    --blue-bg:   #e8f0fa;
    --text:      #1a1a18;
    --text-2:    #4a4a46;
    --muted:     #8a8a84;
    --font-mono: 'IBM Plex Mono', monospace;
    --font-body: 'IBM Plex Sans', sans-serif;
  }

  html, body, #root {
    height: 100%; width: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 13px;
    overflow: hidden;
  }

  /* ── Layout ── */
  .app {
    display: grid;
    grid-template-rows: 48px 1fr 22px;
    grid-template-columns: 260px 1fr;
    height: 100vh;
    width: 100vw;
  }

  /* ── Topbar ── */
  .topbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .topbar__logo-img {
    height: 26px;
    width: auto;
    object-fit: contain;
    flex-shrink: 0;
  }
  .topbar__logo {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.5px;
    color: var(--text);
  }
  .topbar__subtitle {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.5px;
    padding: 2px 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 3px;
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
    border-radius: 4px;
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    border: 1px solid transparent;
    transition: all .2s;
  }
  .status-pill.online     { color: var(--green); border-color: #b8ddc8; background: var(--green-bg); }
  .status-pill.offline    { color: var(--red);   border-color: #e8c4be; background: var(--red-bg);   }
  .status-pill.connecting { color: var(--blue);  border-color: #b8cce8; background: var(--blue-bg);  }
  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }
  .online .status-dot     { background: var(--green); }
  .offline .status-dot    { background: var(--red); animation: none; }
  .connecting .status-dot { background: var(--blue); }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: .4; }
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
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
  }
  .sidebar__title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    color: var(--text-2);
    flex: 1;
  }
  .badge {
    padding: 1px 7px;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid #c0d4f0;
    font-weight: 500;
  }
  .sidebar__search {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
  }
  .search-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 11px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(26,107,204,.1);
  }
  .search-input::placeholder { color: var(--muted); }

  .template-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .template-list::-webkit-scrollbar { width: 5px; }
  .template-list::-webkit-scrollbar-track { background: var(--panel); }
  .template-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

  .template-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: all .1s;
    user-select: none;
  }
  .template-item:hover    { background: var(--panel); border-left-color: var(--border-strong); }
  .template-item.selected { background: var(--accent-dim); border-left-color: var(--accent); }
  .template-item__icon {
    font-size: 8px;
    color: var(--muted);
    width: 12px;
    text-align: center;
    flex-shrink: 0;
  }
  .template-item.selected .template-item__icon { color: var(--accent); }
  .template-item__name {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .template-item.selected .template-item__name { color: var(--accent); font-weight: 500; }
  .template-item__path {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--muted);
  }

  .sidebar__refresh {
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    background: var(--panel);
  }

  /* ── Main ── */
  .main {
    display: grid;
    overflow: hidden;
  }

  /* ── Control Panel ── */
  .control-panel {
    padding: 18px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
    background: var(--bg);
  }
  .control-panel::-webkit-scrollbar { width: 5px; }
  .control-panel::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

  /* ── Section ── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-2);
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
  .field-group { display: flex; flex-direction: column; gap: 4px; }
  .field-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .field-input, .field-select {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 7px 10px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    width: 100%;
    -webkit-appearance: none;
  }
  .field-input:focus, .field-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(26,107,204,.1);
  }
  .field-input[readonly] {
    background: var(--panel);
    color: var(--accent);
    cursor: default;
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
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-2);
  }
  /* Container div: clips to 960×540 (half of 1920×1080 broadcast canvas) */
  .preview-frame {
    width: 960px;
    height: 540px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: #111;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: inset 0 1px 3px rgba(0,0,0,.08);
  }
  /* The actual iframe is full 1920×1080 and scaled 50% inside the container */
  .preview-frame iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 1920px;
    height: 1080px;
    transform: scale(0.5);
    transform-origin: top left;
    border: none;
    background: #000;
  }

  /* ── Transport bar ── */
  .transport-bar {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 14px 22px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .transport-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-right: 6px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 4px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.3px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .12s;
    user-select: none;
  }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn:active:not(:disabled) { transform: translateY(1px); }

  .btn-play {
    background: var(--green-bg);
    border-color: #a8d8bc;
    color: var(--green);
  }
  .btn-play:hover:not(:disabled) {
    background: #d4eedf;
    border-color: var(--green);
  }

  .btn-update {
    background: var(--blue-bg);
    border-color: #a8c4e8;
    color: var(--blue);
  }
  .btn-update:hover:not(:disabled) {
    background: #d0e0f4;
    border-color: var(--blue);
  }

  .btn-stop {
    background: var(--red-bg);
    border-color: #e0b8b4;
    color: var(--red);
  }
  .btn-stop:hover:not(:disabled) {
    background: #f8dcd8;
    border-color: var(--red);
  }

  .btn-sm {
    padding: 5px 10px;
    font-size: 11px;
  }

  .btn-ghost {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text-2);
  }
  .btn-ghost:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--panel);
    color: var(--text);
  }

  .btn-amber {
    background: #fdf4e0;
    border-color: #e8d090;
    color: #7a5c10;
  }
  .btn-amber:hover:not(:disabled) {
    background: #faecc8;
    border-color: #c8a830;
  }

  .transport-spacer { flex: 1; }

  /* ── Playlist ── */
  .playlist {
    margin-top: 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--surface);
  }
  .playlist-header,
  .playlist-row {
    display: grid;
    gap: 8px;
    align-items: center;
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .playlist-header {
    background: var(--panel);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-size: 10px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-body);
    font-weight: 600;
  }
  .playlist-row {
    border-top: 1px solid var(--border);
    cursor: default;
  }
  .playlist-row:nth-child(even) { background: var(--panel); }
  .playlist-row:hover { background: var(--accent-dim); }
  .playlist-row__index { color: var(--muted); }
  .playlist-row__template {
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .playlist-row__route { color: var(--accent); font-weight: 500; }
  .playlist-row__actions { display: flex; gap: 4px; }
  .playlist-row__air {
    justify-self: flex-end;
    min-width: 44px;
    text-align: center;
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid #e0b8b4;
    color: var(--red);
    background: var(--red-bg);
    animation: airPulse 1.6s ease-in-out infinite;
  }
  @keyframes airPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .6; }
  }

  /* ── Footer ── */
  .footer {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: var(--panel);
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
  }
  .footer__left { display: flex; gap: 8px; align-items: baseline; }
  .footer__brand {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--text-2);
  }
  .footer__right { text-align: right; line-height: 1.4; }

  /* ── Activity log ── */
  .log-bar { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .last-cmd {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    max-width: 380px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .last-cmd span { color: var(--accent); }

  /* ── Toast ── */
  .toast-container {
    position: fixed;
    bottom: 180px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 999;
    pointer-events: none;
  }
  .toast {
    padding: 8px 14px;
    border-radius: 4px;
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;
    animation: slideIn .18s ease, fadeOut .3s ease 2.5s forwards;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
  }
  .toast.ok    { background: var(--green-bg); border-color: #a8d8bc; color: var(--green); }
  .toast.error { background: var(--red-bg);   border-color: #e0b8b4; color: var(--red);   }
  .toast.info  { background: var(--blue-bg);  border-color: #a8c4e8; color: var(--blue);  }

  @keyframes slideIn {
    from { transform: translateX(12px); opacity: 0; }
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
    padding: 9px 14px;
    background: var(--accent-dim);
    border: 1px solid #c0d4f0;
    border-radius: 4px;
  }
  .template-info__name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
    flex: 1;
    font-weight: 500;
  }
  .template-info__clear {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    transition: color .12s;
  }
  .template-info__clear:hover { color: var(--red); }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 72px;
    color: var(--muted);
    font-family: var(--font-body);
    font-size: 12px;
    border: 1px dashed var(--border-strong);
    border-radius: 4px;
    background: var(--surface);
  }
  .empty-state__icon { font-size: 18px; opacity: .3; }

  .loading-spinner {
    display: inline-block;
    width: 11px; height: 11px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Playlist — updated column layout ── */
  .playlist-header,
  .playlist-row {
    grid-template-columns: 32px 1.4fr 0.55fr 118px 105px;
  }

  /* ── Playlist status cell (air badge + timer + count) ── */
  .playlist-row__status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
  }
  .playlist-row__timer {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-2);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 1px 6px;
    letter-spacing: 0.5px;
  }
  .playlist-row__count {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--muted);
  }

  /* ── Main — auto bottom row so log can flex ── */
  .main { grid-template-rows: 1fr auto; }

  /* ── Log panel ── */
  .log-panel {
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: height .18s ease;
    flex-shrink: 0;
  }
  .log-panel.expanded  { height: 154px; }
  .log-panel.minimized { height: 34px;  }

  .log-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    height: 34px;
    flex-shrink: 0;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }
  .log-header__title {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-2);
    white-space: nowrap;
  }
  .log-header__live {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .log-header__live b { color: var(--accent); font-weight: 500; }
  .log-minimize-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--muted);
    font-size: 10px;
    padding: 2px 8px;
    cursor: pointer;
    font-family: var(--font-body);
    font-weight: 500;
    transition: all .1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .log-minimize-btn:hover { border-color: var(--border-strong); color: var(--text); }

  .log-entries {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }
  .log-entries::-webkit-scrollbar { width: 4px; }
  .log-entries::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .log-entry {
    display: grid;
    grid-template-columns: 68px 42px 1fr 64px;
    gap: 8px;
    align-items: center;
    padding: 5px 16px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .log-entry:last-child { border-bottom: none; }
  .log-entry__time  { color: var(--muted); }
  .log-entry__event { font-weight: 500; letter-spacing: 0.5px; }
  .log-entry__event.play { color: var(--green); }
  .log-entry__event.stop { color: var(--red);   }
  .log-entry__template {
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .log-entry__route { color: var(--accent); text-align: right; }

  .log-empty {
    padding: 14px 16px;
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--muted);
  }
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

  // Air log (replaces lastCommand)
  const [airLog, setAirLog] = useState([]);
  const [logMinimized, setLogMinimized] = useState(false);
  const airLogId = useRef(1);

  // Tick every second for real-time on-air timers
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Playlist
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
    socket.on("command_sent",  (p) => devLog("amcp_ok",    p));
    socket.on("command_error", (p) => { addToast(`Error: ${p.error}`, "error"); devLog("amcp_error", p); });
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
  // Use the /api/preview proxy (same origin) instead of a direct CasparCG URL.
  // Same-origin is required so the browser allows iframe.contentWindow.play/stop().
  const previewUrl = selectedTemplate
    ? `/api/preview?template=${encodeURIComponent(
        String(selectedTemplate.path || selectedTemplate.name)
      )}`
    : null;

  const handlePreviewPlay = () => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (!win) { addToast("Preview not ready", "error"); return; }
      // Direct call works because the proxy serves it same-origin
      if (typeof win.play === "function") {
        win.play();
        devLog("preview_play", { method: "direct" });
      } else {
        // Fallback: some templates listen for postMessage instead
        win.postMessage({ action: "play" }, "*");
        devLog("preview_play", { method: "postMessage" });
      }
    } catch (e) {
      console.error("Preview play failed", e);
      addToast("Preview play failed — check console", "error");
    }
  };

  const handlePreviewStop = () => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (!win) { addToast("Preview not ready", "error"); return; }
      if (typeof win.stop === "function") {
        win.stop();
        devLog("preview_stop", { method: "direct" });
      } else {
        win.postMessage({ action: "stop" }, "*");
        devLog("preview_stop", { method: "postMessage" });
      }
    } catch (e) {
      console.error("Preview stop failed", e);
      addToast("Preview stop failed — check console", "error");
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

  // ── Air log helper ───────────────────────────────────────────────────────────
  const addToAirLog = useCallback((event, template, ch, ly) => {
    const now = new Date();
    const ts = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAirLog((prev) => [
      { id: airLogId.current++, event, template: String(template), channel: ch, layer: ly, ts },
      ...prev,
    ].slice(0, 40));
  }, []);

  // ── Playlist helpers ─────────────────────────────────────────────────────────
  const handleAddToPlaylist = () => {
    if (!selectedTemplate) { addToast("Select a template first", "error"); return; }
    const ch = parseInt(channel) || DEFAULT_CHANNEL;
    const ly = parseInt(layer)   || DEFAULT_LAYER;
    const row = {
      id: nextRowId.current++,
      template: selectedTemplate,
      channel: ch, layer: ly,
      onAir: false,
      playCount: 0,
      airStartTime: null,
    };
    setPlaylist((p) => [...p, row]);
    setSelectedRow(row.id);
    devLog("playlist_add", { row });
  };

  const handleRowPlay = (row) => {
    if (!connected) { addToast("CasparCG not connected", "error"); return; }
    const tplPath = row.template.path || row.template.name;

    // Update playlist: mark this row on-air, clear any other row using same ch-layer
    setPlaylist((rows) => rows.map((r) => {
      if (r.id === row.id) {
        return { ...r, onAir: true, playCount: r.playCount + 1, airStartTime: Date.now() };
      }
      // Same output target → clear its AIR flag (they'd overlap on CasparCG anyway)
      if (r.channel === row.channel && r.layer === row.layer) {
        return { ...r, onAir: false, airStartTime: null };
      }
      return r;
    }));

    setSelectedTemplate(row.template);
    socket.emit(
      "PLAY_TEMPLATE",
      { channel: row.channel, layer: row.layer, template: tplPath, data: {} },
      (ack) => {
        if (ack?.success) addToAirLog("PLAY", tplPath, row.channel, row.layer);
        else addToast(ack?.error || "Play failed", "error");
      }
    );
    devLog("playlist_play", { rowId: row.id });
  };

  const handleRowStop = (row) => {
    if (!connected) { addToast("CasparCG not connected", "error"); return; }
    const tplPath = row.template.path || row.template.name;

    setPlaylist((rows) =>
      rows.map((r) => r.id === row.id ? { ...r, onAir: false, airStartTime: null } : r)
    );
    socket.emit(
      "STOP_LAYER",
      { channel: row.channel, layer: row.layer },
      (ack) => {
        if (ack?.success) addToAirLog("STOP", tplPath, row.channel, row.layer);
        else addToast(ack?.error || "Stop failed", "error");
      }
    );
    devLog("playlist_stop", { rowId: row.id });
  };

  const handleRowRemove = (row) => {
    // If currently on air, send a stop command first
    if (row.onAir) {
      socket.emit("STOP_LAYER", { channel: row.channel, layer: row.layer });
      addToAirLog("STOP", row.template.path || row.template.name, row.channel, row.layer);
    }
    setPlaylist((p) => p.filter((r) => r.id !== row.id));
    if (selectedRow === row.id) setSelectedRow(null);
    devLog("playlist_remove", { rowId: row.id });
  };

  const handleRowPreview = (row) => {
    setSelectedTemplate(row.template);
    setChannel(String(row.channel));
    setLayer(String(row.layer));
    setTimeout(() => handlePreviewPlay(), 220);
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
                    style={{ color: "var(--accent)", cursor: "default" }} />
                </div>
              </div>
            </div>

            {/* Playlist */}
            <div>
              <div className="section-label">Playlist</div>
              <div className="playlist">
                <div className="playlist-header">
                  <div>#</div>
                  <div>Template</div>
                  <div>Route</div>
                  <div>Controls</div>
                  <div style={{ textAlign: "right" }}>Status</div>
                </div>
                {playlist.length === 0 && (
                  <div className="playlist-row">
                    <div className="playlist-row__index">–</div>
                    <div className="playlist-row__template" style={{ color: "var(--muted)" }}>
                      No items — select a template and click Add
                    </div>
                    <div /><div /><div />
                  </div>
                )}
                {playlist.map((row, idx) => {
                  // Real-time on-air duration — tick dependency forces re-render each second
                  void tick;
                  const elapsed = row.airStartTime
                    ? Math.floor((Date.now() - row.airStartTime) / 1000)
                    : 0;
                  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
                  const ss = String(elapsed % 60).padStart(2, "0");

                  return (
                    <div
                      key={row.id}
                      className="playlist-row"
                      onClick={() => setSelectedRow(row.id)}
                      style={row.id === selectedRow
                        ? { background: "var(--accent-dim)", borderLeft: "3px solid var(--accent)" }
                        : undefined}
                    >
                      <div className="playlist-row__index">{idx + 1}</div>
                      <div className="playlist-row__template" title={row.template.path}>
                        {row.template.path || row.template.name}
                      </div>
                      <div className="playlist-row__route">{row.channel}-{row.layer}</div>
                      <div className="playlist-row__actions">
                        {/* Play */}
                        <button className="btn btn-play btn-sm" disabled={!connected}
                          onClick={(e) => { e.stopPropagation(); handleRowPlay(row); }}>
                          ▶
                        </button>
                        {/* Stop */}
                        <button className="btn btn-stop btn-sm" disabled={!connected || !row.onAir}
                          onClick={(e) => { e.stopPropagation(); handleRowStop(row); }}>
                          ■
                        </button>
                        {/* Preview */}
                        <button className="btn btn-ghost btn-sm" title="Load in preview"
                          onClick={(e) => { e.stopPropagation(); handleRowPreview(row); }}>
                          ⊙
                        </button>
                        {/* Remove */}
                        <button className="btn btn-ghost btn-sm" title="Remove from playlist"
                          style={{ color: "var(--red)", borderColor: "var(--red)" }}
                          onClick={(e) => { e.stopPropagation(); handleRowRemove(row); }}>
                          ✕
                        </button>
                      </div>
                      <div className="playlist-row__status">
                        {row.onAir && (
                          <>
                            <div className="playlist-row__air">AIR</div>
                            <div className="playlist-row__timer">{mm}:{ss}</div>
                          </>
                        )}
                        {row.playCount > 0 && (
                          <div className="playlist-row__count">×{row.playCount} plays</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-amber btn-sm"
                  onClick={handleAddToPlaylist} disabled={!selectedTemplate}>
                  + Add to playlist
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
                  <div className="preview-frame">
                    <iframe
                      key={previewUrl}
                      ref={iframeRef}
                      src={previewUrl}
                      title="Template preview"
                    />
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">⌘</div>
                    <span>Select a template to preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Log panel (replaces transport bar) ── */}
          {(() => {
            const latest = airLog[0];
            return (
              <div className={`log-panel ${logMinimized ? "minimized" : "expanded"}`}>
                <div className="log-header">
                  <span className="log-header__title">Air Log</span>
                  {latest ? (
                    <span className="log-header__live">
                      <b>{latest.event}</b>
                      {" · "}{latest.template}{" · "}{latest.channel}-{latest.layer}{" · "}{latest.ts}
                    </span>
                  ) : (
                    <span className="log-header__live">No commands sent yet</span>
                  )}
                  <button className="log-minimize-btn"
                    onClick={() => setLogMinimized((m) => !m)}>
                    {logMinimized ? "▲ Expand" : "▼ Minimise"}
                  </button>
                </div>
                {!logMinimized && (
                  <div className="log-entries">
                    {airLog.length === 0 ? (
                      <div className="log-empty">Play or stop a template to see events here.</div>
                    ) : airLog.map((e) => (
                      <div key={e.id} className="log-entry">
                        <span className="log-entry__time">{e.ts}</span>
                        <span className={`log-entry__event ${e.event.toLowerCase()}`}>{e.event}</span>
                        <span className="log-entry__template" title={e.template}>{e.template}</span>
                        <span className="log-entry__route">{e.channel}-{e.layer}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
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
