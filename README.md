# Government Subsidy & Grant Disbursement Tracking System (SGDTS)

An enterprise-grade, full-stack digital government platform for administering national subsidy schemes, automating citizen eligibility scoring, orchestrating multi-stage verification workflows, and tracking Direct Benefit Transfer (DBT) grant disbursements.

> [!NOTE]
> 📄 **Mentor Presentation & Evaluation Guide**: A comprehensive, publication-quality presentation guide and viva Q&A document is available at [`SGDTS_Project_Presentation_Guide.pdf`](SGDTS_Project_Presentation_Guide.pdf).

---

## 🏛️ System Overview

SGDTS provides transparent, auditable, and rule-governed welfare entitlement delivery across central and state welfare programs. It bridges public citizen enrollment with back-office verification authorities and financial disbursement pipelines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Citizen / Beneficiary                           │
│  - Browse Subsidy Schemes                                              │
│  - Multi-Step Dynamic Application Wizard                               │
│  - Real-Time Lifecycle Tracker (Audit Timeline & Scorecard)            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SGDTS Backend Engine (Spring Boot 3)               │
│  ├── Scheme Management (Envelopes, Criteria Matrix, Routing Rules)     │
│  ├── Rule-Based Deterministic Scoring Engine (Normalized 0–100%)       │
│  ├── Multi-Stage Verification Pipeline (Separation of Duties Policy)   │
│  └── Direct Benefit Transfer (DBT) & PFMS Reconciliation Layer         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Verification Authorities                        │
│  - Officer Review Docket & 72-Hour SLA Queue                           │
│  - Multi-Level Approval / Rejection / Return / Flag Actions            │
│  - Administrative Auditing & Governance Telemetry                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Architecture & Repository Structure

```
Government-Subsidy-Grant-Disbursement-Tracking-System_group1/
├── src/                                  # Spring Boot 3 Backend (Java 21)
│   ├── main/java/com/sgdts/sgdts/
│   │   ├── application/                  # Grant claims, lifecycle events & coordinator
│   │   ├── beneficiary/                  # Citizen profile registry & verification
│   │   ├── common/                       # Global exceptions, ApiResponse & PagedResponse
│   │   ├── config/                       # SecurityConfig (CORS), AppConfig
│   │   ├── eligibility/                  # Deterministic scoring engine & assessments
│   │   ├── scheme/                       # Scheme policy, criteria builder & routing rules
│   │   └── verification/                 # Workflows, tasks, SLAs & separation of duties
│   └── main/resources/
│       ├── application.properties        # Supabase / PostgreSQL datasource config
│       └── schema-supabase.sql           # Complete DDL schema & initial seed data
├── frontend/                             # React 19 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── api/                          # Axios API clients for all backend endpoints
│   │   ├── components/                   # UI components (shadcn/ui style), layouts & topbars
│   │   ├── context/                      # AuthContext & Demo Role Switcher
│   │   ├── pages/
│   │   │   ├── admin/                    # Admin Dashboard, Schemes, Beneficiaries, Audits
│   │   │   ├── beneficiary/              # Citizen Portal, Wizard, Tracker, Profile
│   │   │   └── officer/                  # Officer Queue, Decision Modal, Review History
│   │   ├── router/                       # React Router v7 routes
│   │   └── types/                        # TypeScript DTOs matching backend models
│   ├── package.json
│   └── vite.config.ts
├── .env.example                          # Environment variable template for Supabase
├── pom.xml                               # Maven project descriptor
└── README.md
```

---

## 👥 User Roles & Capabilities

| Role | Route | Key Capabilities |
|---|---|---|
| **Administrator** | `/admin/*` | Scheme authoring, criteria weights, verification routing, citizen management, global claims oversight, disbursement tracking, and CSV audit exports. |
| **Citizen Beneficiary** | `/beneficiary/*` | Browse schemes, fill dynamic eligibility questionnaires, submit formal affirmations, track claim progress, and manage citizen profile. |
| **Verification Officer** | `/officer/*` | Review assigned tasks within 72-hour SLAs, examine applicant scorecards, record determinations (**APPROVE**, **REJECT**, **RETURN**, **FLAG**), and enforce Separation of Duties. |

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** or higher
- **Node.js 18+** & **npm 9+**
- **PostgreSQL 14+** (Local or [Supabase](https://supabase.com))

---

### 1. Database Setup (Supabase or PostgreSQL)

#### Option A: Supabase (Recommended)
1. In your **Supabase Dashboard**, navigate to **Project Settings** $\rightarrow$ **Database**.
2. Copy your **JDBC Connection URL** (Port `6543` for Pooler, or Port `5432` for Direct).
3. Open the Supabase **SQL Editor**, paste the contents of [`src/main/resources/schema-supabase.sql`](src/main/resources/schema-supabase.sql), and click **Run**.

#### Option B: Local PostgreSQL
```sql
CREATE DATABASE sgdts;
CREATE USER sgdts WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE sgdts TO sgdts;
```

---

### 2. Backend Setup (Spring Boot)

Configure your database connection in `src/main/resources/application.properties` or set environment variables:

```bash
# Windows PowerShell
$env:DB_URL="jdbc:postgresql://aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
$env:DB_USERNAME="postgres.[YOUR-PROJECT-REF]"
$env:DB_PASSWORD="[YOUR-PASSWORD]"

# Start the application
.\mvnw.cmd spring-boot:run
```

The Spring Boot backend will start on **`http://localhost:8080`**.

---

### 3. Frontend Setup (React + Vite)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

- All `/api/*` network requests are automatically proxied to `http://localhost:8080`.
- The frontend includes a built-in **Demo Data Mode** toggle at the top bar for testing all UI screens and workflows offline without a running database.

---

## 🔌 API Endpoints Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/schemes` | GET, POST | List and author subsidy schemes |
| `/api/v1/schemes/{id}` | GET, PUT | Retrieve and update scheme configuration |
| `/api/v1/schemes/{id}/criteria` | GET, PUT | Manage eligibility criteria matrix |
| `/api/v1/schemes/{id}/routing-rules` | GET, PUT | Manage verification routing stages |
| `/api/v1/schemes/{id}/activate` | POST | Activate scheme for enrollment |
| `/api/v1/schemes/{id}/deactivate` | POST | Deactivate scheme |
| `/api/v1/beneficiaries` | GET, POST | List and enroll citizen beneficiaries |
| `/api/v1/beneficiaries/{id}` | GET, PUT | Retrieve and update citizen profile |
| `/api/v1/applications` | GET, POST | List claims and create draft applications |
| `/api/v1/applications/{id}` | GET, PUT | View and update draft application |
| `/api/v1/applications/{id}/submit` | POST | Submit application (triggers auto-scoring) |
| `/api/v1/applications/{id}/cancel` | POST | Withdraw / cancel application |
| `/api/v1/applications/{id}/eligibility-assessment` | GET, POST | Retrieve or trigger scoring assessment |
| `/api/v1/applications/{id}/workflow` | GET | Retrieve full verification workflow audit trail |
| `/api/v1/verification/tasks` | GET | Fetch assigned verification queue for officer |
| `/api/v1/verification/tasks/{taskId}/decisions` | POST | Record official determination |
| `/api/v1/verification/tasks/{taskId}/reassign` | POST | Reassign task to another officer |

---

## 🧪 Testing & Verification

### Run Backend Tests
```bash
.\mvnw.cmd test
```

### Build Frontend Production Bundle
```bash
cd frontend
npm run build
```

---

## 📄 License
This project is developed under the Government Direct Benefit Transfer and Welfare Administration framework.

