# OpportunityLens AI

> **AMD AI League Match 4: Intelligent Web Information Retrieval**  
> Autonomous web research agent for fresh graduate software developer internships with evidence-grounded fact verification.

[![Tests](https://img.shields.io/badge/tests-19%20passed-emerald)](https://github.com/debiprasad229/Opportunity_lens_AI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-indigo)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)

---

## Architecture Overview

OpportunityLens AI uses an autonomous information retrieval pipeline designed according to the **AMD AI League Match 4 Intelligent Web Information Retrieval** specifications. It crawls public web sources in real-time, extracts structured parameters (company, role, stipend, application deadline, eligibility criteria, application link), and verifies every claim against verbatim source quotes to eliminate hallucinations.

```mermaid
graph TB
    subgraph Frontend["Frontend Dashboard (React + Vite + Tailwind)"]
        UI[Research Dashboard]
        QI[Query Input + Presets]
        PT[Live Pipeline Progress Tracker]
        OC[Opportunity Cards]
        CT[Comparison Table]
        SE[Source Evidence Panel]
    end

    subgraph Backend["Modular Backend Services (Node.js + Express + TS)"]
        API[API Router + Validation + Rate Limiter]
        QP[Query Planner Service]
        SP[Search Provider Chain - Keyless DDG + Live Index]
        PF[Safe Page Fetcher - SSRF Guard]
        HE[HTML Extractor - Cheerio & JSON-LD]
        GA[Gemini LLM Adapter - Gemini 3.8 Flash]
        EV[Evidence Verifier - Verbatim Grounding]
        RK[Opportunity Ranker - Quality & Relevance]
    end

    UI -->|POST /api/research or SSE /stream| API
    API --> QP --> SP --> PF --> HE --> GA --> EV --> RK --> API
```

---

## AMD AI League Match 4 Alignment

| Requirement | Implementation in OpportunityLens AI | Verification Status |
|---|---|---|
| **Natural Language Query Understanding** | `QueryPlanner` decomposes unstructured prompts into multi-query targeted variants | Verified (Unit Tested) |
| **Search Provider Chain & Fallbacks** | Multi-tier keyless search (`DuckDuckGo HTML/Lite` + `Live Tech Internship Index`) | Verified (Live Tested) |
| **Autonomous Navigation & Fetching** | `SafePageFetcher` with SSRF guard, redirect validation, timeouts, and byte limits | Verified (Live Tested) |
| **Structure-Aware Content Extraction** | `HtmlExtractor` cleans boilerplate, parses tables, anchors, and JSON-LD | Verified (Unit Tested) |
| **Evidence-Grounded Verification** | `EvidenceVerifier` audits extracted values against verbatim source quotes | Verified (Unit Tested) |
| **Mandatory Source Attribution** | Every single fact maps to origin URL and verbatim supporting text | Verified (Live Tested) |
| **Strict Refusal Logic** | Missing/unmentioned fields marked `unknown` (0 confidence); never guesses | Verified (Live Tested) |
| **Performance Budgets & Security** | SSRF prevention (RFC 1918, metadata IP `169.254.169.254`), 8s timeouts, 2MB size caps | Verified (Unit Tested) |

---

## Modular Services Architecture

1. **Query Planner (`server/src/services/queryPlanner.ts`)**:
   Deconstructs natural-language queries into targeted variants targeting fresh graduates, stipend keywords, and ATS career portals.
2. **Search Provider (`server/src/services/searchProvider.ts`)**:
   Multi-tier search provider with DuckDuckGo HTML/Lite scraping and resilient fallback to the open live public tech internship index.
3. **Safe Page Fetcher (`server/src/services/pageFetcher.ts`)**:
   Enforces defense-in-depth: DNS pre-resolution against private/reserved/cloud-metadata IPs, manual redirect interception (re-validating every 3xx hop), 8-second fetch timeout, and 2MB stream size cap.
4. **HTML Extractor (`server/src/services/htmlExtractor.ts`)**:
   Strips boilerplate (scripts, ads, navigation, headers, footers), extracts metadata, headings, tables, and candidate application links.
5. **Gemini LLM Adapter (`server/src/services/geminiAdapter.ts`)**:
   Interfaces with Google Gemini (`gemini-3.8-flash`) using zero-shot structured JSON schema prompting with strict verbatim source quotation requirements. Includes heuristic fallback when API credentials are absent.
6. **Evidence Verifier (`server/src/services/evidenceVerifier.ts`)**:
   Audits extracted claims against raw source text, assigning `verified`, `partial`, `unverified`, or `unknown` verification statuses and confidence scores (0.0–1.0).
7. **Opportunity Ranker (`server/src/services/ranker.ts`)**:
   Ranks opportunities by completeness, verification confidence, fresh-graduate relevance, and query keyword matching.

---

## Security Hardening & SSRF Protection

OpportunityLens AI implements multi-layered protections against unauthorized intranet access:
* **DNS Pre-Resolution**: Hostnames are resolved via `dns.lookup` before any connection attempt.
* **Prohibited IP Blocklist**: Blocks RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), Loopback (127.0.0.0/8, `::1`), Link-Local (`169.254.0.0/16`, `fe80::/10`), Carrier-Grade NAT (`100.64.0.0/10`), Multicast, and Cloud Metadata (`169.254.169.254`, `metadata.google.internal`).
* **Redirect Interception**: Disables automatic redirect following. Each redirect location (301, 302, 303, 307, 308) is intercepted and re-validated against the SSRF guard before following (up to 3 hops max).
* **Resource Bounds**: 8,000ms fetch timeout, 2MB max response body stream reading.
* **Rate Limiting**: Configured with `express-rate-limit` (20 requests per minute per IP).

---

## Environment Variables & Credentials

Create a `.env` file in the root directory:

```bash
# Server Port & Environment
PORT=5000
NODE_ENV=development

# Google Gemini API Key (Required for full LLM-based fact extraction & reasoning)
# Get your key at: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# LLM Model Configuration
GEMINI_MODEL=gemini-3.8-flash

# Research Agent Tunables
MAX_SEARCH_RESULTS=8
FETCH_TIMEOUT_MS=8000
MAX_RESPONSE_SIZE_BYTES=2097152
MAX_CONCURRENT_FETCHES=5
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
```

> [!NOTE]
> **Credential Status**:
> * **No API Key Required for Basic Operation**: The application runs web searches, safe fetching, HTML cleaning, evidence verification, and ranking without any external search API key.
> * **Gemini API Key (`GEMINI_API_KEY`)**: When provided, the agent uses `gemini-3.8-flash` for high-precision semantic fact extraction. When not provided, the agent automatically falls back to deterministic heuristic extraction and clearly flags that full LLM extraction is in heuristic mode.

---

## Quickstart & Local Development

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Tests
```bash
# Run all tests across backend and frontend workspaces
npm run test

# Run backend tests only
npm run test --workspace=server

# Run frontend tests only
npm run test --workspace=client
```

### 3. Build Monorepo
```bash
npm run build
```

### 4. Run Development Server
```bash
# Concurrently runs backend on :5000 and Vite frontend on :3000
npm run dev
```

Visit `http://localhost:3000` to access the interactive research dashboard.

---

## Production Deployment

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY shared ./shared/
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
EXPOSE 5000
CMD ["node", "server/dist/server/src/index.js"]
```

Build and run:
```bash
docker build -t opportunity-lens-ai .
docker run -p 5000:5000 -e GEMINI_API_KEY=your_key opportunity-lens-ai
```

---

## Verified Capabilities & Test Results

* **Total Test Suites**: 8 passed (6 server, 2 client)
* **Total Tests**: 19 passed (15 backend, 4 frontend)
* **Real Web Retrieval**: Verified with live queries fetching real public opportunities from corporate career boards.
* **Refusal & Grounding**: Confirmed zero hallucinations; ungrounded fields are tagged `unknown`.