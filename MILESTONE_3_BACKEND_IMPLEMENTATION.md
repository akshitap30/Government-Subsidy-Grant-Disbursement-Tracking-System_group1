# Milestone 3 Backend Implementation: Disbursement Scheduling, Compliance Tracking, Fund Utilization, and Analytics

## 1. Executive Summary

Milestone 3 delivers the backend infrastructure for the post-approval lifecycle of the **Government Subsidy & Grant Disbursement Tracking System (SGDTS)**. Once grant applications are approved through Milestone 2's verification workflows, Milestone 3 orchestrates structured multi-stage fund releases, enforces mandatory statutory and milestone-based compliance prerequisites, tracks fund utilization reports, and provides analytical visibility across regional and scheme dimensions.

---

## 2. Architecture & Modules

Milestone 3 is structured into four primary modules under `com.sgdts.sgdts`:

```
com.sgdts.sgdts
├── disbursement/             # Disbursement planning, multi-tranche scheduling, lifecycle transitions
│   ├── DisbursementStatus.java
│   ├── DisbursementStageStatus.java
│   ├── DisbursementPlan.java
│   ├── DisbursementStage.java
│   ├── DisbursementPlanRepository.java
│   ├── DisbursementStageRepository.java
│   ├── DisbursementService.java
│   ├── DisbursementController.java
│   └── dto/
│       ├── CreateDisbursementPlanRequest.java
│       ├── UpdateDisbursementPlanRequest.java
│       ├── DisbursementPlanResponse.java
│       ├── CreateDisbursementStageRequest.java
│       ├── UpdateDisbursementStageRequest.java
│       └── DisbursementStageResponse.java
│
├── compliance/               # Prerequisites, verification checks, overdue detection, reminder logs
│   ├── ComplianceStatus.java
│   ├── ComplianceRequirementType.java
│   ├── NonComplianceSeverity.java
│   ├── NonComplianceFlagStatus.java
│   ├── ComplianceRequirement.java
│   ├── NonComplianceFlag.java
│   ├── ComplianceReminderLog.java
│   ├── ComplianceRequirementRepository.java
│   ├── NonComplianceFlagRepository.java
│   ├── ComplianceReminderLogRepository.java
│   ├── ComplianceService.java
│   ├── NonComplianceService.java
│   ├── ComplianceReminderService.java
│   ├── ComplianceScheduler.java
│   ├── ComplianceController.java
│   └── dto/
│       ├── CreateComplianceRequirementRequest.java
│       ├── ComplianceRequirementResponse.java
│       ├── NonComplianceFlagResponse.java
│       ├── SubmitComplianceRequest.java
│       └── VerifyComplianceRequest.java
│
├── utilization/              # Post-disbursement expenditure, percentage calculations, audit status
│   ├── UtilizationVerificationStatus.java
│   ├── FundUtilization.java
│   ├── FundUtilizationRepository.java
│   ├── FundUtilizationService.java
│   ├── FundUtilizationController.java
│   └── dto/
│       ├── RecordUtilizationRequest.java
│       ├── FundUtilizationResponse.java
│       └── UtilizationSummaryResponse.java
│
└── analytics/                # JPQL aggregates for disbursements, utilization, regional & scheme reports
    ├── AnalyticsService.java
    ├── AnalyticsController.java
    └── dto/
        ├── DisbursementAnalyticsResponse.java
        ├── UtilizationAnalyticsResponse.java
        ├── RegionalAnalyticsResponse.java
        └── SchemeAnalyticsResponse.java
```

---

## 3. Database Schema & Entities

All tables support UUID primary keys (`GenerationType.UUID`), optimistic concurrency locking (`@Version`), and audit timestamps (`createdAt`, `updatedAt` managed via `@PrePersist` and `@PreUpdate`).

### 3.1 `disbursement_plans`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `version` | `BIGINT` | Optimistic lock version |
| `application_id` | `UUID` | NOT NULL, references `grant_application.id` |
| `total_sanctioned_amount` | `NUMERIC(19,2)` | NOT NULL, equals `GrantApplication.requestedAmount` |
| `plan_status` | `VARCHAR(30)` | NOT NULL (DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED) |
| `notes` | `TEXT` | Administrative notes |
| `created_by` / `updated_by` | `VARCHAR(255)` | Officer identifiers |
| `created_at` / `updated_at` | `TIMESTAMP` | Audit timestamps |

### 3.2 `disbursement_stages`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `version` | `BIGINT` | Optimistic lock version |
| `plan_id` | `UUID` | NOT NULL, references `disbursement_plans.id` |
| `stage_number` | `INT` | NOT NULL, unique per plan |
| `stage_name` | `VARCHAR(255)` | NOT NULL (e.g., "Advance Tranche", "Milestone 2 Release") |
| `amount` | `NUMERIC(19,2)` | NOT NULL, > 0 |
| `scheduled_date` | `DATE` | Scheduled disbursement date |
| `release_condition` | `TEXT` | Precondition statement |
| `status` | `VARCHAR(30)` | NOT NULL (SCHEDULED, READY, ON_HOLD, PROCESSING, DISBURSED, FAILED, CANCELLED) |
| `released_at` | `TIMESTAMP` | Timestamp of actual fund disbursement |
| `notes` | `TEXT` | Release remarks |

### 3.3 `compliance_requirements`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `version` | `BIGINT` | Optimistic lock version |
| `application_id` | `UUID` | NOT NULL |
| `stage_id` | `UUID` | Nullable, links to specific `disbursement_stages.id` |
| `requirement_type` | `VARCHAR(50)` | NOT NULL (DOCUMENT_SUBMISSION, FIELD_VISIT, UTILIZATION_REPORT, PROGRESS_REPORT, AUDIT_REPORT, OTHER) |
| `description` | `TEXT` | Detailed requirement |
| `due_date` | `DATE` | NOT NULL |
| `status` | `VARCHAR(30)` | NOT NULL (PENDING, SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, OVERDUE, WAIVED) |
| `mandatory` | `BOOLEAN` | NOT NULL, default `true` |
| `submitted_at` / `submitted_by` | `TIMESTAMP` / `VARCHAR`| Submission metadata |
| `verified_at` / `verified_by` | `TIMESTAMP` / `VARCHAR`| Officer verification metadata |
| `remarks` | `TEXT` | Officer or beneficiary comments |

### 3.4 `non_compliance_flags`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `application_id` | `UUID` | NOT NULL |
| `stage_id` | `UUID` | Optional stage link |
| `requirement_id` | `UUID` | NOT NULL, unique active flag per requirement |
| `flag_type` | `VARCHAR(50)` | e.g. "OVERDUE_COMPLIANCE" |
| `severity` | `VARCHAR(20)` | LOW (<7d), MEDIUM (<14d), HIGH (<30d), CRITICAL (>=30d) |
| `reason` | `TEXT` | Breach description |
| `status` | `VARCHAR(20)` | OPEN, UNDER_REVIEW, RESOLVED, WAIVED |
| `created_at` / `resolved_at` | `TIMESTAMP` | Lifecycle timestamps |
| `resolved_by` | `VARCHAR(255)` | Resolving officer |

### 3.5 `compliance_reminder_logs`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `requirement_id` | `UUID` | NOT NULL |
| `reminder_type` | `VARCHAR(30)` | 7_DAYS_BEFORE, 3_DAYS_BEFORE, 1_DAY_BEFORE, DUE_TODAY, OVERDUE |
| `sent_at` | `TIMESTAMP` | NOT NULL |
| `message` | `TEXT` | Message content |
| `UNIQUE(requirement_id, reminder_type)` | | Prevents duplicate reminders |

### 3.6 `fund_utilizations`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `version` | `BIGINT` | Optimistic lock version |
| `application_id` | `UUID` | NOT NULL |
| `disbursement_stage_id` | `UUID` | Nullable, links to stage |
| `amount_disbursed` | `NUMERIC(19,2)` | NOT NULL |
| `amount_util_ized` | `NUMERIC(19,2)` | NOT NULL, 0 <= amountUtilized <= amountDisbursed |
| `utilization_date` | `DATE` | NOT NULL |
| `category` | `VARCHAR(100)` | Expenditure category |
| `description` | `TEXT` | Detailed bill/invoice notes |
| `verification_status` | `VARCHAR(30)` | PENDING, VERIFIED, REJECTED |
| `recorded_by` | `VARCHAR(255)` | Submitter/Officer |

---

## 4. Business Rules & Domain Logic

### 4.1 Disbursement Lifecycle
1. **Eligibility Gate**: Only applications with `status = APPROVED` can create a disbursement plan.
2. **Singular Active Plan**: An application may have at most one plan in `DRAFT` or `ACTIVE` status.
3. **Exact Amount Reconcilation**:
   - When adding stages, cumulative stage amounts cannot exceed `totalSanctionedAmount`.
   - Activating a plan requires that the sum of non-cancelled stage amounts exactly equals `totalSanctionedAmount`.
4. **Stage State Transitions**:
   - `SCHEDULED -> READY`: Only permitted when all mandatory compliance requirements for the stage are `VERIFIED` or `WAIVED`.
   - `READY -> DISBURSED`: Releases funds, records `releasedAt`, and automatically creates an initial `FundUtilization` record with `amountDisbursed = stage.amount` and `amountUtilized = 0`.
   - `Terminal States`: `DISBURSED` and `CANCELLED` stages cannot be released again.
   - When all stages of an active plan are disbursed, the plan transitions to `COMPLETED`.

### 4.2 Compliance & Automated Escalation
1. **Stage Prerequisite Check**: `ComplianceService.isStageComplianceMet(stageId)` enforces that no stage can be prepared or released without satisfying mandatory compliance.
2. **Automated Scheduler**:
   - `ComplianceScheduler` runs periodically (default 1 hour, configurable via `sgdts.compliance.interval-ms`).
   - Marks requirements with `dueDate < today` as `OVERDUE`.
   - Automatically generates a `NonComplianceFlag` with severity derived from overdue duration:
     - `< 7 days`: `LOW`
     - `< 14 days`: `MEDIUM`
     - `< 30 days`: `HIGH`
     - `>= 30 days`: `CRITICAL`
   - Reminders are logged at 7 days, 3 days, 1 day before due date, on due date, and when overdue, with duplicate suppression enforced by `compliance_reminder_logs`.

### 4.3 Fund Utilization
1. Non-negative constraint: `amountUtilized >= 0`.
2. Upper bound constraint: `amountUtilized <= amountDisbursed`.
3. Utilization percentage: Calculated dynamically as `(amountUtilized / amountDisbursed) * 100` rounded to 2 decimal places. Returns `0.0%` if `amountDisbursed == 0`.

### 4.4 Analytics Aggregation
- **Disbursement Analytics**: Aggregates total applications, approved applications, total sanctioned amounts, total disbursed amounts, and average disbursement per tranche.
- **Utilization Analytics**: Aggregates disbursed vs utilized funds, utilization percentage, and pending utilization.
- **Regional Analytics**: Groups beneficiary applications and financial disbursements by `state` and `district`.
- **Scheme Analytics**: Groups applications, sanction totals, and disbursement metrics by `Scheme`.

---

## 5. API Reference

### 5.1 Disbursement Plan APIs
| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/v1/disbursement-plans` | Create a disbursement plan for an approved application | `201 Created` |
| `GET` | `/api/v1/disbursement-plans/{id}` | Get disbursement plan details including stages | `200 OK` |
| `PUT` | `/api/v1/disbursement-plans/{id}` | Update notes or plan metadata | `200 OK` |
| `GET` | `/api/v1/applications/{applicationId}/disbursement-plan` | Get plan for an application | `200 OK` |
| `POST` | `/api/v1/disbursement-plans/{id}/activate` | Validate stages and activate plan | `200 OK` |
| `POST` | `/api/v1/disbursement-plans/{id}/hold` | Put active plan on hold | `200 OK` |
| `POST` | `/api/v1/disbursement-plans/{id}/cancel` | Cancel draft or active plan | `200 OK` |

### 5.2 Disbursement Stage APIs
| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/v1/disbursement-plans/{planId}/stages` | Add a stage to a disbursement plan | `201 Created` |
| `GET` | `/api/v1/disbursement-plans/{planId}/stages` | List all stages for a plan | `200 OK` |
| `GET` | `/api/v1/disbursement-stages/{stageId}` | Get single stage details | `200 OK` |
| `PUT` | `/api/v1/disbursement-stages/{stageId}` | Update stage parameters | `200 OK` |
| `POST` | `/api/v1/disbursement-stages/{stageId}/prepare` | Validate compliance and mark READY | `200 OK` |
| `POST` | `/api/v1/disbursement-stages/{stageId}/release` | Release funds and mark DISBURSED | `200 OK` |
| `POST` | `/api/v1/disbursement-stages/{stageId}/hold` | Put stage on hold | `200 OK` |
| `POST` | `/api/v1/disbursement-stages/{stageId}/cancel` | Cancel stage | `200 OK` |

### 5.3 Compliance APIs
| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/v1/compliance` | Create compliance requirement | `201 Created` |
| `GET` | `/api/v1/compliance/{id}` | Get requirement by ID | `200 OK` |
| `GET` | `/api/v1/applications/{applicationId}/compliance` | List requirements for application | `200 OK` |
| `GET` | `/api/v1/disbursement-stages/{stageId}/compliance` | List requirements for stage | `200 OK` |
| `POST` | `/api/v1/compliance/{id}/submit` | Beneficiary submits compliance | `200 OK` |
| `POST` | `/api/v1/compliance/{id}/verify` | Officer verifies / approves compliance | `200 OK` |
| `POST` | `/api/v1/compliance/{id}/reject` | Officer rejects compliance | `200 OK` |
| `GET` | `/api/v1/compliance/overdue` | List overdue compliance items | `200 OK` |
| `GET` | `/api/v1/applications/{applicationId}/non-compliance` | List non-compliance flags | `200 OK` |

### 5.4 Fund Utilization APIs
| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/v1/utilization` | Record fund utilization report | `201 Created` |
| `GET` | `/api/v1/utilization/{id}` | Get utilization record | `200 OK` |
| `GET` | `/api/v1/applications/{applicationId}/utilization` | List utilization for application | `200 OK` |
| `GET` | `/api/v1/disbursement-stages/{stageId}/utilization` | List utilization for stage | `200 OK` |
| `GET` | `/api/v1/utilization/summary` | Get summary (overall or by `applicationId`) | `200 OK` |

### 5.5 Analytics APIs
| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/v1/analytics/disbursement` | Disbursed totals, sanction amounts, filters (`schemeId`, `fromDate`, `toDate`) | `200 OK` |
| `GET` | `/api/v1/analytics/utilization` | Utilization totals, pending amounts (filter: `applicationId`) | `200 OK` |
| `GET` | `/api/v1/analytics/regional` | Grouped by `state` and `district` (filters: `state`, `fromDate`, `toDate`) | `200 OK` |
| `GET` | `/api/v1/analytics/schemes` | Scheme breakdown of applications, sanctions, disbursements | `200 OK` |

---

## 6. Testing & Verification

The suite includes 5 new dedicated test classes covering unit and end-to-end integration scenarios:

1. **`DisbursementServiceTest`**: Mockito unit tests verifying approval validation, duplicate plan prevention, stage amount boundaries, compliance release gating, and plan completion transitions.
2. **`ComplianceServiceTest`**: Unit tests verifying requirement lifecycle, submission, officer approval/rejection, stage prerequisite queries, and overdue processing.
3. **`ComplianceReminderServiceTest`**: Unit tests validating interval calculation (7d, 3d, 1d, due today, overdue), duplicate suppression, and terminal state filtering.
4. **`FundUtilizationServiceTest`**: Unit tests validating non-negative constraints, disbursed ceiling checks, percentage calculations, and summary statistics.
5. **`DisbursementIntegrationTest`**: Complete end-to-end integration test spanning Beneficiary Registration -> Scheme Creation -> Application Submission -> Verification Approval -> Disbursement Plan Creation -> Stage Addition & Validation -> Compliance Release Gate -> Stage Release & Initial Fund Recording -> Beneficiary Utilization Tracking -> Multi-dimensional Analytics Verification -> Plan Completion.

### Test Results
```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Tests run: 130, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```
All **130 tests** in the test suite pass cleanly.
