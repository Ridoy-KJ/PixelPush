/**
 * CasparCG Broadcast Control Server
 * AMCP Protocol Bridge via casparcg-connection + Socket.io
 */

const express = require("express");
const http = require("http");
const path = require("path");
const net = require("net");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const { CasparCG } = require("casparcg-connection");

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const CASPAR_HOST = process.env.CASPAR_HOST || "192.168.25.100";
const CASPAR_PORT = parseInt(process.env.CASPAR_PORT || "5250");
const SCANNER_BASE = process.env.SCANNER_BASE || "http://192.168.25.100:8000/tls";
const TEMPLATE_PREVIEW_BASE = process.env.TEMPLATE_PREVIEW_BASE || `http://${CASPAR_HOST}:8080/templates`;

// ─── Express + HTTP + Socket.io Bootstrap ────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// Serve built React client in production
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// ─── CasparCG Connection ─────────────────────────────────────────────────────
let casparConnected = false;

const caspar = new CasparCG({
  host: CASPAR_HOST,
  port: CASPAR_PORT,
  autoConnect: true,
  autoReconnect: true,
  autoReconnectInterval: 3000,
  autoReconnectAttempts: Infinity,
  onConnected: () => {
    casparConnected = true;
    console.log(`[CasparCG] ✅ Connected to ${CASPAR_HOST}:${CASPAR_PORT}`);
    io.emit("caspar_status", { connected: true, host: CASPAR_HOST, port: CASPAR_PORT });
  },
  onDisconnected: () => {
    casparConnected = false;
    console.warn("[CasparCG] ⚠️  Disconnected. Reconnecting...");
    io.emit("caspar_status", { connected: false });
  },
  onLog: (msg) => console.log(`[CasparCG LOG] ${msg}`),
});

// Low-level AMCP TCP socket (matches legacy CGClient_OK behaviour)
let amcpSocket;

function connectAmcpSocket() {
  if (amcpSocket && !amcpSocket.destroyed) return;

  amcpSocket = new net.Socket();

  amcpSocket.on("error", (err) => {
    console.error("[AMCP socket] error:", err?.message || err);
  });

  amcpSocket.on("close", () => {
    console.warn("[AMCP socket] closed. Reconnecting in 5s…");
    setTimeout(connectAmcpSocket, 5000);
  });

  amcpSocket.connect(CASPAR_PORT, CASPAR_HOST, () => {
    console.log(`[AMCP socket] ✅ Connected to ${CASPAR_HOST}:${CASPAR_PORT}`);
  });
}

connectAmcpSocket();

function buildEscapedJson(data) {
  const payload = data && typeof data === "object" ? data : {};
  const json = JSON.stringify(payload);
  return json.replace(/"/g, '\\"');
}

function sendAmcp(command) {
  if (!amcpSocket || amcpSocket.destroyed) {
    throw new Error("AMCP socket not ready");
  }
  amcpSocket.write(command + "\r\n");
}

/**
 * Fetch template list — CGClient_OK style dual-source:
 * 1) HTTP Scanner (SCANNER_BASE) — primary
 * 2) CasparCG TLS over AMCP — fallback when scanner unavailable
 * Same data flow as CGClient_OK: client requests → backend fetches → returns { allTemplates }
 */
async function fetchTemplatesFromBackend() {
  // ── Source 1: HTTP TLS Scanner (e.g. 172.31.32.1:8000/tls) ──
  try {
    const { data } = await axios.get(SCANNER_BASE, {
      timeout: 5000,
      responseType: "text",
      transformResponse: [(d) => d],
    });

    const text = String(data || "");
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const headerRegex = /^\d{3}\s+TLS\b/i;
    const templateLines =
      lines.length > 1 && headerRegex.test(lines[0]) ? lines.slice(1) : lines;

    if (templateLines.length > 0) {
      const templates = templateLines.map((name, idx) => ({
        id: name,
        name: name.replace(/^"|"$/g, ""),
        path: name.replace(/^"|"$/g, ""),
        type: "template",
        order: idx,
      }));
      return { success: true, templates, source: "scanner" };
    }
  } catch (err) {
    console.warn("[Templates] Scanner failed:", err.message);
  }

  // ── Source 2: CasparCG TLS directly (CGClient_OK style — ns.write("TLS \r\n")) ──
  if (casparConnected) {
    try {
      const result = await caspar.tls();
      const raw = Array.isArray(result) ? result : result?.items || result?.value || [];
      const names = raw
        .map((n) => (typeof n === "string" ? n : String(n || "")).replace(/^"|"$/g, "").trim())
        .filter(Boolean);

      const templates = names.map((name, idx) => ({
        id: name,
        name,
        path: name,
        type: "template",
        order: idx,
      }));

      if (templates.length > 0) {
        console.log("[Templates] Loaded from CasparCG TLS:", templates.length);
        return { success: true, templates, source: "caspar" };
      }
    } catch (err) {
      console.warn("[Templates] CasparCG TLS failed:", err?.message || err);
    }
  }

  return { success: false, templates: [], error: "No template source available" };
}

// ─── REST: Template List (uses shared fetchTemplatesFromBackend) ───────────────
app.get("/api/templates", async (req, res) => {
  const result = await fetchTemplatesFromBackend();
  if (result.success) {
    res.json(result);
  } else {
    res.status(502).json({
      success: false,
      templates: [],
      error: result.error || "Could not reach TLS / template service",
    });
  }
});

// ─── REST: Server / Connection Status ────────────────────────────────────────
app.get("/api/status", (req, res) => {
  res.json({
    caspar: { connected: casparConnected, host: CASPAR_HOST, port: CASPAR_PORT },
    scanner: SCANNER_BASE,
    uptime: process.uptime(),
  });
});

// ─── REST: Raw AMCP command passthrough (power-user escape hatch) ─────────────
app.post("/api/amcp", async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ success: false, error: "No command provided" });
  if (!casparConnected) return res.status(503).json({ success: false, error: "CasparCG not connected" });

  try {
    const result = await caspar.do({ command });
    res.json({ success: true, response: result });
  } catch (err) {
    console.error("[AMCP Raw]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Socket.io – Realtime Control Events ─────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Immediately tell the client the current CasparCG state
  socket.emit("caspar_status", { connected: casparConnected, host: CASPAR_HOST, port: CASPAR_PORT });

  // ── GET_TEMPLATES (CGClient_OK style: client requests → server fetches → ack with list) ──
  socket.on("GET_TEMPLATES", async (payload, ack) => {
    const result = await fetchTemplatesFromBackend();
    if (typeof ack === "function") {
      ack(result);
    } else {
      socket.emit("templates_list", result);
    }
  });

  // ── PLAY / F0 ─────────────────────────────────────────────────────────────
  // Payload: { channel, layer, template, data, autoPlay }
  socket.on("PLAY_TEMPLATE", (payload, ack) => {
    const { channel = 1, layer = 20, template, data = {}, autoPlay = true } = payload;

    if (!template) {
      const err = { success: false, error: "template name is required" };
      if (typeof ack === "function") ack(err);
      return socket.emit("command_error", err);
    }
    if (!casparConnected) {
      const err = { success: false, error: "CasparCG not connected" };
      if (typeof ack === "function") ack(err);
      return socket.emit("command_error", err);
    }

    // AMCP: CG <ch-lyr> ADD <cg-layer> "<template>" <autoPlay 0|1> "<data>"
    const amcpCommand = `CG ${channel}-${layer} ADD 1 "${template}" ${autoPlay ? 1 : 0} "${buildEscapedJson(data)}"`;

    try {
      console.log(`[AMCP] → ${amcpCommand}`);
      sendAmcp(amcpCommand);
      const ok = { success: true, command: amcpCommand, channel, layer };
      if (typeof ack === "function") ack(ok);
      io.emit("command_sent", ok);
    } catch (err) {
      console.error("[AMCP PLAY_TEMPLATE]", err?.message || err);
      const errPayload = { success: false, error: err?.message || String(err) };
      if (typeof ack === "function") ack(errPayload);
      socket.emit("command_error", errPayload);
    }
  });

  // ── UPDATE / F1 ───────────────────────────────────────────────────────────
  // Payload: { channel, layer, data }
  socket.on("UPDATE_TEMPLATE", async (payload, ack) => {
    const { channel = 1, layer = 20, data = {} } = payload;
    if (!casparConnected) {
      const err = { success: false, error: "CasparCG not connected" };
      if (typeof ack === "function") ack(err);
      return socket.emit("command_error", err);
    }

    // AMCP: CG <ch-lyr> UPDATE <cg-layer> "<data>"
    const amcpCommand = `CG ${channel}-${layer} UPDATE 1 "${buildEscapedJson(data)}"`;

    try {
      console.log(`[AMCP] → ${amcpCommand}`);
      sendAmcp(amcpCommand);
      const ok = { success: true, command: amcpCommand, channel, layer };
      if (typeof ack === "function") ack(ok);
      io.emit("command_sent", ok);
    } catch (err) {
      console.error("[AMCP UPDATE_TEMPLATE]", err?.message || err);
      const errPayload = { success: false, error: err?.message || String(err) };
      if (typeof ack === "function") ack(errPayload);
      socket.emit("command_error", errPayload);
    }
  });

  // ── STOP ──────────────────────────────────────────────────────────────────
  // Payload: { channel, layer }
  socket.on("STOP_LAYER", async (payload, ack) => {
    const { channel = 1, layer = 20 } = payload;
    if (!casparConnected) {
      const err = { success: false, error: "CasparCG not connected" };
      if (typeof ack === "function") ack(err);
      return socket.emit("command_error", err);
    }

    // AMCP: CG <ch-lyr> STOP <cg-layer>
    const amcpCommand = `CG ${channel}-${layer} STOP 1`;

    try {
      console.log(`[AMCP] → ${amcpCommand}`);
      sendAmcp(amcpCommand);
      const ok = { success: true, command: amcpCommand, channel, layer };
      if (typeof ack === "function") ack(ok);
      io.emit("command_sent", ok);
    } catch (err) {
      console.error("[AMCP STOP_LAYER]", err?.message || err);
      const errPayload = { success: false, error: err?.message || String(err) };
      if (typeof ack === "function") ack(errPayload);
      socket.emit("command_error", errPayload);
    }
  });

  // ── CLEAR CHANNEL ─────────────────────────────────────────────────────────
  // Payload: { channel }
  socket.on("CLEAR_CHANNEL", async (payload, ack) => {
    const { channel = 1 } = payload;
    const amcpCommand = `CLEAR ${channel}`;
    try {
      sendAmcp(amcpCommand);
      const ok = { success: true, command: amcpCommand };
      if (typeof ack === "function") ack(ok);
      io.emit("command_sent", ok);
    } catch (err) {
      const errPayload = { success: false, error: err?.message || String(err) };
      if (typeof ack === "function") ack(errPayload);
      socket.emit("command_error", errPayload);
    }
  });

  // ── CLIENT_LOG (frontend developer telemetry) ───────────────────────────────
  socket.on("CLIENT_LOG", (payload = {}) => {
    try {
      const { event, ts } = payload || {};
      console.log(
        `[CLIENT_LOG] ${socket.id} :: ${event || "event"} ::`,
        JSON.stringify(payload)
      );
    } catch (e) {
      console.error("[CLIENT_LOG] failed to print", e);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ─── REST: Template Preview Proxy ────────────────────────────────────────────
// Fetches the HTML template from CasparCG and serves it from the SAME origin
// as the dashboard, so the browser allows iframe.contentWindow.play() / .stop().
// Relative asset paths inside the template are rewritten to absolute CasparCG URLs
// so images/fonts/scripts resolve correctly inside the iframe.
app.get("/api/preview", async (req, res) => {
  const { template } = req.query;
  if (!template) {
    return res.status(400).send("Missing ?template= param");
  }

  // Normalise: strip leading slash, ensure no double-slash
  const safePath = String(template).replace(/^\/+/, "");
  const templateUrl = `${TEMPLATE_PREVIEW_BASE}/${safePath}.html`;

  try {
    const { data } = await axios.get(templateUrl, {
      timeout: 7000,
      responseType: "text",
      transformResponse: [(d) => d], // raw string — don't let axios parse it
    });

    // Rewrite every relative src/href so assets load from CasparCG, not localhost
    const base = TEMPLATE_PREVIEW_BASE.replace(/\/$/, "");
    const rewritten = String(data)
      // src="..." and href="..." — skip absolute URLs and data URIs
      .replace(
        /(src|href)=(["'])(?!https?:\/\/|\/\/|data:|#)([^"']+)\2/g,
        (_, attr, quote, path) => `${attr}=${quote}${base}/${path.replace(/^\//, "")}${quote}`
      )
      // url(...) inside inline styles / CSS
      .replace(
        /url\((?!['"]?(?:https?:\/\/|\/\/|data:))(['"]?)([^)'"]+)\1\)/g,
        (_, quote, path) => `url(${quote}${base}/${path.replace(/^\//, "")}${quote})`
      );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Allow this page to be iframed by our own origin only
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(rewritten);
  } catch (err) {
    console.error("[Preview proxy] Failed to fetch:", templateUrl, err.message);
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
        <head><style>
          body { background: #0a0b0d; color: #ef4444; font-family: monospace;
                 padding: 24px; margin: 0; }
          h3   { color: #f59e0b; margin: 0 0 12px; letter-spacing: 2px; }
          code { background: #111318; padding: 2px 6px; border-radius: 3px;
                 color: #e2e8f0; }
        </style></head>
        <body>
          <h3>PREVIEW ERROR</h3>
          <p>Could not fetch template from CasparCG:</p>
          <code>${templateUrl}</code>
          <p style="color:#64748b;margin-top:12px">${err.message}</p>
        </body>
      </html>
    `);
  }
});

// SPA fallback: serve index.html for non-API routes (production)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎬 CasparCG Control Server running on http://localhost:${PORT}`);
  console.log(`   CasparCG target : ${CASPAR_HOST}:${CASPAR_PORT}`);
  console.log(`   Media Scanner   : ${SCANNER_BASE}\n`);
});