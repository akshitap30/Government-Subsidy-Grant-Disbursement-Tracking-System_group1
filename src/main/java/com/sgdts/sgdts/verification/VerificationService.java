package com.sgdts.sgdts.verification;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.eligibility.EligibilityAssessment;
import com.sgdts.sgdts.eligibility.EligibilityAssessmentRepository;
import com.sgdts.sgdts.scheme.Scheme;
import com.sgdts.sgdts.scheme.SchemeService;
import com.sgdts.sgdts.verification.dto.RecordDecisionRequest;
import com.sgdts.sgdts.verification.dto.TaskResponse;
import com.sgdts.sgdts.verification.dto.WorkflowResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VerificationService {

    /** Default task SLA: 3 working days (72 hours). */
    private static final long TASK_DUE_HOURS = 72L;

    private final VerificationWorkflowRepository workflowRepository;
    private final VerificationTaskRepository taskRepository;
    private final ApplicationService applicationService;
    private final SchemeService schemeService;
    private final EligibilityAssessmentRepository assessmentRepository;
    private final RoutingService routingService;

    /**
     * Creates a verification workflow for an application that has passed
     * eligibility review. Idempotent: if a workflow already exists for the
     * application, the existing one is returned.
     */
    public WorkflowResponse createWorkflow(UUID applicationId) {
        return workflowRepository.findByApplicationId(applicationId)
                .map(this::buildResponse)
                .orElseGet(() -> doCreateWorkflow(applicationId));
    }

    private WorkflowResponse doCreateWorkflow(UUID applicationId) {
        GrantApplication app = applicationService.findApplication(applicationId);

        if (app.getStatus() != ApplicationStatus.ELIGIBILITY_REVIEW) {
            throw new BusinessException(
                    "Workflow can only be created for applications in ELIGIBILITY_REVIEW status. Current: "
                    + app.getStatus());
        }

        EligibilityAssessment assessment = assessmentRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new BusinessException(
                        "No eligibility assessment found for application: " + applicationId));

        Scheme scheme = schemeService.findScheme(app.getSchemeId());

        List<String> stages = routingService.determineStages(
                scheme.getRoutingRules(),
                assessment.getNormalizedScore(),
                app.getRequestedAmount());

        VerificationWorkflow workflow = VerificationWorkflow.builder()
                .applicationId(applicationId)
                .schemeId(app.getSchemeId())
                .stages(stages)
                .currentStageIndex(0)
                .status(TaskStatus.PENDING)
                .build();
        VerificationWorkflow savedWf = workflowRepository.save(workflow);

        // Create first task
        VerificationTask firstTask = createTask(savedWf, stages.get(0));

        // Update application status
        applicationService.updateVerificationState(applicationId, stages.get(0),
                ApplicationStatus.UNDER_VERIFICATION);

        log.info("Created verification workflow id={} for appId={} stages={}",
                savedWf.getId(), applicationId, stages);
        return WorkflowResponse.from(savedWf, List.of(firstTask));
    }

    @Transactional(readOnly = true)
    public WorkflowResponse getWorkflow(UUID applicationId) {
        VerificationWorkflow wf = workflowRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new NotFoundException(
                        "No verification workflow found for application: " + applicationId));
        return buildResponse(wf);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getPendingTasks(String officerId, Pageable pageable) {
        return taskRepository.findByAssignedOfficerIdAndStatus(officerId, TaskStatus.PENDING, pageable)
                .map(TaskResponse::from);
    }

    /**
     * Records a verification decision on a task.
     * Enforces valid task transitions, authorized officer checks, and separation-of-duties policy.
     */
    public TaskResponse recordDecision(UUID taskId, RecordDecisionRequest request) {
        VerificationTask task = findTask(taskId);

        if (task.isTerminal()) {
            throw new ConflictException("Task is already in a terminal state: " + task.getStatus());
        }

        if (task.getStatus() == TaskStatus.ESCALATED && request.getDecision() != Decision.APPROVE
                && request.getDecision() != Decision.REJECT) {
            throw new BusinessException("Escalated tasks can only be APPROVED or REJECTED");
        }

        VerificationWorkflow workflow = workflowRepository.findById(task.getWorkflowId())
                .orElseThrow(() -> new NotFoundException("Workflow", task.getWorkflowId()));

        String actor = request.getActorId() != null ? request.getActorId().trim() : null;

        // Verify authorization against assigned officer if assigned
        if (actor != null && !actor.isBlank()) {
            if (task.getAssignedOfficerId() != null && !task.getAssignedOfficerId().equalsIgnoreCase(actor)) {
                throw new BusinessException("Unauthorized decision: actor " + actor
                        + " does not match assigned officer " + task.getAssignedOfficerId());
            }

            // Enforce separation of duties: cannot approve a subsequent stage if actor already approved an earlier stage
            if (request.getDecision() == Decision.APPROVE) {
                List<VerificationTask> allTasks = taskRepository.findByWorkflowIdOrderByCreatedAtAsc(workflow.getId());
                boolean alreadyApprovedEarlier = allTasks.stream()
                        .filter(t -> !t.getId().equals(taskId))
                        .filter(t -> t.getDecision() == Decision.APPROVE)
                        .anyMatch(t -> actor.equalsIgnoreCase(t.getAssignedOfficerId()));

                if (alreadyApprovedEarlier) {
                    throw new BusinessException("Separation of duties violation: officer " + actor
                            + " already approved an earlier stage for this application");
                }
            }

            if (task.getAssignedOfficerId() == null) {
                task.setAssignedOfficerId(actor);
                task.setAssignedAt(LocalDateTime.now());
            }
        }

        task.setDecision(request.getDecision());
        task.setComments(request.getComments());

        if (request.getDecision() == Decision.FLAG_FOR_REVIEW) {
            task.setStatus(TaskStatus.ESCALATED);
            if (task.getEscalationLevel() == EscalationLevel.NONE) {
                task.setEscalationLevel(EscalationLevel.LEVEL_1);
            }
            task.getEscalationHistory().add("FLAG_FOR_REVIEW:" + LocalDateTime.now() + ":Flagged for review by " + actor);
            taskRepository.save(task);
            return TaskResponse.from(task);
        }

        task.setCompletedAt(LocalDateTime.now());
        task.setStatus(TaskStatus.COMPLETED);
        taskRepository.save(task);

        switch (request.getDecision()) {
            case APPROVE -> handleApprove(workflow, task);
            case REJECT -> handleReject(workflow);
            case RETURN_FOR_CORRECTION -> handleReturn(workflow);
            default -> {}
        }

        return TaskResponse.from(task);
    }

    public TaskResponse reassignTask(UUID taskId, String newOfficerId) {
        VerificationTask task = findTask(taskId);
        if (task.isTerminal()) {
            throw new BusinessException("Cannot reassign a task in terminal state: " + task.getStatus());
        }
        task.setAssignedOfficerId(newOfficerId != null ? newOfficerId.trim() : null);
        task.setAssignedAt(LocalDateTime.now());
        return TaskResponse.from(taskRepository.save(task));
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void handleApprove(VerificationWorkflow workflow, VerificationTask task) {
        if (workflow.hasNextStage()) {
            workflow.advanceStage();
            workflowRepository.save(workflow);
            String nextStage = workflow.currentStageName();
            createTask(workflow, nextStage);
            applicationService.updateVerificationState(
                    workflow.getApplicationId(), nextStage, ApplicationStatus.UNDER_VERIFICATION);
            log.info("Workflow {} advanced to stage {}", workflow.getId(), nextStage);
        } else {
            // All stages approved — final approval
            workflow.setStatus(TaskStatus.COMPLETED);
            workflow.setFinalDecision(Decision.APPROVE);
            workflow.setCompletedAt(LocalDateTime.now());
            workflowRepository.save(workflow);
            applicationService.updateVerificationState(
                    workflow.getApplicationId(), null, ApplicationStatus.APPROVED);
            log.info("Workflow {} completed with APPROVED", workflow.getId());
        }
    }

    private void handleReject(VerificationWorkflow workflow) {
        cancelPendingTasks(workflow.getId());
        workflow.setStatus(TaskStatus.COMPLETED);
        workflow.setFinalDecision(Decision.REJECT);
        workflow.setCompletedAt(LocalDateTime.now());
        workflowRepository.save(workflow);
        applicationService.updateVerificationState(
                workflow.getApplicationId(), null, ApplicationStatus.REJECTED);
        log.info("Workflow {} completed with REJECTED", workflow.getId());
    }

    private void handleReturn(VerificationWorkflow workflow) {
        cancelPendingTasks(workflow.getId());
        workflow.setStatus(TaskStatus.COMPLETED);
        workflow.setFinalDecision(Decision.RETURN_FOR_CORRECTION);
        workflow.setCompletedAt(LocalDateTime.now());
        workflowRepository.save(workflow);
        applicationService.updateVerificationState(
                workflow.getApplicationId(), null, ApplicationStatus.RETURNED_FOR_CORRECTION);
        log.info("Workflow {} returned for correction", workflow.getId());
    }

    private void cancelPendingTasks(UUID workflowId) {
        List<VerificationTask> tasks = taskRepository.findByWorkflowId(workflowId);
        for (VerificationTask t : tasks) {
            if (!t.isTerminal()) {
                t.setStatus(TaskStatus.CANCELLED);
                taskRepository.save(t);
            }
        }
    }

    private VerificationTask createTask(VerificationWorkflow workflow, String stageName) {
        VerificationStage stage;
        try {
            stage = VerificationStage.valueOf(stageName);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Unknown verification stage: " + stageName
                    + ". Valid stages: " + List.of(VerificationStage.values()));
        }

        VerificationTask task = VerificationTask.builder()
                .workflowId(workflow.getId())
                .applicationId(workflow.getApplicationId())
                .stage(stage)
                .status(TaskStatus.PENDING)
                .escalationLevel(EscalationLevel.NONE)
                .dueAt(LocalDateTime.now().plusHours(TASK_DUE_HOURS))
                .build();
        return taskRepository.save(task);
    }

    private VerificationTask findTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("VerificationTask", taskId));
    }

    private WorkflowResponse buildResponse(VerificationWorkflow wf) {
        List<VerificationTask> tasks = taskRepository.findByWorkflowIdOrderByCreatedAtAsc(wf.getId());
        return WorkflowResponse.from(wf, tasks);
    }
}
