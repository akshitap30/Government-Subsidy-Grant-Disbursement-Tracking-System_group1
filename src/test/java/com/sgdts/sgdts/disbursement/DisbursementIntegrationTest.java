package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.analytics.AnalyticsService;
import com.sgdts.sgdts.analytics.dto.DisbursementAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.RegionalAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.SchemeAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.UtilizationAnalyticsResponse;
import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.beneficiary.BeneficiaryService;
import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.compliance.ComplianceRequirementType;
import com.sgdts.sgdts.compliance.ComplianceService;
import com.sgdts.sgdts.compliance.dto.ComplianceRequirementResponse;
import com.sgdts.sgdts.compliance.dto.CreateComplianceRequirementRequest;
import com.sgdts.sgdts.compliance.dto.SubmitComplianceRequest;
import com.sgdts.sgdts.compliance.dto.VerifyComplianceRequest;
import com.sgdts.sgdts.disbursement.dto.CreateDisbursementPlanRequest;
import com.sgdts.sgdts.disbursement.dto.CreateDisbursementStageRequest;
import com.sgdts.sgdts.disbursement.dto.DisbursementPlanResponse;
import com.sgdts.sgdts.disbursement.dto.DisbursementStageResponse;
import com.sgdts.sgdts.scheme.CriterionType;
import com.sgdts.sgdts.scheme.SchemeService;
import com.sgdts.sgdts.scheme.dto.CreateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.CriterionDto;
import com.sgdts.sgdts.scheme.dto.RoutingRuleDto;
import com.sgdts.sgdts.scheme.dto.SchemeResponse;
import com.sgdts.sgdts.utilization.FundUtilizationService;
import com.sgdts.sgdts.utilization.dto.FundUtilizationResponse;
import com.sgdts.sgdts.utilization.dto.RecordUtilizationRequest;
import com.sgdts.sgdts.utilization.dto.UtilizationSummaryResponse;
import com.sgdts.sgdts.verification.Decision;
import com.sgdts.sgdts.verification.VerificationService;
import com.sgdts.sgdts.verification.dto.RecordDecisionRequest;
import com.sgdts.sgdts.verification.dto.WorkflowResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class DisbursementIntegrationTest {

    @Autowired
    private BeneficiaryService beneficiaryService;

    @Autowired
    private SchemeService schemeService;

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private DisbursementService disbursementService;

    @Autowired
    private ComplianceService complianceService;

    @Autowired
    private FundUtilizationService utilizationService;

    @Autowired
    private AnalyticsService analyticsService;

    @Test
    @DisplayName("Complete Milestone 3 Workflow: Application approval -> Disbursement Plan -> Stages -> Compliance verification -> Disbursement -> Utilization tracking -> Analytics")
    void testCompleteMilestone3Lifecycle() {
        // 1. Register Beneficiary
        RegisterBeneficiaryRequest regReq = RegisterBeneficiaryRequest.builder()
                .fullName("Pooja Sharma")
                .email("pooja.sharma." + System.currentTimeMillis() + "@example.gov")
                .phone("+91-9876500000")
                .address("45 Green Valley Road")
                .district("Pune")
                .state("Maharashtra")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .build();
        BeneficiaryResponse beneficiary = beneficiaryService.register(regReq);

        // 2. Create Scheme
        CreateSchemeRequest schemeReq = CreateSchemeRequest.builder()
                .name("Solar Irrigation Subsidy " + System.currentTimeMillis())
                .description("Subsidy for solar pump installations")
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("200000.00"))
                .criteria(List.of(
                        CriterionDto.builder()
                                .criterionId("annual_income")
                                .type(CriterionType.NUMERIC_MAX)
                                .expectedValue("600000")
                                .weight(new BigDecimal("100.0"))
                                .mandatory(true)
                                .build()
                ))
                .routingRules(List.of(
                        RoutingRuleDto.builder()
                                .minScore(new BigDecimal("50.0"))
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("10000.00"))
                                .maxGrantAmount(new BigDecimal("200000.00"))
                                .stages(List.of("INITIAL_REVIEW"))
                                .build()
                ))
                .build();
        SchemeResponse scheme = schemeService.createScheme(schemeReq);
        schemeService.activateScheme(scheme.getId());

        // 3. Create Draft Application for 100,000.00 and submit
        com.sgdts.sgdts.application.dto.CreateApplicationRequest appReq =
                new com.sgdts.sgdts.application.dto.CreateApplicationRequest();
        appReq.setBeneficiaryId(beneficiary.getId());
        appReq.setSchemeId(scheme.getId());
        appReq.setRequestedAmount(new BigDecimal("100000.00"));
        appReq.setEligibilityData(Map.of("annual_income", "300000"));

        com.sgdts.sgdts.application.dto.ApplicationResponse draft = applicationService.createDraft(appReq);
        applicationService.submitApplication(draft.getId());

        // 4. Verify & Approve Application
        WorkflowResponse workflow = verificationService.getWorkflow(draft.getId());
        UUID taskId = workflow.getTasks().get(0).getId();

        RecordDecisionRequest decReq = new RecordDecisionRequest();
        decReq.setDecision(Decision.APPROVE);
        decReq.setActorId("OFFICER_FIELD");
        decReq.setComments("Applicant is fully qualified");
        verificationService.recordDecision(taskId, decReq);

        GrantApplication approvedApp = applicationService.findApplication(draft.getId());
        assertThat(approvedApp.getStatus()).isEqualTo(ApplicationStatus.APPROVED);

        // 5. Create Disbursement Plan for approved application
        CreateDisbursementPlanRequest planReq = CreateDisbursementPlanRequest.builder()
                .applicationId(approvedApp.getId())
                .notes("Disbursement in two equal tranches")
                .createdBy("FINANCE_ADMIN")
                .build();

        DisbursementPlanResponse planResp = disbursementService.createPlan(planReq);
        assertThat(planResp.getPlanStatus()).isEqualTo(DisbursementStatus.DRAFT);
        assertThat(planResp.getTotalSanctionedAmount()).isEqualByComparingTo("100000.00");

        // 6. Add Stage 1 (40,000.00)
        CreateDisbursementStageRequest stage1Req = CreateDisbursementStageRequest.builder()
                .stageNumber(1)
                .stageName("Advance Tranche")
                .amount(new BigDecimal("40000.00"))
                .scheduledDate(LocalDate.now().plusDays(7))
                .releaseCondition("Submission of quotation and supplier agreement")
                .build();
        DisbursementStageResponse stage1 = disbursementService.addStage(planResp.getId(), stage1Req);
        assertThat(stage1.getStatus()).isEqualTo(DisbursementStageStatus.SCHEDULED);

        // Try to activate plan now -> should fail because 40k != 100k
        assertThatThrownBy(() -> disbursementService.activatePlan(planResp.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must equal total sanctioned amount");

        // Add Stage 2 (60,000.00)
        CreateDisbursementStageRequest stage2Req = CreateDisbursementStageRequest.builder()
                .stageNumber(2)
                .stageName("Final Tranche")
                .amount(new BigDecimal("60000.00"))
                .scheduledDate(LocalDate.now().plusDays(30))
                .releaseCondition("Installation certificate and utilization report")
                .build();
        DisbursementStageResponse stage2 = disbursementService.addStage(planResp.getId(), stage2Req);
        assertThat(stage2.getStatus()).isEqualTo(DisbursementStageStatus.SCHEDULED);

        // 7. Activate Plan -> now sum is 100k, should succeed!
        DisbursementPlanResponse activatedPlan = disbursementService.activatePlan(planResp.getId());
        assertThat(activatedPlan.getPlanStatus()).isEqualTo(DisbursementStatus.ACTIVE);

        // 8. Add mandatory Compliance Requirement for Stage 1
        CreateComplianceRequirementRequest compReq = CreateComplianceRequirementRequest.builder()
                .applicationId(approvedApp.getId())
                .stageId(stage1.getId())
                .requirementType(ComplianceRequirementType.DOCUMENT_SUBMISSION)
                .description("Supplier Agreement Copy")
                .dueDate(LocalDate.now().plusDays(5))
                .mandatory(true)
                .build();
        ComplianceRequirementResponse comp = complianceService.createRequirement(compReq);
        assertThat(comp.getStatus()).isEqualTo(com.sgdts.sgdts.compliance.ComplianceStatus.PENDING);

        // 9. Attempt to prepare Stage 1 before compliance verified -> fails
        assertThatThrownBy(() -> disbursementService.prepareStage(stage1.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("mandatory compliance requirements are not verified");

        // 10. Submit and Verify compliance
        complianceService.submitCompliance(comp.getId(), SubmitComplianceRequest.builder()
                .submittedBy("BENEFICIARY_USER")
                .remarks("Attached supplier agreement")
                .build());

        complianceService.verifyCompliance(comp.getId(), VerifyComplianceRequest.builder()
                .verifiedBy("COMPLIANCE_OFFICER")
                .approved(true)
                .remarks("Agreement verified valid")
                .build());

        // 11. Prepare Stage 1 -> succeeds, status READY
        DisbursementStageResponse readyStage1 = disbursementService.prepareStage(stage1.getId());
        assertThat(readyStage1.getStatus()).isEqualTo(DisbursementStageStatus.READY);

        // 12. Release Stage 1 -> status DISBURSED, records initial fund disbursement
        DisbursementStageResponse releasedStage1 = disbursementService.releaseStage(stage1.getId());
        assertThat(releasedStage1.getStatus()).isEqualTo(DisbursementStageStatus.DISBURSED);
        assertThat(releasedStage1.getReleasedAt()).isNotNull();

        // 13. Record utilization by beneficiary
        RecordUtilizationRequest utilReq = RecordUtilizationRequest.builder()
                .applicationId(approvedApp.getId())
                .disbursementStageId(stage1.getId())
                .amountDisbursed(new BigDecimal("40000.00"))
                .amountUtilized(new BigDecimal("35000.00"))
                .utilizationDate(LocalDate.now())
                .category("SOLAR_PUMP_PURCHASE")
                .description("Purchased solar inverter and submersible pump")
                .recordedBy("BENEFICIARY")
                .build();
        FundUtilizationResponse utilResp = utilizationService.recordUtilization(utilReq);
        assertThat(utilResp.getUtilizationPercentage()).isEqualTo(87.5);

        // 14. Check Utilization Summary
        UtilizationSummaryResponse summary = utilizationService.getSummary(approvedApp.getId());
        assertThat(summary.getTotalDisbursed()).isGreaterThanOrEqualTo(new BigDecimal("40000.00"));
        assertThat(summary.getTotalUtilized()).isEqualTo(new BigDecimal("35000.00"));

        // 15. Check Analytics
        DisbursementAnalyticsResponse disbAnalytics = analyticsService.getDisbursementAnalytics(scheme.getId(), null, null);
        assertThat(disbAnalytics.getTotalApplications()).isGreaterThanOrEqualTo(1);
        assertThat(disbAnalytics.getApprovedApplications()).isGreaterThanOrEqualTo(1);
        assertThat(disbAnalytics.getTotalSanctionedAmount()).isGreaterThanOrEqualTo(new BigDecimal("100000.00"));
        assertThat(disbAnalytics.getTotalDisbursedAmount()).isGreaterThanOrEqualTo(new BigDecimal("40000.00"));

        UtilizationAnalyticsResponse utilAnalytics = analyticsService.getUtilizationAnalytics(approvedApp.getId());
        assertThat(utilAnalytics.getTotalDisbursed()).isGreaterThanOrEqualTo(new BigDecimal("40000.00"));
        assertThat(utilAnalytics.getTotalUtilized()).isEqualTo(new BigDecimal("35000.00"));

        List<RegionalAnalyticsResponse> regional = analyticsService.getRegionalAnalytics("Maharashtra", null, null);
        assertThat(regional).isNotEmpty();
        assertThat(regional.get(0).getState()).isEqualTo("Maharashtra");

        List<SchemeAnalyticsResponse> schemeAnalytics = analyticsService.getSchemeAnalytics();
        assertThat(schemeAnalytics).isNotEmpty();

        // 16. Complete Stage 2 to test plan completion
        disbursementService.prepareStage(stage2.getId()); // no mandatory compliance on stage 2
        DisbursementStageResponse releasedStage2 = disbursementService.releaseStage(stage2.getId());
        assertThat(releasedStage2.getStatus()).isEqualTo(DisbursementStageStatus.DISBURSED);

        // All stages disbursed -> Plan should be COMPLETED!
        DisbursementPlanResponse completedPlan = disbursementService.getPlan(planResp.getId());
        assertThat(completedPlan.getPlanStatus()).isEqualTo(DisbursementStatus.COMPLETED);
    }
}
