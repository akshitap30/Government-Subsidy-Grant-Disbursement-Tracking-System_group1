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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock
    private VerificationWorkflowRepository workflowRepository;

    @Mock
    private VerificationTaskRepository taskRepository;

    @Mock
    private ApplicationService applicationService;

    @Mock
    private SchemeService schemeService;

    @Mock
    private EligibilityAssessmentRepository assessmentRepository;

    @Mock
    private RoutingService routingService;

    @InjectMocks
    private VerificationService verificationService;

    private UUID appId;
    private UUID schemeId;
    private UUID workflowId;
    private UUID taskId;
    private GrantApplication eligibleApp;
    private EligibilityAssessment assessment;
    private Scheme scheme;
    private VerificationWorkflow sampleWorkflow;
    private VerificationTask sampleTask;

    @BeforeEach
    void setUp() {
        appId = UUID.randomUUID();
        schemeId = UUID.randomUUID();
        workflowId = UUID.randomUUID();
        taskId = UUID.randomUUID();

        eligibleApp = GrantApplication.builder()
                .id(appId)
                .schemeId(schemeId)
                .status(ApplicationStatus.ELIGIBILITY_REVIEW)
                .requestedAmount(new BigDecimal("75000.00"))
                .build();

        assessment = EligibilityAssessment.builder()
                .applicationId(appId)
                .normalizedScore(new BigDecimal("80.00"))
                .build();

        scheme = Scheme.builder()
                .id(schemeId)
                .routingRules(new ArrayList<>())
                .build();

        sampleWorkflow = VerificationWorkflow.builder()
                .id(workflowId)
                .applicationId(appId)
                .schemeId(schemeId)
                .stages(List.of("INITIAL_REVIEW", "SENIOR_APPROVAL"))
                .currentStageIndex(0)
                .status(TaskStatus.PENDING)
                .build();

        sampleTask = VerificationTask.builder()
                .id(taskId)
                .workflowId(workflowId)
                .applicationId(appId)
                .stage(VerificationStage.INITIAL_REVIEW)
                .status(TaskStatus.PENDING)
                .assignedOfficerId("OFFICER_001")
                .dueAt(LocalDateTime.now().plusDays(3))
                .escalationHistory(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Create workflow creates ordered stages and first verification task")
    void testCreateWorkflowSuccess() {
        when(workflowRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationService.findApplication(appId)).thenReturn(eligibleApp);
        when(assessmentRepository.findByApplicationId(appId)).thenReturn(Optional.of(assessment));
        when(schemeService.findScheme(schemeId)).thenReturn(scheme);
        when(routingService.determineStages(any(), any(), any())).thenReturn(List.of("INITIAL_REVIEW", "SENIOR_APPROVAL"));

        when(workflowRepository.save(any(VerificationWorkflow.class))).thenAnswer(i -> {
            VerificationWorkflow wf = i.getArgument(0);
            wf.setId(workflowId);
            return wf;
        });
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> {
            VerificationTask t = i.getArgument(0);
            t.setId(taskId);
            return t;
        });

        WorkflowResponse res = verificationService.createWorkflow(appId);

        assertThat(res).isNotNull();
        assertThat(res.getStages()).containsExactly("INITIAL_REVIEW", "SENIOR_APPROVAL");
        assertThat(res.getTasks()).hasSize(1);
        assertThat(res.getTasks().get(0).getStage()).isEqualTo(VerificationStage.INITIAL_REVIEW);

        verify(applicationService).updateVerificationState(appId, "INITIAL_REVIEW", ApplicationStatus.UNDER_VERIFICATION);
    }

    @Test
    @DisplayName("Create workflow is idempotent if workflow already exists")
    void testCreateWorkflowIdempotent() {
        when(workflowRepository.findByApplicationId(appId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId)).thenReturn(List.of(sampleTask));

        WorkflowResponse res = verificationService.createWorkflow(appId);

        assertThat(res.getId()).isEqualTo(workflowId);
        verify(workflowRepository, never()).save(any());
    }

    @Test
    @DisplayName("Create workflow throws BusinessException if application is not in ELIGIBILITY_REVIEW")
    void testCreateWorkflowNonEligibleStatusThrows() {
        eligibleApp.setStatus(ApplicationStatus.DRAFT);
        when(workflowRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(applicationService.findApplication(appId)).thenReturn(eligibleApp);

        assertThatThrownBy(() -> verificationService.createWorkflow(appId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Workflow can only be created for applications in ELIGIBILITY_REVIEW");
    }

    @Test
    @DisplayName("Approve interim stage advances workflow and creates next stage task")
    void testApproveInterimStageAdvances() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId)).thenReturn(List.of(sampleTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));
        when(workflowRepository.save(any(VerificationWorkflow.class))).thenAnswer(i -> i.getArgument(0));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);
        req.setActorId("OFFICER_001");
        req.setComments("Initial review verified and approved");

        TaskResponse res = verificationService.recordDecision(taskId, req);

        assertThat(res.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(res.getDecision()).isEqualTo(Decision.APPROVE);

        // Workflow advanced to index 1 (SENIOR_APPROVAL)
        assertThat(sampleWorkflow.getCurrentStageIndex()).isEqualTo(1);
        verify(applicationService).updateVerificationState(appId, "SENIOR_APPROVAL", ApplicationStatus.UNDER_VERIFICATION);
    }

    @Test
    @DisplayName("Approve final stage completes workflow and transitions application to APPROVED")
    void testApproveFinalStageCompletesWorkflow() {
        sampleWorkflow.setCurrentStageIndex(1); // at last stage (SENIOR_APPROVAL)
        sampleTask.setStage(VerificationStage.SENIOR_APPROVAL);
        sampleTask.setAssignedOfficerId("OFFICER_002");

        // Previous task approved by OFFICER_001
        VerificationTask prevTask = VerificationTask.builder()
                .id(UUID.randomUUID())
                .stage(VerificationStage.INITIAL_REVIEW)
                .status(TaskStatus.COMPLETED)
                .decision(Decision.APPROVE)
                .assignedOfficerId("OFFICER_001")
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId)).thenReturn(List.of(prevTask, sampleTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));
        when(workflowRepository.save(any(VerificationWorkflow.class))).thenAnswer(i -> i.getArgument(0));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);
        req.setActorId("OFFICER_002");
        req.setComments("Senior final approval granted");

        TaskResponse res = verificationService.recordDecision(taskId, req);

        assertThat(res.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(sampleWorkflow.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(sampleWorkflow.getFinalDecision()).isEqualTo(Decision.APPROVE);

        verify(applicationService).updateVerificationState(appId, null, ApplicationStatus.APPROVED);
    }

    @Test
    @DisplayName("Separation of duties: same officer cannot approve subsequent stage in the same workflow")
    void testSeparationOfDutiesViolationThrows() {
        sampleWorkflow.setCurrentStageIndex(1);
        sampleTask.setStage(VerificationStage.SENIOR_APPROVAL);
        sampleTask.setAssignedOfficerId(null); // unassigned

        // Previous task was approved by OFFICER_001
        VerificationTask prevTask = VerificationTask.builder()
                .id(UUID.randomUUID())
                .stage(VerificationStage.INITIAL_REVIEW)
                .status(TaskStatus.COMPLETED)
                .decision(Decision.APPROVE)
                .assignedOfficerId("OFFICER_001")
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId)).thenReturn(List.of(prevTask, sampleTask));

        // OFFICER_001 attempts to approve the second stage
        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);
        req.setActorId("OFFICER_001");

        assertThatThrownBy(() -> verificationService.recordDecision(taskId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Separation of duties violation");
    }

    @Test
    @DisplayName("Unauthorized decision: actor does not match assigned officer throws BusinessException")
    void testUnauthorizedDecisionThrows() {
        sampleTask.setAssignedOfficerId("OFFICER_001");
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);
        req.setActorId("UNAUTHORIZED_OFFICER");

        assertThatThrownBy(() -> verificationService.recordDecision(taskId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unauthorized decision");
    }

    @Test
    @DisplayName("Reject decision terminates workflow and sets application to REJECTED")
    void testRejectDecision() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowId(workflowId)).thenReturn(List.of(sampleTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.REJECT);
        req.setActorId("OFFICER_001");
        req.setComments("Documentation verification failed");

        TaskResponse res = verificationService.recordDecision(taskId, req);

        assertThat(res.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(sampleWorkflow.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(sampleWorkflow.getFinalDecision()).isEqualTo(Decision.REJECT);
        verify(applicationService).updateVerificationState(appId, null, ApplicationStatus.REJECTED);
    }

    @Test
    @DisplayName("Return for correction terminates workflow and sets application to RETURNED_FOR_CORRECTION")
    void testReturnForCorrection() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.findByWorkflowId(workflowId)).thenReturn(List.of(sampleTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.RETURN_FOR_CORRECTION);
        req.setActorId("OFFICER_001");
        req.setComments("Bank account details mismatch");

        TaskResponse res = verificationService.recordDecision(taskId, req);

        assertThat(res.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(sampleWorkflow.getFinalDecision()).isEqualTo(Decision.RETURN_FOR_CORRECTION);
        verify(applicationService).updateVerificationState(appId, null, ApplicationStatus.RETURNED_FOR_CORRECTION);
    }

    @Test
    @DisplayName("Flag for review escalates task without completing it")
    void testFlagForReviewEscalatesTask() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(workflowRepository.findById(workflowId)).thenReturn(Optional.of(sampleWorkflow));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.FLAG_FOR_REVIEW);
        req.setActorId("OFFICER_001");
        req.setComments("Discrepancy in land boundary certificates");

        TaskResponse res = verificationService.recordDecision(taskId, req);

        assertThat(res.getStatus()).isEqualTo(TaskStatus.ESCALATED);
        assertThat(res.getEscalationLevel()).isEqualTo(EscalationLevel.LEVEL_1);
    }

    @Test
    @DisplayName("Record decision on already completed task throws ConflictException")
    void testRecordDecisionTerminalTaskConflict() {
        sampleTask.setStatus(TaskStatus.COMPLETED);
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);

        assertThatThrownBy(() -> verificationService.recordDecision(taskId, req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Task is already in a terminal state");
    }

    @Test
    @DisplayName("Reassign task updates assigned officer and timestamp")
    void testReassignTaskSuccess() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        TaskResponse res = verificationService.reassignTask(taskId, "OFFICER_009");

        assertThat(res.getAssignedOfficerId()).isEqualTo("OFFICER_009");
    }

    @Test
    @DisplayName("Reassign task on terminal task throws BusinessException")
    void testReassignTerminalTaskThrows() {
        sampleTask.setStatus(TaskStatus.CANCELLED);
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

        assertThatThrownBy(() -> verificationService.reassignTask(taskId, "OFFICER_009"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot reassign a task in terminal state");
    }

    @Test
    @DisplayName("Get pending tasks lists pending tasks for officer")
    void testGetPendingTasks() {
        PageRequest pageRequest = PageRequest.of(0, 10);
        when(taskRepository.findByAssignedOfficerIdAndStatus("OFFICER_001", TaskStatus.PENDING, pageRequest))
                .thenReturn(new PageImpl<>(List.of(sampleTask)));

        Page<TaskResponse> page = verificationService.getPendingTasks("OFFICER_001", pageRequest);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(taskId);
    }
}

