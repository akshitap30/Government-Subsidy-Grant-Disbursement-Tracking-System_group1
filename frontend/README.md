# SGDTS — Government Subsidy & Grant Disbursement Tracking System (Frontend)

Enterprise-grade, modern digital government platform built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **TanStack Query**, integrated with a **Java 21 / Spring Boot 3 / PostgreSQL** backend.

---

## 🏛️ System Architecture & Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling & Design System**: Tailwind CSS v4, Inter typography, Government Navy primary palette (`#0f172a`, `#1e293b`, `#2563eb`)
- **Data Fetching & State**: TanStack React Query v5 (caching, mutation tracking, automated cache invalidation)
- **HTTP Client**: Axios with interceptors, standardized error handling, and proxy configuration
- **Routing**: React Router v7 with role-based routing and responsive layouts
- **Forms & Validation**: React Hook Form + Zod schema validation
- **Data Visualization**: Recharts (status distribution, monthly submission/approval trends)
- **Icons**: Lucide React
- **Notifications**: Custom floating Toast provider (success, error, warning, info)

---

## 👥 Three Separate User Experiences

The application delivers three purpose-built experiences:

### 1. System Administrator (`/admin/*`)
- **Dashboard**: Macro KPI cards (Active schemes, citizen counts, pending verification, total sanctions) and interactive charts.
- **Scheme Management**: Full lifecycle management:
  - Create & Edit schemes with minimum and maximum grant envelopes.
  - Configure multi-criterion eligibility matrices (`NUMERIC_MIN`, `NUMERIC_MAX`, `EQUALS`, `BOOLEAN`, `ENUM_MATCH`, `REQUIRED`, weights, mandatory flags).
  - Configure multi-tier verification routing rules (`INITIAL_REVIEW`, `FIELD_VERIFICATION`, `DISTRICT_REVIEW`, `SENIOR_APPROVAL`, `FINANCE_REVIEW`).
  - Activate & Deactivate schemes with confirmation safeguards.
- **Citizen Beneficiary Management**: View registered citizens, seed new citizen demographics, and update contact/residence records.
- **Application Central Management**: Global visibility across all claims, multi-faceted filtering (Scheme, Beneficiary, Status), eligibility re-runs, and cancellation.
- **Eligibility Overview**: Rule execution inspect tool with normalized score bar and per-criterion breakdown.
- **Verification Control**: Real-time monitoring of verification stages and task statuses across review officers.
- **Disbursement Tracking**: Tracking approved grants sanctioned for release via PFMS / NPCI APBS.
- **Reports & Analytics**: Auditing KPIs, pipeline breakdowns, CSV claims export, and printable audit sheets.
- **System Settings**: Backend connectivity ping, Actuator health monitoring, and governance parameters.

### 2. Citizen Beneficiary Portal (`/beneficiary/*`)
- **Overview**: Citizen entitlement summary, active applications count, sanctioned funds.
- **Browse Subsidy Schemes**: Search and filter central/state subsidy programs.
- **Scheme Dossier**: Comprehensive policy view detailing grant caps, eligibility requirements, and verification pipeline preview.
- **Multi-Step Application Wizard**:
  - Step 1: Grant Envelope selection & Citizen Persona binding.
  - Step 2: Dynamic Eligibility Questionnaire generated dynamically from scheme criteria.
  - Step 3: Review, Statutory Affirmation declaration, and submission.
- **My Applications**: Track all submitted claims, with real-time status badges and cancellation actions.
- **Application Status Timeline**: Interactive tracker visualizing lifecycle transitions (`statusHistory`), automated eligibility scorecard (`normalizedScore`), and multi-stage verification tasks.
- **Citizen Profile**: View registered demographic credentials, update contact information, or switch citizen personas.

### 3. Verification Officer Portal (`/officer/*`)
- **Officer Dashboard**: Queue volume, SLA threshold tracking (72-hour policy), and active review docket.
- **Verification Task Queue**:
  - Filter tasks by stage and SLA due dates.
  - Transfer/Reassign tasks to other qualified review officers (`OFFICER-001`, `OFFICER-002`, `OFFICER-DISTRICT`, `OFFICER-FINANCE`).
- **Comprehensive Review Modal**:
  - Review applicant details, residential location, and grant claim.
  - Inspect automated eligibility scorecard and per-criterion evaluations.
  - Record official determinations: **APPROVE**, **REJECT**, **RETURN_FOR_CORRECTION**, or **FLAG_FOR_REVIEW** with mandatory audit remarks.
  - Backend enforces **Separation of Duties (SoD)**: an officer who approved an earlier stage cannot approve a subsequent stage for the same claim.
- **Verification Decision Log**: Audit history of decisions rendered by the active officer.

---

## ⚡ Temporary Demo Access Mode

Until Spring Security JWT/OAuth2 authentication is integrated into the frontend, a prominent **Demo Role Bar** is anchored at the top of the viewport. It enables:
1. Instant switching between **Administrator**, **Verification Officer**, and **Citizen Beneficiary** contexts.
2. Selecting active Officer IDs (`OFFICER-001`, `OFFICER-002`, `OFFICER-DISTRICT`, etc.).
3. Switching or creating citizen identities on the fly.
4. Clearly distinguishing simulated demo access from production authentication.

---

## 🔌 Backend API Integration

The frontend connects directly to the Spring Boot REST APIs:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/schemes` | GET, POST | List & create schemes |
| `/api/v1/schemes/{id}` | GET, PUT | View & update scheme details |
| `/api/v1/schemes/{id}/criteria` | GET, PUT | View & update eligibility criteria |
| `/api/v1/schemes/{id}/routing-rules` | GET, PUT | View & update verification routing rules |
| `/api/v1/schemes/{id}/activate` | POST | Activate scheme for enrollment |
| `/api/v1/schemes/{id}/deactivate` | POST | Deactivate scheme |
| `/api/v1/beneficiaries` | GET, POST | List & register citizens |
| `/api/v1/beneficiaries/{id}` | GET, PUT | View & update citizen profile |
| `/api/v1/beneficiaries/{id}/exists` | GET | Verify citizen existence |
| `/api/v1/applications` | GET, POST | List claims & create drafts |
| `/api/v1/applications/{id}` | GET, PUT | View & update draft claim |
| `/api/v1/applications/{id}/submit` | POST | Submit application (triggers auto-assessment) |
| `/api/v1/applications/{id}/cancel` | POST | Cancel claim |
| `/api/v1/applications/{id}/eligibility-assessment` | GET, POST | View & run automated scoring |
| `/api/v1/verification/workflows` | POST | Initiate multi-stage review workflow |
| `/api/v1/applications/{id}/workflow` | GET | Retrieve workflow and task audit log |
| `/api/v1/verification/tasks` | GET | Fetch pending officer tasks |
| `/api/v1/verification/tasks/{taskId}/decisions` | POST | Record official determination |
| `/api/v1/verification/tasks/{taskId}/reassign` | POST | Transfer task to another officer |

---

## 📋 Documented Missing Backend Requirements

In strict adherence to instructions ("Do not invent API endpoints. If functionality is missing, document the missing backend requirement"), the following upcoming backend services are documented:

1. **Direct Benefit Transfer (DBT) Disbursement Microservice**:
   - Proposed Endpoints:
     - `POST /api/v1/disbursements/batches` — Generate sanction batches for approved claims.
     - `GET /api/v1/disbursements/batches/{id}` — Fetch batch mandate details.
     - `POST /api/v1/disbursements/batches/{id}/reconcile` — Record bank transaction reference (UTR) & reconciliation response from PFMS / NPCI.
   - Database Entity: `DisbursementRecord` linking to `GrantApplication` with UTR number, credit status, and timestamp.
2. **Dedicated Server-Side Reporting Aggregations**:
   - Proposed Endpoints:
     - `GET /api/v1/reports/kpi-summary` — Aggregated counts and budget utilization sums.
     - `GET /api/v1/reports/schemes/{id}/audit` — Scheme-specific disbursement reconciliation report.

---

## 🚀 Running the Project

### 1. Install Dependencies
\`\`\`bash
cd frontend
npm install
\`\`\`

### 2. Development Server
\`\`\`bash
npm run dev
\`\`\`
The Vite dev server will start at `http://localhost:5173`. Any requests to `/api` are automatically proxied to the Spring Boot backend at `http://localhost:8080`.

### 3. Production Build
\`\`\`bash
npm run build
\`\`\`
Builds optimized production assets in `dist/` with chunk splitting.
