package com.sgdts.sgdts.application;

import com.sgdts.sgdts.beneficiary.BeneficiaryService;
import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.eligibility.EligibilityAssessment;
import com.sgdts.sgdts.eligibility.EligibilityOutcome;
import com.sgdts.sgdts.eligibility.EligibilityService;
import com.sgdts.sgdts.scheme.CriterionType;
import com.sgdts.sgdts.scheme.SchemeService;
import com.sgdts.sgdts.scheme.dto.CreateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.CriterionDto;
import com.sgdts.sgdts.scheme.dto.RoutingRuleDto;
import com.sgdts.sgdts.scheme.dto.SchemeResponse;
import com.sgdts.sgdts.verification.*;
import com.sgdts.sgdts.verification.dto.RecordDecisionRequest;
import com.sgdts.sgdts.verification.dto.WorkflowResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ApplicationWorkflowIntegrationTest {

    @Autowired
    private BeneficiaryService beneficiaryService;

    @Autowired
    private SchemeService schemeService;

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private EligibilityService eligibilityService;

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private VerificationTaskRepository taskRepository;

    @Autowired
    private EscalationService escalationService;

    @Test
    @DisplayName("End-to-End workflow: Registration -> Scheme -> Submission -> Assessment -> Verification -> Approval")
    void testEndToEndApplicationSubmissionAndApproval() {
        // 1. Register Beneficiary
        RegisterBeneficiaryRequest regReq = RegisterBeneficiaryRequest.builder()
                .fullName("Rajesh Kumar")
                .email("rajesh.kumar." + System.currentTimeMillis() + "@example.gov")
                .phone("+91-9876543210")
                .address("Village Rampur")
                .district("Varanasi")
                .state("Uttar Pradesh")
                .dateOfBirth(LocalDate.of(1985, 3, 10))
                .build();
        BeneficiaryResponse beneficiary = beneficiaryService.register(regReq);
        assertThat(beneficiary.getId()).isNotNull();

        // 2. Create and Activate Scheme
        CreateSchemeRequest schemeReq = CreateSchemeRequest.builder()
                .name("Kisan Drone Subsidy " + System.currentTimeMillis())
                .description("Subsidy for agricultural drones")
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("300000.00"))
                .criteria(List.of(
                        CriterionDto.builder()
                                .criterionId("annual_income")
                                .type(CriterionType.NUMERIC_MAX)
                                .expectedValue("500000")
                                .weight(new BigDecimal("60.0"))
                                .mandatory(true)
                                .build(),
                        CriterionDto.builder()
                                .criterionId("land_size_acres")
                                .type(CriterionType.NUMERIC_MIN)
                                .expectedValue("1.5")
                                .weight(new BigDecimal("40.0"))
                                .mandatory(false)
                                .build()
                ))
                .routingRules(List.of(
                        // Low grant amount route: single stage
                        RoutingRuleDto.builder()
                                .minScore(new BigDecimal("70.0"))
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("10000.00"))
                                .maxGrantAmount(new BigDecimal("100000.00"))
                                .stages(List.of("INITIAL_REVIEW"))
                                .build(),
                        // High grant amount route: two stages
                        RoutingRuleDto.builder()
                                .minScore(new BigDecimal("70.0"))
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("100000.01"))
                                .maxGrantAmount(new BigDecimal("300000.00"))
                                .stages(List.of("INITIAL_REVIEW", "SENIOR_APPROVAL"))
                                .build()
                ))
                .build();
        SchemeResponse scheme = schemeService.createScheme(schemeReq);
        schemeService.activateScheme(scheme.getId());

        // 3. Create Draft Application for Low-Grant Route (50,000)
        com.sgdts.sgdts.application.dto.CreateApplicationRequest appReq =
                new com.sgdts.sgdts.application.dto.CreateApplicationRequest();
        appReq.setBeneficiaryId(beneficiary.getId());
        appReq.setSchemeId(scheme.getId());
        appReq.setRequestedAmount(new BigDecimal("50000.00"));
        appReq.setEligibilityData(Map.of(
                "annual_income", "250000",
                "land_size_acres", "2.0"
        ));
        com.sgdts.sgdts.application.dto.ApplicationResponse draft = applicationService.createDraft(appReq);
        assertThat(draft.getStatus()).isEqualTo(ApplicationStatus.DRAFT);

        // 4. Submit Application -> triggers event coordinator
        com.sgdts.sgdts.application.dto.ApplicationResponse submitted =
                applicationService.submitApplication(draft.getId());

        // Application status transitioned to UNDER_VERIFICATION because assessment passed
        GrantApplication updatedApp = applicationService.findApplication(draft.getId());
        assertThat(updatedApp.getStatus()).isEqualTo(ApplicationStatus.UNDER_VERIFICATION);
        assertThat(updatedApp.getCurrentVerificationStage()).isEqualTo("INITIAL_REVIEW");

        // Verify eligibility assessment
        EligibilityAssessment assessment = eligibilityService.getAssessment(draft.getId());
        assertThat(assessment.getOutcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);
        assertThat(assessment.getNormalizedScore()).isEqualByComparingTo("100.00");

        // Verify verification workflow
        WorkflowResponse workflow = verificationService.getWorkflow(draft.getId());
        assertThat(workflow.getStages()).containsExactly("INITIAL_REVIEW");
        assertThat(workflow.getTasks()).hasSize(1);
        UUID taskId = workflow.getTasks().get(0).getId();

        // 5. Officer records approval on task
        RecordDecisionRequest decReq = new RecordDecisionRequest();
        decReq.setDecision(Decision.APPROVE);
        decReq.setActorId("OFFICER_FIELD_01");
        decReq.setComments("Applicant meets all requirements and land verified");

        verificationService.recordDecision(taskId, decReq);

        // Final verification check: application is APPROVED
        GrantApplication approvedApp = applicationService.findApplication(draft.getId());
        assertThat(approvedApp.getStatus()).isEqualTo(ApplicationStatus.APPROVED);

        WorkflowResponse completedWorkflow = verificationService.getWorkflow(draft.getId());
        assertThat(completedWorkflow.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(completedWorkflow.getFinalDecision()).isEqualTo(Decision.APPROVE);
    }

    @Test
    @DisplayName("Ineligible application fails mandatory condition: status INELIGIBLE, no verification workflow created")
    void testIneligibleApplicationWorkflow() {
        // Register beneficiary
        RegisterBeneficiaryRequest regReq = RegisterBeneficiaryRequest.builder()
                .fullName("Sunil Verma")
                .email("sunil.verma." + System.currentTimeMillis() + "@example.gov")
                .phone("+91-9112233445")
                .address("Plot 12, Indiranagar")
                .district("Lucknow")
                .state("Uttar Pradesh")
                .dateOfBirth(LocalDate.of(1980, 7, 22))
                .build();
        BeneficiaryResponse beneficiary = beneficiaryService.register(regReq);

        // Create Scheme with mandatory condition
        CreateSchemeRequest schemeReq = CreateSchemeRequest.builder()
                .name("Micro Enterprise Grant " + System.currentTimeMillis())
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("100000.00"))
                .criteria(List.of(
                        CriterionDto.builder()
                                .criterionId("annual_turnover")
                                .type(CriterionType.NUMERIC_MAX)
                                .expectedValue("1000000")
                                .weight(new BigDecimal("100.0"))
                                .mandatory(true)
                                .build()
                ))
                .routingRules(List.of(
                        RoutingRuleDto.builder()
                                .minScore(BigDecimal.ZERO)
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("10000.00"))
                                .stages(List.of("INITIAL_REVIEW"))
                                .build()
                ))
                .build();
        SchemeResponse scheme = schemeService.createScheme(schemeReq);
        schemeService.activateScheme(scheme.getId());

        // Create application with failing turnover
        com.sgdts.sgdts.application.dto.CreateApplicationRequest appReq =
                new com.sgdts.sgdts.application.dto.CreateApplicationRequest();
        appReq.setBeneficiaryId(beneficiary.getId());
        appReq.setSchemeId(scheme.getId());
        appReq.setRequestedAmount(new BigDecimal("50000.00"));
        appReq.setEligibilityData(Map.of("annual_turnover", "2500000")); // exceeds 1,000,000!

        com.sgdts.sgdts.application.dto.ApplicationResponse draft = applicationService.createDraft(appReq);
        applicationService.submitApplication(draft.getId());

        // Verify application status is INELIGIBLE
        GrantApplication app = applicationService.findApplication(draft.getId());
        assertThat(app.getStatus()).isEqualTo(ApplicationStatus.INELIGIBLE);

        // Verify no workflow was created
        assertThat(app.getCurrentVerificationStage()).isNull();
    }
}

