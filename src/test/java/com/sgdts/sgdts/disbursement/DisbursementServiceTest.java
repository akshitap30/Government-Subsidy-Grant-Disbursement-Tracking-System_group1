package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.compliance.ComplianceService;
import com.sgdts.sgdts.disbursement.dto.CreateDisbursementPlanRequest;
import com.sgdts.sgdts.disbursement.dto.CreateDisbursementStageRequest;
import com.sgdts.sgdts.disbursement.dto.DisbursementPlanResponse;
import com.sgdts.sgdts.disbursement.dto.DisbursementStageResponse;
import com.sgdts.sgdts.utilization.FundUtilizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisbursementServiceTest {

    @Mock
    private DisbursementPlanRepository planRepository;

    @Mock
    private DisbursementStageRepository stageRepository;

    @Mock
    private ApplicationService applicationService;

    @Mock
    private ComplianceService complianceService;

    @Mock
    private FundUtilizationService fundUtilizationService;

    @InjectMocks
    private DisbursementService disbursementService;

    private UUID applicationId;
    private UUID planId;
    private UUID stageId;
    private GrantApplication approvedApp;
    private DisbursementPlan draftPlan;
    private DisbursementStage scheduledStage;

    @BeforeEach
    void setUp() {
        applicationId = UUID.randomUUID();
        planId = UUID.randomUUID();
        stageId = UUID.randomUUID();

        approvedApp = GrantApplication.builder()
                .id(applicationId)
                .status(ApplicationStatus.APPROVED)
                .requestedAmount(new BigDecimal("100000.00"))
                .referenceNumber("APP-12345")
                .beneficiaryId(UUID.randomUUID())
                .schemeId(UUID.randomUUID())
                .build();

        draftPlan = DisbursementPlan.builder()
                .id(planId)
                .applicationId(applicationId)
                .totalSanctionedAmount(new BigDecimal("100000.00"))
                .planStatus(DisbursementStatus.DRAFT)
                .build();

        scheduledStage = DisbursementStage.builder()
                .id(stageId)
                .planId(planId)
                .stageNumber(1)
                .stageName("Tranche 1")
                .amount(new BigDecimal("100000.00"))
                .scheduledDate(LocalDate.now().plusDays(10))
                .status(DisbursementStageStatus.SCHEDULED)
                .build();
    }

    @Test
    @DisplayName("Create plan succeeds when application is APPROVED and no active plan exists")
    void testCreatePlan_Success() {
        when(applicationService.findApplication(applicationId)).thenReturn(approvedApp);
        when(planRepository.existsByApplicationIdAndPlanStatusIn(eq(applicationId), any())).thenReturn(false);
        when(planRepository.save(any(DisbursementPlan.class))).thenAnswer(i -> {
            DisbursementPlan p = i.getArgument(0);
            p.setId(planId);
            return p;
        });

        CreateDisbursementPlanRequest req = CreateDisbursementPlanRequest.builder()
                .applicationId(applicationId)
                .notes("Standard plan")
                .createdBy("OFFICER_1")
                .build();

        DisbursementPlanResponse resp = disbursementService.createPlan(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getPlanStatus()).isEqualTo(DisbursementStatus.DRAFT);
        assertThat(resp.getTotalSanctionedAmount()).isEqualByComparingTo("100000.00");
        verify(planRepository).save(any(DisbursementPlan.class));
    }

    @Test
    @DisplayName("Create plan throws BusinessException if application is not APPROVED")
    void testCreatePlan_ThrowsBusinessException_WhenNotApproved() {
        approvedApp.setStatus(ApplicationStatus.SUBMITTED);
        when(applicationService.findApplication(applicationId)).thenReturn(approvedApp);

        CreateDisbursementPlanRequest req = CreateDisbursementPlanRequest.builder()
                .applicationId(applicationId)
                .build();

        assertThatThrownBy(() -> disbursementService.createPlan(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only APPROVED applications are eligible");
    }

    @Test
    @DisplayName("Create plan throws ConflictException if active or draft plan already exists")
    void testCreatePlan_ThrowsConflictException_WhenPlanAlreadyExists() {
        when(applicationService.findApplication(applicationId)).thenReturn(approvedApp);
        when(planRepository.existsByApplicationIdAndPlanStatusIn(eq(applicationId), any())).thenReturn(true);

        CreateDisbursementPlanRequest req = CreateDisbursementPlanRequest.builder()
                .applicationId(applicationId)
                .build();

        assertThatThrownBy(() -> disbursementService.createPlan(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists for this application");
    }

    @Test
    @DisplayName("Add stage succeeds when amount does not exceed sanctioned total and stage number is unique")
    void testAddStage_Success() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(stageRepository.existsByPlanIdAndStageNumber(planId, 1)).thenReturn(false);
        when(stageRepository.sumAmountByPlanIdAndStatusNot(eq(planId), any())).thenReturn(BigDecimal.ZERO);
        when(stageRepository.save(any(DisbursementStage.class))).thenAnswer(i -> {
            DisbursementStage s = i.getArgument(0);
            s.setId(stageId);
            return s;
        });

        CreateDisbursementStageRequest req = CreateDisbursementStageRequest.builder()
                .stageNumber(1)
                .stageName("Stage 1")
                .amount(new BigDecimal("50000.00"))
                .scheduledDate(LocalDate.now().plusDays(5))
                .build();

        DisbursementStageResponse resp = disbursementService.addStage(planId, req);

        assertThat(resp).isNotNull();
        assertThat(resp.getStageNumber()).isEqualTo(1);
        assertThat(resp.getStatus()).isEqualTo(DisbursementStageStatus.SCHEDULED);
    }

    @Test
    @DisplayName("Add stage throws ConflictException if stage number already exists")
    void testAddStage_ThrowsConflictException_DuplicateStageNumber() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(stageRepository.existsByPlanIdAndStageNumber(planId, 1)).thenReturn(true);

        CreateDisbursementStageRequest req = CreateDisbursementStageRequest.builder()
                .stageNumber(1)
                .stageName("Stage 1")
                .amount(new BigDecimal("50000.00"))
                .build();

        assertThatThrownBy(() -> disbursementService.addStage(planId, req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("Add stage throws BusinessException if total stage amount exceeds sanctioned amount")
    void testAddStage_ThrowsBusinessException_ExceedsSanctioned() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(stageRepository.existsByPlanIdAndStageNumber(planId, 1)).thenReturn(false);
        when(stageRepository.sumAmountByPlanIdAndStatusNot(eq(planId), any())).thenReturn(new BigDecimal("70000.00"));

        CreateDisbursementStageRequest req = CreateDisbursementStageRequest.builder()
                .stageNumber(1)
                .stageName("Stage 1")
                .amount(new BigDecimal("40000.00")) // 70k + 40k = 110k > 100k
                .build();

        assertThatThrownBy(() -> disbursementService.addStage(planId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceed the sanctioned amount");
    }

    @Test
    @DisplayName("Activate plan succeeds when total stage amounts equal sanctioned amount")
    void testActivatePlan_Success() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(stageRepository.findByPlanIdOrderByStageNumberAsc(planId)).thenReturn(List.of(scheduledStage));
        when(stageRepository.sumAmountByPlanIdAndStatusNot(eq(planId), any())).thenReturn(new BigDecimal("100000.00"));
        when(planRepository.save(any(DisbursementPlan.class))).thenReturn(draftPlan);

        DisbursementPlanResponse resp = disbursementService.activatePlan(planId);

        assertThat(resp.getPlanStatus()).isEqualTo(DisbursementStatus.ACTIVE);
    }

    @Test
    @DisplayName("Activate plan throws BusinessException if stage amounts do not match sanctioned amount")
    void testActivatePlan_ThrowsBusinessException_WhenSumMismatch() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(stageRepository.findByPlanIdOrderByStageNumberAsc(planId)).thenReturn(List.of(scheduledStage));
        when(stageRepository.sumAmountByPlanIdAndStatusNot(eq(planId), any())).thenReturn(new BigDecimal("60000.00"));

        assertThatThrownBy(() -> disbursementService.activatePlan(planId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must equal total sanctioned amount");
    }

    @Test
    @DisplayName("Prepare stage succeeds when mandatory compliance is verified")
    void testPrepareStage_Success() {
        when(stageRepository.findById(stageId)).thenReturn(Optional.of(scheduledStage));
        when(complianceService.isStageComplianceMet(stageId)).thenReturn(true);
        when(stageRepository.save(any(DisbursementStage.class))).thenReturn(scheduledStage);

        DisbursementStageResponse resp = disbursementService.prepareStage(stageId);

        assertThat(resp.getStatus()).isEqualTo(DisbursementStageStatus.READY);
    }

    @Test
    @DisplayName("Prepare stage throws BusinessException when mandatory compliance is not met")
    void testPrepareStage_ThrowsBusinessException_WhenComplianceNotMet() {
        when(stageRepository.findById(stageId)).thenReturn(Optional.of(scheduledStage));
        when(complianceService.isStageComplianceMet(stageId)).thenReturn(false);

        assertThatThrownBy(() -> disbursementService.prepareStage(stageId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("mandatory compliance requirements are not verified");
    }

    @Test
    @DisplayName("Release stage transitions to DISBURSED, records disbursement, and sets releasedAt")
    void testReleaseStage_Success() {
        draftPlan.setPlanStatus(DisbursementStatus.ACTIVE);
        scheduledStage.setStatus(DisbursementStageStatus.READY);

        when(stageRepository.findById(stageId)).thenReturn(Optional.of(scheduledStage));
        when(planRepository.findById(planId)).thenReturn(Optional.of(draftPlan));
        when(complianceService.isStageComplianceMet(stageId)).thenReturn(true);
        when(stageRepository.save(any(DisbursementStage.class))).thenAnswer(i -> i.getArgument(0));
        when(stageRepository.findByPlanIdOrderByStageNumberAsc(planId)).thenReturn(List.of(scheduledStage));

        DisbursementStageResponse resp = disbursementService.releaseStage(stageId);

        assertThat(resp.getStatus()).isEqualTo(DisbursementStageStatus.DISBURSED);
        assertThat(resp.getReleasedAt()).isNotNull();
        verify(fundUtilizationService).recordStageDisbursement(eq(applicationId), eq(stageId), eq(scheduledStage.getAmount()));
        verify(planRepository).save(argThat(p -> p.getPlanStatus() == DisbursementStatus.COMPLETED));
    }

    @Test
    @DisplayName("Release stage throws BusinessException if stage is already DISBURSED")
    void testReleaseStage_ThrowsBusinessException_WhenAlreadyDisbursed() {
        scheduledStage.setStatus(DisbursementStageStatus.DISBURSED);
        when(stageRepository.findById(stageId)).thenReturn(Optional.of(scheduledStage));

        assertThatThrownBy(() -> disbursementService.releaseStage(stageId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot release stage in status: DISBURSED");
    }
}
