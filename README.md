# 🚀 AI API Tester

An automated API testing VS Code Extension (compatible with Antigravity IDE and standard web applications) powered by a **NestJS Backend**, **PostgreSQL Database**, and **Local AI Models** (such as `unsloth/gemma-4-E2B-it-GGUF` served via Ollama, LM Studio, or LocalAI).

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Clone / Navigate to Directory](#1-navigate-to-project-directory)
  - [2. Start the PostgreSQL Database](#2-start-postgresql-database)
  - [3. Start the Local AI Server](#3-start-local-ai-server-lm-studio--ollama)
  - [4. Start the NestJS Backend](#4-start-the-nestjs-backend)
  - [5. Start the React Webview UI](#5-start-the-react-webview-ui)
  - [6. Launch the VS Code Extension](#6-launch-the-vs-code-extension)
- [Running Automated Tests](#-running-automated-tests)
- [Future Standalone Web App Integration](#-future-standalone-web-app-integration)
- [Project Structure](#-project-structure)

---

## ✨ Features

- 📥 **Import OpenAPI / Swagger & Postman Collections**: Parse OpenAPI 2.0/3.0 specs (JSON/YAML) and Postman Collection v2.1 schemas seamlessly.
- 🔍 **API Discovery & Search**: Filter and search through extracted endpoints, HTTP methods, parameters, and request/response schemas.
- ⚡ **Prerequisite Execution Chains**: Execute prerequisite APIs (e.g. `Login` → `Get Token` → `Create Patient` → `Target API`) with runtime variable extraction and automatic retry on token refresh.
- 🗄️ **Smart Dataset Learning**: Detect collection responses (e.g. `GET /patients`), store response datasets in PostgreSQL, and extract records by mode (`First`, `Last`, `Random`, `Every`, `First N`, `Random N`, `Filtered`).
- 🧠 **Smart Parameter Mapping**: Automatically detect and suggest payload mappings (e.g. `patientId` → `Patients.patientId`) and persist approved mapping memory.
- 🛡️ **Hybrid Scenario Generator**:
  - **Rule-Based Edge Cases**: Generates `Valid`, `Missing Fields`, `Null Fields`, `Empty Strings`, `Invalid Types`, `Boundary Values`, **SQL Injection** (`' OR '1'='1' --`), and **XSS Script Attacks** (`<script>alert(1)</script>`).
  - **Local AI Context Generator**: Enriches payloads with realistic domain mock data using local LLM models.
- 👁️ **Payload Preview & Safety Engine**: Never execute tests blindly. Inspect and edit request body, query parameters, path params, and headers before firing requests.
- 📊 **Execution Reports & Local AI Diagnostics**: View pass/fail status, HTTP status codes, latency metrics (ms), and **Local AI failure root-cause analysis** powered by `unsloth/gemma-4-E2B-it-GGUF`.

---

## 🏗️ Architecture

```
                                  +---------------------------------------+
                                  | VS Code Extension / React Webview UI  |
                                  |        (extension/webview)            |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTP REST APIs (Port 3000)
                                                      v
+-----------------------------+   +-------------------+-------------------+
|      PostgreSQL Database    |<--|            NestJS Backend             |
|   (Datasets, Contexts, Logs)|   |              (backend/)               |
+-----------------------------+   +-------------------+-------------------+
                                                      |
                                                      | OpenAI-compatible API
                                                      v
                                  +---------------------------------------+
                                  |        Local AI Service               |
                                  |   (Ollama / LM Studio / LocalAI)      |
                                  |     unsloth/gemma-4-E2B-it-GGUF       |
                                  +---------------------------------------+
```

---

## 🤖 Running the Local AI Service

You can run your GGUF model (`unsloth/gemma-4-E2B-it-GGUF`) locally using either **Ollama** or **LM Studio**.

---

### Option A: Using Ollama (Command Line)

1. **Install Ollama**: Download from [ollama.com](https://ollama.com).
2. **Download & Run Model**: Open terminal and run:
   ```bash
   ollama run hf.co/unsloth/gemma-4-E2B-it-GGUF
   ```
3. **Configure `backend/.env`**:
   ```env
   LOCAL_AI_BASE_URL=http://localhost:11434/v1
   LOCAL_AI_MODEL=hf.co/unsloth/gemma-4-E2B-it-GGUF
   ```

---

### Option B: Using LM Studio (GUI Application)

1. **Install LM Studio**: Download from [lmstudio.ai](https://lmstudio.ai).
2. **Download Model**: Search for `unsloth/gemma-4-E2B-it-GGUF` inside LM Studio search tab and click **Download**.
3. **Start Local Server**:
   - Click the **Local Server** tab on the left sidebar.
   - Select your downloaded GGUF model at the top.
   - Click **Start Server** (runs on `http://localhost:1234/v1`).
4. **Configure `backend/.env`**:
   ```env
   LOCAL_AI_BASE_URL=http://localhost:1234/v1
   LOCAL_AI_MODEL=unsloth/gemma-4-E2B-it-GGUF
   ```

---

## ⚙️ Prerequisites

Before starting, make sure you have installed:

1. **Node.js**: `v18.0.0` or higher & `npm` `v9.0.0` or higher.
2. **PostgreSQL**: Local or containerized PostgreSQL instance running on port `5432` (or configured port).
3. **Local AI Engine** (One of the following):
   - **LM Studio**: Running locally on `http://localhost:1234/v1` with model `unsloth/gemma-4-E2B-it-GGUF` loaded.
   - **Ollama**: Running locally on `http://localhost:11434/v1` (`ollama run unsloth/gemma-4-E2B-it-GGUF`).

---

## 🔑 Environment Configuration

The NestJS backend configuration is stored in `backend/.env`.

```env
PORT=3000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_api_tester

# Local AI Configuration (LM Studio / Ollama / LocalAI)
# For Ollama default: http://localhost:11434/v1
# For LM Studio default: http://localhost:1234/v1
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=unsloth/gemma-4-E2B-it-GGUF
```

---

## 🚀 Quick Start Guide

### 1. Navigate to Project Directory

```bash
cd D:\ai-api-tester
```

### 2. Start PostgreSQL Database

Ensure PostgreSQL is running and create the database `ai_api_tester`:

```sql
CREATE DATABASE ai_api_tester;
```

### 3. Start Local AI Server (LM Studio / Ollama)

Start your local LLM server serving `unsloth/gemma-4-E2B-it-GGUF` at `http://localhost:11434/v1` (Ollama) or `http://localhost:1234/v1` (LM Studio).

### 4. Start the NestJS Backend

Navigate to the `backend` folder, install dependencies, and start the development server:

```bash
cd D:\ai-api-tester\backend
npm install
npm run start:dev
```

You should see the startup log:
```
🚀 AI API Tester Backend is running on: http://localhost:3000
```

### 5. Start the React Webview UI

In a new terminal, launch the React development server:

```bash
cd D:\ai-api-tester\extension\webview
npm install
npm run dev
```

The Webview UI will be accessible at `http://localhost:5173`.

### 6. Install & Launch the Extension in Antigravity IDE

You can run the extension in Antigravity IDE using either of the following two methods:

---

#### Option A: Package as `.vsix` and Install into Antigravity IDE (Recommended)

1. **Build the Webview Frontend**:
   ```bash
   cd D:\ai-api-tester\extension\webview
   npm run build
   ```

2. **Package the Extension into a `.vsix` File**:
   ```bash
   cd D:\ai-api-tester\extension
   npx vsce package
   ```
   *This generates `ai-api-tester-extension-1.0.0.vsix` inside `D:\ai-api-tester\extension`.*

3. **Install the `.vsix` into Antigravity IDE**:
   - Open **Antigravity IDE**.
   - Go to the **Extensions Panel** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
   - Click the `...` menu (More Actions) at the top-right of the Extensions panel.
   - Select **Install from VSIX...**
   - Choose `D:\ai-api-tester\extension\ai-api-tester-extension-1.0.0.vsix`.

   *Alternatively via Terminal:*
   ```bash
   antigravity --install-extension D:\ai-api-tester\extension\ai-api-tester-extension-1.0.0.vsix
   ```

4. **Launch the Extension**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) to open the Command Palette.
   - Run: `AI API Tester: Open Dashboard`.

---

#### Option B: Debugging via Extension Development Host (`F5`)

1. Open `D:\ai-api-tester\extension` in Antigravity IDE.
2. Build the webview: `cd webview && npm run build`.
3. Press `F5` (or go to **Run and Debug** → **Launch Extension**).
4. In the spawned Extension Development Host window, open the Command Palette (`Ctrl+Shift+P`) and run `AI API Tester: Open Dashboard`.

---

## 🧪 Running Automated Tests

Run the complete backend unit & integration test suite (covering Parsers, Context Manager, Dataset Manager, Scenario Generator, and HTTP Runner):

```bash
cd D:\ai-api-tester\backend
npm run test
```

To run test coverage report:
```bash
npm run test:cov
```

---

## 🌐 Future Standalone Web App Integration

The NestJS backend is **100% decoupled from VS Code APIs** and exposes standard HTTP REST endpoints with CORS enabled.

If you build a standalone web frontend application in the future (e.g., Next.js or React SPA), you can connect it directly to the exact same NestJS backend (`http://localhost:3000`) without writing or modifying a single line of backend code!

---

## 📂 Project Structure

```
D:\ai-api-tester\
├── package.json               # Root monorepo configuration
├── PROJECT_PROGRESS.md        # Milestone tracking document
├── README.md                  # Complete project manual & quick start
├── backend/                   # NestJS Backend API Engine
│   ├── src/
│   │   ├── entities/          # PostgreSQL Entities (ApiSpec, Dataset, Context, Mapping, ExecutionLog)
│   │   ├── modules/
│   │   │   ├── parser/        # Swagger/OpenAPI & Postman parsers
│   │   │   ├── context/       # Variable priority resolver
│   │   │   ├── dataset/       # Response collection & extraction modes
│   │   │   ├── intelligence/  # Smart parameter mapping detector
│   │   │   ├── scenario/      # Hybrid Scenario Generator (Rule + Local AI)
│   │   │   ├── ai-analyzer/   # Failure diagnosis using Local AI (gemma-4-E2B)
│   │   │   └── runner/        # Execution engine & AJV validator
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── .env                   # Database & Local AI settings
└── extension/                 # VS Code Extension & React Webview UI
    ├── src/
    │   └── extension.ts       # Extension registration & Webview host
    └── webview/               # Standalone React Application (Vite + Tailwind CSS)
        └── src/
            ├── App.tsx        # Dashboard UI (Import, Discovery, Preview, Reports)
            └── api/client.ts  # Typed REST API client
```

---

## 📝 License

UNLICENSED. Developed for custom AI-assisted API testing.
