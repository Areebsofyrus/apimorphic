# Project Progress: AI API Tester

## Overview
Automated API testing VS Code Extension powered by NestJS backend, PostgreSQL database, and Local AI (OpenAI-compatible local server like Ollama / LM Studio).

## Architecture
- **Root Directory**: `D:\ai-api-tester`
- **Backend**: `backend/` (NestJS application with TypeORM, PostgreSQL, Swagger/Postman parsers, HTTP runner, Hybrid Scenario Generator)
- **Extension**: `extension/` (VS Code Extension host + React Webview UI built with Vite, Tailwind CSS, shadcn/ui)

## Status Checklist

### Phase 1: Setup & Architecture
- [x] Root monorepo initialized (`package.json`, `PROJECT_PROGRESS.md`)
- [/] NestJS Backend initialization
- [/] Extension & React Webview initialization

### Phase 2: Core Parsers & Specs
- [ ] Swagger / OpenAPI v2 & v3 Parser
- [ ] Postman Collection v2.1 Parser

### Phase 3: Test Context & Datasets
- [ ] Context Priority Engine (Runtime > Dataset > Env > Global > Default)
- [ ] Response Dataset Collector & Selector Engine

### Phase 4: API Intelligence & Smart Mapping
- [ ] Collection detector & auto-mapping (`patientId` -> `Patients.patientId`)
- [ ] Persistent mapping rules memory

### Phase 5: Scenario Generator & Local AI
- [ ] Hybrid Rule Generator (Valid, Null, Empty, Boundary, SQLi, XSS)
- [ ] Local AI integration (`unsloth/gemma` GGUF via LM Studio / Ollama OpenAI API)

### Phase 6: HTTP Runner & Validation
- [ ] Execution chain runner & AJV JSON Schema Validator
- [ ] Concurrency runner (`p-limit`)

### Phase 7: React Webview & Extension UI
- [ ] API Discovery & Selection tree
- [ ] Payload Preview & Interactive Editor
- [ ] Real-time execution dashboard & AI failure explanation report
