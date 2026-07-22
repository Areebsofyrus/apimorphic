# AI API Tester Studio

Automated OpenAPI Testing & Local AI Diagnostic Console.

## Requirements

- Node.js 18+
- npm

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (edit .env with your values)
# VITE_API_BASE_URL      — your NestJS backend URL (default: http://localhost:3010)
# VITE_TARGET_BASE_URL   — default target URL shown in the UI (default: https://httpbin.org)

# 3. Start the dev server
npm run dev
```

The app opens at **http://localhost:3000**

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3010` | Your NestJS backend base URL |
| `VITE_TARGET_BASE_URL` | `https://httpbin.org` | Default target URL in the UI |

Edit the `.env` file (already included) to change these.

## Backend API Endpoints Used

| Method | Path | Description |
|---|---|---|
| POST | `/parser/swagger` | Parse a Swagger/OpenAPI spec |
| POST | `/runner/generate-scenarios` | Generate test scenarios for an endpoint |
| POST | `/runner/execute` | Execute a single test scenario |

## Build for production

```bash
npm run build
npm run preview
```
