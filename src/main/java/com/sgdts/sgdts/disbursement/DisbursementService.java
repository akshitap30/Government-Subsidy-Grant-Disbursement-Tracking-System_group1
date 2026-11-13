package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.compliance.ComplianceService;
import com.sgdts.sgdts.disbursement.dto.*;
import com.sgdts.sgdts.utilization.FundUtilizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DisbursementService {

    private final DisbursementPlanRepository planRepository;
    private final DisbursementStageRepository stageRepository;
    private final ApplicationService applicationService;
    private final ComplianceService complianceService;
    private final FundUtilizationService fundUtilizationService;

    private static final List<DisbursementStatus> BLOCKING_PLAN_STATUSES = List.of(
            DisbursementStatus.DRAFT,
            DisbursementStatus.ACTIVE
    );

    public DisbursementPlanResponse createPlan(CreateDisbursementPlanRequest request) {
        GrantApplication application = applicationService.findApplication(request.getApplicationId());

        // 1. Only APPROVED applications can create a disbursement plan
        if (application.getStatus() != ApplicationStatus.APPROVED) {
            throw new BusinessException("Cannot create disbursement plan for application with status: "
                    + application.getStatus() + ". Only APPROVED applications are eligible.");
        }

        // 2. Only one ACTIVE/DRAFT plan per application
        if (planRepository.existsByApplicationIdAndPlanStatusIn(request.getApplicationId(), BLOCKING_PLAN_STATUSES)) {
            throw new ConflictException("An active or draft disbursement plan already exists for this application");
        }

        DisbursementPlan plan = DisbursementPlan.builder()
                .applicationId(request.getApplicationId())
                .totalSanctionedAmount(application.getRequestedAmount())
                .planStatus(DisbursementStatus.DRAFT)
                .notes(request.getNotes())
                .createdBy(request.getCreatedBy())
                .build();

        DisbursementPlan saved = planRepository.save(plan);
        log.info("Created disbursement plan id={} for application={}", saved.getId(), saved.getApplicationId());
        return DisbursementPlanResponse.from(saved, List.of());
    }

    @Transactional(readOnly = true)
    public DisbursementPlanResponse getPlan(UUID id) {
        DisbursementPlan plan = findPlan(id);
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        return DisbursementPlanResponse.from(plan, stages);
    }

    @Transactional(readOnly = true)
    public DisbursementPlanResponse getPlanByApplication(UUID applicationId) {
        DisbursementPlan plan = planRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new NotFoundException("DisbursementPlan for application", applicationId));
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        return DisbursementPlanResponse.from(plan, stages);
    }

    @Transactional(readOnly = true)
    public DisbursementPlan findPlan(UUID id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DisbursementPlan", id));
    }

    public DisbursementPlanResponse updatePlan(UUID id, UpdateDisbursementPlanRequest request) {
        DisbursementPlan plan = findPlan(id);
        if (request.getNotes() != null) {
            plan.setNotes(request.getNotes());
        }
        if (request.getUpdatedBy() != null) {
            plan.setUpdatedBy(request.getUpdatedBy());
        }
        DisbursementPlan saved = planRepository.save(plan);
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        return DisbursementPlanResponse.from(saved, stages);
    }

    public DisbursementPlanResponse activatePlan(UUID id) {
        DisbursementPlan plan = findPlan(id);

        if (plan.getPlanStatus() != DisbursementStatus.DRAFT && plan.getPlanStatus() != DisbursementStatus.ON_HOLD) {
            throw new BusinessException("Cannot activate plan with status: " + plan.getPlanStatus());
        }

        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        if (stages.isEmpty()) {
            throw new BusinessException("Cannot activate plan without any stages");
        }

        // Validate total stage amounts equal totalSanctionedAmount
        BigDecimal totalStageAmount = stageRepository.sumAmountByPlanIdAndStatusNot(plan.getId(), DisbursementStageStatus.CANCELLED);
        if (totalStageAmount.compareTo(plan.getTotalSanctionedAmount()) != 0) {
            throw new BusinessException("Total stage amounts (" + totalStageAmount
                    + ") must equal total sanctioned amount (" + plan.getTotalSanctionedAmount() + ")");
        }

        plan.setPlanStatus(DisbursementStatus.ACTIVE);
        DisbursementPlan saved = planRepository.save(plan);
        log.info("Activated disbursement plan id={}", saved.getId());
        return DisbursementPlanResponse.from(saved, stages);
    }

    public DisbursementPlanResponse holdPlan(UUID id) {
        DisbursementPlan plan = findPlan(id);
        if (plan.getPlanStatus() != DisbursementStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE plans can be put ON_HOLD. Current status: " + plan.getPlanStatus());
        }
        plan.setPlanStatus(DisbursementStatus.ON_HOLD);
        DisbursementPlan saved = planRepository.save(plan);
        log.info("Put disbursement plan id={} ON_HOLD", saved.getId());
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        return DisbursementPlanResponse.from(saved, stages);
    }

    public DisbursementPlanResponse cancelPlan(UUID id) {
        DisbursementPlan plan = findPlan(id);
        if (plan.getPlanStatus() != DisbursementStatus.DRAFT && plan.getPlanStatus() != DisbursementStatus.ACTIVE) {
            throw new BusinessException("Cannot cancel plan in status: " + plan.getPlanStatus());
        }
        plan.setPlanStatus(DisbursementStatus.CANCELLED);
        DisbursementPlan saved = planRepository.save(plan);
        log.info("Cancelled disbursement plan id={}", saved.getId());
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        return DisbursementPlanResponse.from(saved, stages);
    }

    // ================= STAGE OPERATIONS =================

    public DisbursementStageResponse addStage(UUID planId, CreateDisbursementStageRequest request) {
        DisbursementPlan plan = findPlan(planId);

        if (plan.getPlanStatus() == DisbursementStatus.COMPLETED || plan.getPlanStatus() == DisbursementStatus.CANCELLED) {
            throw new BusinessException("Cannot add stages to a " + plan.getPlanStatus() + " plan");
        }

        if (stageRepository.existsByPlanIdAndStageNumber(planId, request.getStageNumber())) {
            throw new ConflictException("Stage number " + request.getStageNumber() + " already exists in this plan");
        }

        BigDecimal currentSum = stageRepository.sumAmountByPlanIdAndStatusNot(planId, DisbursementStageStatus.CANCELLED);
        BigDecimal newTotal = currentSum.add(request.getAmount());
        if (newTotal.compareTo(plan.getTotalSanctionedAmount()) > 0) {
            throw new BusinessException("Adding this stage with amount " + request.getAmount()
                    + " would make total stage amount (" + newTotal
                    + ") exceed the sanctioned amount (" + plan.getTotalSanctionedAmount() + ")");
        }

        DisbursementStage stage = DisbursementStage.builder()
                .planId(planId)
                .stageNumber(request.getStageNumber())
                .stageName(request.getStageName())
                .amount(request.getAmount())
                .scheduledDate(request.getScheduledDate())
                .releaseCondition(request.getReleaseCondition())
                .status(DisbursementStageStatus.SCHEDULED)
                .notes(request.getNotes())
                .build();

        DisbursementStage saved = stageRepository.save(stage);
        log.info("Added stage {} to plan id={}", saved.getStageNumber(), planId);
        return DisbursementStageResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DisbursementStageResponse> getStages(UUID planId) {
        findPlan(planId);
        return stageRepository.findByPlanIdOrderByStageNumberAsc(planId).stream()
                .map(DisbursementStageResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DisbursementStageResponse getStage(UUID stageId) {
        return DisbursementStageResponse.from(findStage(stageId));
    }

    @Transactional(readOnly = true)
    public DisbursementStage findStage(UUID stageId) {
        return stageRepository.findById(stageId)
                .orElseThrow(() -> new NotFoundException("DisbursementStage", stageId));
    }

    public DisbursementStageResponse updateStage(UUID stageId, UpdateDisbursementStageRequest request) {
        DisbursementStage stage = findStage(stageId);
        if (stage.getStatus() == DisbursementStageStatus.DISBURSED || stage.getStatus() == DisbursementStageStatus.CANCELLED) {
            throw new BusinessException("Cannot update stage in status: " + stage.getStatus());
        }

        if (request.getAmount() != null && request.getAmount().compareTo(stage.getAmount()) != 0) {
            DisbursementPlan plan = findPlan(stage.getPlanId());
            BigDecimal currentSumWithoutThis = stageRepository.sumAmountByPlanIdAndStatusNot(stage.getPlanId(), DisbursementStageStatus.CANCELLED)
                    .subtract(stage.getAmount());
            BigDecimal newTotal = currentSumWithoutThis.add(request.getAmount());
            if (newTotal.compareTo(plan.getTotalSanctionedAmount()) > 0) {
                throw new BusinessException("Updated stage amount would make total stage amounts (" + newTotal
                        + ") exceed sanctioned amount (" + plan.getTotalSanctionedAmount() + ")");
            }
            stage.setAmount(request.getAmount());
        }

        if (request.getStageName() != null) {
            stage.setStageName(request.getStageName());
        }
        if (request.getScheduledDate() != null) {
            stage.setScheduledDate(request.getScheduledDate());
        }
        if (request.getReleaseCondition() != null) {
            stage.setReleaseCondition(request.getReleaseCondition());
        }
        if (request.getNotes() != null) {
            stage.setNotes(request.getNotes());
        }

        DisbursementStage saved = stageRepository.save(stage);
        log.info("Updated stage id={}", stageId);
        return DisbursementStageResponse.from(saved);
    }

    public DisbursementStageResponse prepareStage(UUID stageId) {
        DisbursementStage stage = findStage(stageId);

        if (stage.getStatus() != DisbursementStageStatus.SCHEDULED) {
            throw new BusinessException("Stage can only be prepared from SCHEDULED status. Current: " + stage.getStatus());
        }

        // Mandatory compliance must be VERIFIED before stage can go READY
        if (!complianceService.isStageComplianceMet(stage.getId())) {
            throw new BusinessException("Cannot prepare stage: mandatory compliance requirements are not verified");
        }

        stage.setStatus(DisbursementStageStatus.READY);
        DisbursementStage saved = stageRepository.save(stage);
        log.info("Prepared stage id={} -> READY", stageId);
        return DisbursementStageResponse.from(saved);
    }

    public DisbursementStageResponse releaseStage(UUID stageId) {
        DisbursementStage stage = findStage(stageId);

        // A DISBURSED or CANCELLED stage cannot be released again
        if (stage.getStatus() == DisbursementStageStatus.DISBURSED || stage.getStatus() == DisbursementStageStatus.CANCELLED) {
            throw new BusinessException("Cannot release stage in status: " + stage.getStatus());
        }

        DisbursementPlan plan = findPlan(stage.getPlanId());
        if (plan.getPlanStatus() != DisbursementStatus.ACTIVE) {
            throw new BusinessException("Cannot release stage when plan status is: " + plan.getPlanStatus());
        }

        // Check mandatory compliance for that stage is VERIFIED
        if (!complianceService.isStageComplianceMet(stage.getId())) {
            throw new BusinessException("Cannot release stage: mandatory compliance requirements are not verified");
        }

        stage.setStatus(DisbursementStageStatus.PROCESSING);
        stage.setStatus(DisbursementStageStatus.DISBURSED);
        stage.setReleasedAt(LocalDateTime.now());
        DisbursementStage saved = stageRepository.save(stage);

        // Create FundUtilization record with amountDisbursed=stage.amount, amountUtilized=0
        fundUtilizationService.recordStageDisbursement(plan.getApplicationId(), stage.getId(), stage.getAmount());

        // Check if all non-cancelled stages are disbursed to mark plan completed
        List<DisbursementStage> stages = stageRepository.findByPlanIdOrderByStageNumberAsc(plan.getId());
        boolean allFinished = stages.stream()
                .filter(s -> s.getStatus() != DisbursementStageStatus.CANCELLED)
                .allMatch(s -> s.getStatus() == DisbursementStageStatus.DISBURSED);

        if (allFinished) {
            plan.setPlanStatus(DisbursementStatus.COMPLETED);
            planRepository.save(plan);
            log.info("All stages disbursed; marked plan id={} COMPLETED", plan.getId());
        }

        log.info("Released stage id={} amount={}", stageId, saved.getAmount());
        return DisbursementStageResponse.from(saved);
    }

    public DisbursementStageResponse holdStage(UUID stageId) {
        DisbursementStage stage = findStage(stageId);
        if (stage.getStatus() == DisbursementStageStatus.DISBURSED || stage.getStatus() == DisbursementStageStatus.CANCELLED) {
            throw new BusinessException("Cannot hold stage in status: " + stage.getStatus());
        }
        stage.setStatus(DisbursementStageStatus.ON_HOLD);
        DisbursementStage saved = stageRepository.save(stage);
        log.info("Stage id={} set to ON_HOLD", stageId);
        return DisbursementStageResponse.from(saved);
    }

    public DisbursementStageResponse cancelStage(UUID stageId) {
        DisbursementStage stage = findStage(stageId);
        if (stage.getStatus() == DisbursementStageStatus.DISBURSED) {
            throw new BusinessException("Cannot cancel an already DISBURSED stage");
        }
        stage.setStatus(DisbursementStageStatus.CANCELLED);
        DisbursementStage saved = stageRepository.save(stage);
        log.info("Cancelled stage id={}", stageId);
        return DisbursementStageResponse.from(saved);
    }
}
