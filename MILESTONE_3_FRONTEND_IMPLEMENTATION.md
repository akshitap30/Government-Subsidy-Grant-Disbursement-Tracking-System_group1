# SGDTS Milestone 3 — Frontend Implementation Report

**Project:** Government Subsidy & Grant Disbursement Tracking System (SGDTS)
**Group:** Group 1 


---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Milestone 2 vs Milestone 3 at a Glance](#2-milestone-2-vs-milestone-3-at-a-glance)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Module-wise Implementation](#4-module-wise-implementation)
5. [Service Layer and Backend Integration](#5-service-layer-and-backend-integration)
6. [Dual-Mode Resilient Pattern (Live vs Demo)](#6-dual-mode-resilient-pattern-live-vs-demo)
7. [Client-Side Business Rules](#7-client-side-business-rules)
8. [End-to-End User Flow](#8-end-to-end-user-flow)
9. [Testing and Verification](#9-testing-and-verification)
10. [Known Gaps and Future Scope](#10-known-gaps-and-future-scope)
11. [Appendix — File Index](#11-appendix--file-index)

---

## 1. Executive Summary

Milestone 2 answered **who** receives a grant: registration, scheme selection, intake, scoring (0–100) and five-stage officer review, ending at `APPROVED` with a Sanction Order and no money transferred.

Milestone 3 answers **how and when** money is paid. The frontend delivers four modules that sit on top of the Milestone 3 Spring Boot backend:

| # | Module | Screen | Purpose |
|---|---|---|---|
| 1 | Multi-Tranche Disbursement Planning | `Disbursements.jsx` | Plan, validate and release grants in stages |
| 2 | Statutory Compliance Release Gates | `Compliance.jsx` | Block payment until proofs are verified; track overdue items |
| 3 | Post-Disbursement Fund Utilization | `Analytics.jsx` | Record expenditure vouchers against disbursed funds |
| 4 | Regional and Scheme Telemetry | `Analytics.jsx` | State/district and scheme analytics, CSV audit export |

A fifth screen, `Tracking.jsx`, gives a unified timeline from application to final bank payment.

**What this replaced.** The Milestone 2 build showed a blue notice banner, *"Backend Integration Notice — Pending Disbursement Microservice"*, with a single mock "Generate PFMS Mandate" button. That banner came from the placeholder file `DisbursementTracking.tsx`. Milestone 3 replaces the placeholder with real, API-backed screens.

### Risk addressed

| Milestone | Risk protected against |
|---|---|
| 2 | Ghost claimants, ineligible applicants, officer collusion |
| 3 | Misuse of funds, cash released without construction proof, unauthorized spending |

---

## 2. Milestone 2 vs Milestone 3 at a Glance

| Aspect | Milestone 2 (Pre-Approval) | Milestone 3 (Post-Approval) |
|---|---|---|
| Core focus | Deciding who gets the grant | Controlling how and when money is paid |
| Lifecycle | Registration → Scheme → Intake → Scoring → 5-stage review → `APPROVED` | Planning → Tranches → Compliance gates → DBT release → Utilization → `COMPLETED` |
| Financial state | ₹0 transferred | DBT released in stages |
| Disbursement UI | Flat list of approved applications, one mock PFMS button | Multi-tranche plan with validated amounts and per-tranche bank reference |
| Compliance | None | Release gates, geotagged proofs, SLA scanner |
| Post-payment visibility | None | Expenditure vouchers and live utilization rate |
| Analytics | Claim counts, status pie chart | Regional and scheme breakdowns, CSV audit export |

---

## 3. Frontend Architecture

### 3.1 Technology

| Concern | Choice |
|---|---|
| UI library | React |
| Page components | `.jsx` files under `src/pages/` |
| HTTP client | Axios, centralised in `src/services/api.js` |
| Backend target | `http://localhost:8080` (`BACKEND_URL`) |
| Backend | Spring Boot (Java 21) with PostgreSQL (Supabase) |

### 3.2 Layered structure

```
┌───────────────────────────────────────────────────────┐
│ Pages (src/pages)                                     │
│ Disbursements · Compliance · Analytics · Tracking     │
└───────────────────────────┬───────────────────────────┘
                            │ calls
┌───────────────────────────▼───────────────────────────┐
│ Services (src/services)                               │
│ disbursementService · complianceService               │
│ utilizationService · analyticsService                 │
└───────────────────────────┬───────────────────────────┘
                            │ uses
┌───────────────────────────▼───────────────────────────┐
│ api.js — shared Axios client, BACKEND_URL             │
└───────────────────────────┬───────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼───────────────────────────┐
│ Spring Boot REST controllers (Milestone 3 packages)   │
└───────────────────────────────────────────────────────┘
```

### 3.3 Folder layout

```
frontend
└── src
    ├── pages/admin
    │   ├── Analytics.jsx          # M3: utilization + regional telemetry
    │   ├── Compliance.jsx         # M3: compliance desk
    │   ├── Disbursements.jsx      # M3: multi-tranche planning and release
    │   ├── Tracking.jsx           # M3: unified citizen tracker
    │   ├── ApplicationDetails.jsx # M2
    │   ├── Applications.jsx       # M2
    │   ├── Beneficiaries.jsx      # M2
    │   ├── Dashboard.jsx          # M2
    │   ├── Eligibility.jsx        # M2
    │   ├── Schemes.jsx            # M2
    │   └── Verification.jsx       # M2
    └── services
        ├── api.js
        ├── disbursementService.js
        ├── complianceService.js
        ├── utilizationService.js
        └── analyticsService.js
```

---

## 4. Module-wise Implementation

### 4.1 Multi-Tranche Disbursement Planning — `Disbursements.jsx`

**Goal.** Replace the flat list and mock banner with a full staged payment lifecycle.

**Capabilities**

- Lists active disbursement plans with tranche progress bars.
- Creates a plan for an approved application and adds tranches (stages).
- Validates amounts before submission (see section 7.1).
- Drives the stage lifecycle `SCHEDULED → READY → DISBURSED` through *Prepare* and *Release* actions.
- Records the PFMS / bank UTR reference for each tranche.

**Worked example (₹2,50,000 grant)**

| Tranche | Share | Purpose | Amount |
|---|---|---|---|
| 1 | 30% | Mobilization and plinth | ₹75,000 |
| 2 | 40% | Wall superstructure | ₹1,00,000 |
| 3 | 30% | Roof slab and sanitary | ₹75,000 |
| **Total** | 100% | | **₹2,50,000** |

**Lifecycle**

```
DRAFT plan ──activate──► ACTIVE plan
                            │
   Stage: SCHEDULED ──prepare──► READY ──release──► DISBURSED
                      (compliance                (UTR recorded,
                       must be met)               funds released)
                            │
        all stages DISBURSED ──► Plan COMPLETED
```

### 4.2 Statutory Compliance Desk — `Compliance.jsx`

**Goal.** Make payment conditional on verified proof.

**Capabilities**

- Create compliance requirements per application or stage.
- Upload and submit evidence: geotagged site photos of the completed foundation, land title deeds, GFR-12A certificate.
- Officer **verify** and **reject** actions with remarks.
- Overdue list with SLA breach countdowns.
- Per-application non-compliance flags.

**Release gate.** A stage cannot be released while a mandatory requirement is unmet. The backend enforces this through `isStageComplianceMet`, and the UI surfaces the block so an officer sees why a release is refused.

**Overdue severity scale**

| Severity | Overdue duration | Colour |
|---|---|---|
| LOW | < 7 days | 🔵 Blue |
| MEDIUM | < 14 days | 🟡 Yellow |
| HIGH | < 30 days | 🟠 Orange |
| CRITICAL | ≥ 30 days | 🔴 Red |

Severity is computed by the backend `ComplianceScheduler` (hourly scan). The frontend displays it.

### 4.3 Fund Utilization — `Analytics.jsx`

**Goal.** Give visibility into what happened to money after payment.

**Capabilities**

- Beneficiary or officer submits an expenditure voucher (bill or invoice).
- Categories: Raw Materials, Equipment / Machinery, Labor Wages, Contingency.
- Live utilization rate for an application and overall.

**Formula**

```
Utilization Rate (%) = (Amount Utilized ÷ Amount Disbursed) × 100
```

The rate is shown as 0% when nothing has been disbursed.

### 4.4 Regional and Scheme Telemetry — `Analytics.jsx`

**Goal.** Executive-level financial visibility.

**Capabilities**

- Disbursement totals (sanctioned vs actually disbursed).
- Regional breakdown of disbursed funds by **State** and **District**.
- Scheme-by-scheme comparison of sanctioned budget vs disbursed funds.
- **One-click CSV export** of the audit trail for Comptroller & Auditor General (CAG) inspection.

### 4.5 Unified Citizen Tracker — `Tracking.jsx`

**Goal.** One search, one complete story.

- Search by application reference (for example `APP-1700108200301`).
- Shows the full timeline: Milestone 2 application and review events, followed by Milestone 3 tranche releases and final bank payment.

---

## 5. Service Layer and Backend Integration

Every screen calls the Spring Boot REST API through four service modules built on one shared Axios client.

### 5.1 `api.js`

```javascript
export const BACKEND_URL = 'http://localhost:8080';
```

### 5.2 Endpoint map

| Service | Backend controller | Endpoints called |
|---|---|---|
| `disbursementService.js` | `DisbursementController` | `GET /api/v1/disbursement-plans`<br>`POST /api/v1/disbursement-plans`<br>`POST /api/v1/disbursement-plans/{id}/activate`<br>`POST /api/v1/disbursement-plans/{planId}/stages`<br>`POST /api/v1/disbursement-stages/{stageId}/prepare`<br>`POST /api/v1/disbursement-stages/{stageId}/release` |
| `complianceService.js` | `ComplianceController` | `GET /api/v1/compliance`<br>`POST /api/v1/compliance`<br>`POST /api/v1/compliance/{id}/verify`<br>`POST /api/v1/compliance/{id}/reject`<br>`GET /api/v1/compliance/overdue`<br>`GET /api/v1/applications/{id}/non-compliance` |
| `utilizationService.js` | `FundUtilizationController` | `POST /api/v1/utilization`<br>`GET /api/v1/utilization/summary`<br>`GET /api/v1/applications/{id}/utilization` |
| `analyticsService.js` | `AnalyticsController` | `GET /api/v1/analytics/disbursement`<br>`GET /api/v1/analytics/regional`<br>`GET /api/v1/analytics/schemes` |

### 5.3 Screen-to-endpoint traceability

| User action | Screen | Service call | Backend rule enforced |
|---|---|---|---|
| Create plan | Disbursements | `POST /disbursement-plans` | Application must be `APPROVED`; one active plan only |
| Add tranche | Disbursements | `POST /disbursement-plans/{id}/stages` | Cumulative amount ≤ sanctioned total |
| Activate plan | Disbursements | `POST /disbursement-plans/{id}/activate` | Stage sum equals sanctioned total exactly |
| Mark ready | Disbursements | `POST /disbursement-stages/{id}/prepare` | Mandatory compliance `VERIFIED` or `WAIVED` |
| Release funds | Disbursements | `POST /disbursement-stages/{id}/release` | Not already `DISBURSED` or `CANCELLED` |
| Verify proof | Compliance | `POST /compliance/{id}/verify` | Officer action recorded with timestamp |
| View overdue | Compliance | `GET /compliance/overdue` | Severity set by scheduler |
| Record voucher | Analytics | `POST /utilization` | 0 ≤ utilized ≤ disbursed |
| Regional report | Analytics | `GET /analytics/regional` | JPQL aggregate by state and district |

---

## 6. Dual-Mode Resilient Pattern (Live vs Demo)

The frontend works with or without a running backend.

| Mode | Trigger | Behaviour |
|---|---|---|
| **Live Backend** | Spring Boot reachable on `localhost:8080` | Reads and writes PostgreSQL through the REST API |
| **Demo Data** | Network error or backend stopped | Service layer catches the failure and serves realistic seed data |

The top bar shows the current state, for example `[ Spring Boot Offline ] [ Demo Data Mode: ON ]`.

**Why this matters**

- No blank screen or unhandled connection-refused error during a presentation.
- Every workflow can be demonstrated offline.
- Demo-mode changes are not persisted, so state resets on reload. Treat demo output as illustrative, not as proof of backend behaviour.

> **Troubleshooting.** If the blue "Pending Disbursement Microservice" banner still appears, the browser is rendering the old `DisbursementTracking.tsx`. Route to `Disbursements.jsx` instead.

---

## 7. Client-Side Business Rules

The frontend validates early for usability. **The backend remains the authority**, because UI checks can be bypassed with raw HTTP requests.

### 7.1 Disbursement

1. Only approved applications can receive a plan.
2. Sum of tranche amounts must equal `totalSanctionedAmount` before activation.
3. Tranche amounts must be greater than 0.
4. A stage moves only forward: `SCHEDULED → READY → DISBURSED`.
5. A `DISBURSED` or `CANCELLED` stage cannot be released again.

### 7.2 Compliance

1. A stage with an unmet mandatory requirement cannot be prepared or released.
2. Verification and rejection are officer-only actions and require remarks for audit.

### 7.3 Utilization

1. `0 ≤ Amount Utilized ≤ Amount Disbursed`.
2. Rate is `(utilized ÷ disbursed) × 100`, with a zero-disbursed guard.

---

## 8. End-to-End User Flow

```
Citizen applies (M2) ──► Scoring ──► 5-stage review ──► APPROVED
                                                          │
                                                          ▼
 1. Admin creates disbursement plan (3 tranches, sum check)
 2. Admin activates plan
 3. Officer adds compliance requirements per tranche
 4. Beneficiary uploads geotagged proof
 5. Officer verifies proof            ← release gate opens
 6. Admin prepares stage (READY) and releases (DISBURSED, UTR saved)
 7. Beneficiary records expenditure vouchers
 8. Admin views utilization rate and regional analytics, exports CSV
 9. All tranches DISBURSED ──► plan COMPLETED
```

### Suggested 5-minute live demo

| Time | Screen | Action |
|---|---|---|
| 0:00–1:00 | Disbursements | Show the multi-tranche plan; point out the sum check |
| 1:00–2:00 | Disbursements | Try to release Tranche 1 with compliance pending, and show it is blocked |
| 2:00–3:00 | Compliance | Verify the geotagged proof, then show the overdue severity scale |
| 3:00–4:00 | Disbursements | Release the stage and show the UTR reference |
| 4:00–5:00 | Analytics | Record a voucher, show utilization rate, regional view, CSV export |

---

## 9. Testing and Verification

### 9.1 Backend (documented)

Milestone 3 backend: **130 tests, 0 failures, BUILD SUCCESS** (see the backend report).

### 9.2 Frontend manual verification checklist

Automated frontend tests are not documented for this milestone. Verification is manual:

| # | Scenario | Expected result |
|---|---|---|
| 1 | Create a plan with tranches that do not sum to the total | Activation rejected with a clear message |
| 2 | Release a stage with pending mandatory compliance | Release blocked |
| 3 | Verify compliance, then release | Stage becomes `DISBURSED`, UTR stored |
| 4 | Record utilization above the disbursed amount | Rejected |
| 5 | Record valid utilization | Rate updates correctly |
| 6 | Open Analytics | State, district and scheme breakdown render |
| 7 | Click CSV export | Audit file downloads |
| 8 | Stop Spring Boot and reload | Demo Data Mode activates with no crash |
| 9 | Search a reference in Tracking | Full M2 → M3 timeline shown |

---

## 10. Known Gaps and Future Scope

**Documentation and code alignment (to resolve before final submission)**

| # | Item | Detail |
|---|---|---|
| 1 | Stack wording | `README.md` and the presentation PDF describe React + TypeScript with `admin/`, `beneficiary/`, `officer/` folders. The Milestone 3 pages are `.jsx` under `pages/admin`. Pick one description and use it everywhere. |
| 2 | `/utilization` route | Notes mention a `/utilization` route, but the folder has no `Utilization.jsx`. Utilization currently lives in `Analytics.jsx`. Either add the page or document it as part of Analytics. |
| 3 | Plan list endpoint | The frontend calls `GET /api/v1/disbursement-plans` (list all). The backend report lists get-by-id and get-by-application but not list-all. Confirm the controller exposes it. |
| 4 | Unused backend endpoints | The backend also offers `hold`, `cancel`, `PUT` updates, compliance `submit`, and `/analytics/utilization`. Add them to the UI or note them as future work. |
| 5 | README / PDF | Both still describe Milestone 2 only, and the PDF's Q6 says disbursement was only documented. Update both. |

**Future scope**

- Live PFMS / NPCI APBS integration (requires government IP whitelisting and digital signature certificates).
- Role-based access control on the new screens.
- Real file storage for geotagged proofs, with EXIF coordinate validation.
- Automated frontend tests (component and end-to-end).
- Charts and map-based regional heatmap.

---

## 11. Appendix — File Index

| File | Role |
|---|---|
| `src/pages/admin/Disbursements.jsx` | Multi-tranche plans, tranche progress, DBT release |
| `src/pages/admin/Compliance.jsx` | Compliance desk, verify/reject, SLA countdowns |
| `src/pages/admin/Analytics.jsx` | Fund utilization, regional and scheme telemetry, CSV export |
| `src/pages/admin/Tracking.jsx` | Unified application-to-payment tracker |
| `src/services/api.js` | Shared Axios client and `BACKEND_URL` |
| `src/services/disbursementService.js` | Disbursement plan and stage API calls |
| `src/services/complianceService.js` | Compliance and non-compliance API calls |
| `src/services/utilizationService.js` | Utilization API calls |
| `src/services/analyticsService.js` | Analytics API calls |
| `DisbursementTracking.tsx` | **Superseded** Milestone 2 placeholder |

---

### Summary for Mentor / Viva

> In Milestone 2 we verified and approved who is eligible. In Milestone 3 we built the financial governance after approval: multi-tranche disbursement planning with exact-sum validation, release gates that block payment until geotagged compliance proof is verified, fund utilization tracking with a hard ceiling at the disbursed amount, and regional analytics with a one-click CAG audit export. The frontend calls the Spring Boot APIs directly and falls back to demo data if the backend is offline.
