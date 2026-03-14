# PixelPush

**A real-time broadcast control dashboard for CasparCG HTML templates over AMCP.**

PixelPush bridges a React web UI directly to a CasparCG graphics server — giving operators a searchable template library, live preview, and one-click **Play / Update / Stop** control for on-air broadcast graphics.

Built and deployed at **[DBC News](https://dbcnews.tv)** for live broadcast operations.

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io)
![CasparCG](https://img.shields.io/badge/CasparCG-AMCP-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What It Does

In a live broadcast environment, graphics operators need to push lower-thirds, tickers, and overlays to air with zero latency and zero errors. PixelPush replaces manual AMCP terminal commands with a clean web dashboard that any operator can use.

- 🔴 **On-air control** — Play, Update, and Stop CasparCG HTML templates in real time
- 📺 **Live preview** — Iframe preview of the actual template before sending to output
- 📂 **Template library** — Auto-loaded from the CasparCG scanner or AMCP TLS fallback
- 🔌 **WebSocket-first** — Sub-100ms command delivery via Socket.io
- 📡 **Connection status** — Live CasparCG Online / Offline / Connecting indicator
- 🗂️ **Output routing** — Configurable channel and layer (default `1-20`)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PixelPush Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  React (Vite :3000)                                                      │
│       │  socket.io-client ──── Play / Stop / Update / Get Templates      │
│       │  fetch()          ──── REST fallback                             │
│       ▼                                                                  │
│  Express + Socket.io (:4000)                                             │
│       │                                                                  │
│       ├── GET /api/templates ──► HTTP scanner  ──► TLS text list         │
│       │                                   or ──► caspar.tls() via AMCP  │
│       │                                                                  │
│       └── AMCP (raw TCP)    ──► CasparCG Server :5250                   │
│                CG ADD / UPDATE / STOP / CLEAR                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
PixelPush/
├── server.js             # Express + Socket.io backend; AMCP TCP bridge
├── package.json          # Backend dependencies
├── .env.example          # Environment variable template
├── README.md
│
├── assets/
│   └── logo/
│       └── dbc-news.svg  # Dashboard logo
│
└── client/
    ├── index.html        # Vite entry point
    ├── package.json      # Frontend dependencies
    ├── vite.config.js    # Proxy: /api and /socket.io → :4000
    └── src/
        ├── main.jsx      # React entry
        └── App.jsx       # Dashboard UI (template library, transport bar, preview)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running [CasparCG Server](https://github.com/CasparCG/server) (2.3+)
- Network access to the CasparCG host

### 1 — Clone & configure

```bash
git clone https://github.com/Ridoy-KJ/PixelPush.git
cd PixelPush
cp .env.example .env
```

Edit `.env` with your CasparCG server details:

```env
PORT=4000
CASPAR_HOST=192.168.1.100
CASPAR_PORT=5250
SCANNER_BASE=http://192.168.1.100:8000/tls
VITE_TEMPLATE_PREVIEW_BASE=http://192.168.1.100:8080/templates
```

### 2 — Backend

```bash
npm install
npm run dev       # development (nodemon)
# or
npm start         # production
```

Backend runs at **http://localhost:4000**

### 3 — Frontend

```bash
cd client
npm install
npm run dev
```

Dashboard runs at **http://localhost:3000** (proxies API + Socket.io to `:4000`)

### 4 — Production (single server)

```bash
# From project root
npm run build
npm start
```

Serves the built React app from **http://localhost:4000**

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend HTTP port |
| `CASPAR_HOST` | `192.168.25.100` | CasparCG server IP |
| `CASPAR_PORT` | `5250` | CasparCG AMCP TCP port |
| `SCANNER_BASE` | `http://…/tls` | Template scanner endpoint |
| `VITE_TEMPLATE_PREVIEW_BASE` | `http://…/templates` | Base URL for template iframe preview |

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Server health + CasparCG connection state |
| `GET` | `/api/templates` | Template list (scanner or AMCP TLS fallback) |
| `POST` | `/api/amcp` | Raw AMCP command passthrough |

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `GET_TEMPLATES` | `{}` | Fetch template list |
| `PLAY_TEMPLATE` | `{ channel, layer, template, data, autoPlay }` | Send `CG ADD` |
| `UPDATE_TEMPLATE` | `{ channel, layer, data }` | Send `CG UPDATE` |
| `STOP_LAYER` | `{ channel, layer }` | Send `CG STOP` |
| `CLEAR_CHANNEL` | `{ channel }` | Send `CLEAR` |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `caspar_status` | `{ connected, host, port }` | Connection state change |
| `templates_list` | `{ success, templates }` | Template list push |
| `command_sent` | `{ success, command, channel, layer }` | AMCP confirmed |
| `command_error` | `{ success: false, error }` | AMCP error |

---

## AMCP Command Reference

| UI Action | AMCP Command Sent |
|-----------|-------------------|
| **Play** | `CG <ch>-<lyr> ADD 1 "<template>" 1 "{...json...}"` |
| **Update** | `CG <ch>-<lyr> UPDATE 1 "{...json...}"` |
| **Stop** | `CG <ch>-<lyr> STOP 1` |
| **Clear** | `CLEAR <ch>` |

CG layer index is always `1`. Channel-layer notation (e.g. `1-20`) targets channel 1, video layer 20.

---

## Template Discovery

Templates are loaded from one of two sources with automatic fallback:

| Source | Priority | Method |
|--------|----------|--------|
| HTTP scanner endpoint | Primary | `GET {SCANNER_BASE}` → plain text list |
| CasparCG TLS via AMCP | Fallback | `caspar.tls()` over TCP connection |

Each template normalizes to `{ id, name, path, type, order }`. The frontend renders `name` in the library and sends `path` in AMCP commands.

---

## Tech Stack

**Backend** — `express` · `socket.io` · `axios` · `casparcg-connection` · `cors` · `tslib`

**Frontend** — `react` · `react-dom` · `socket.io-client` · `vite` · `@vitejs/plugin-react`

---

## Roadmap

- [ ] Multi-channel output routing UI
- [ ] Template data form builder (dynamic JSON fields per template)
- [ ] Playlist / rundown mode with sequence automation
- [ ] Keyboard shortcuts for on-air operators
- [ ] Auth layer for multi-operator environments
- [ ] Docker Compose setup (PixelPush + CasparCG)

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Fork → clone → branch → push → PR
git checkout -b feature/your-feature-name
```

---

## License

[MIT](LICENSE) © [Ridoy Kanto Joy](https://github.com/Ridoy-KJ)

---

## Author

**Ridoy Kanto Joy**  
🔗 [GitHub @Ridoy-KJ](https://github.com/Ridoy-KJ) · [LinkedIn](https://linkedin.com/in/ridoy-kanto-joy)

> Built for live broadcast — where every frame counts.
