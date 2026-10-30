package com.sgdts.sgdts.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.common.GlobalExceptionHandler;
import com.sgdts.sgdts.verification.dto.CreateWorkflowRequest;
import com.sgdts.sgdts.verification.dto.RecordDecisionRequest;
import com.sgdts.sgdts.verification.dto.TaskResponse;
import com.sgdts.sgdts.verification.dto.WorkflowResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VerificationController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class VerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private VerificationService verificationService;

    private UUID appId;
    private UUID taskId;
    private TaskResponse sampleTaskResponse;
    private WorkflowResponse sampleWorkflowResponse;

    @BeforeEach
    void setUp() {
        appId = UUID.randomUUID();
        taskId = UUID.randomUUID();

        sampleTaskResponse = TaskResponse.builder()
                .id(taskId)
                .applicationId(appId)
                .stage(VerificationStage.INITIAL_REVIEW)
                .status(TaskStatus.PENDING)
                .assignedOfficerId("OFFICER_001")
                .dueAt(LocalDateTime.now().plusDays(3))
                .createdAt(LocalDateTime.now())
                .build();

        sampleWorkflowResponse = WorkflowResponse.builder()
                .id(UUID.randomUUID())
                .applicationId(appId)
                .schemeId(UUID.randomUUID())
                .stages(List.of("INITIAL_REVIEW", "SENIOR_APPROVAL"))
                .currentStageIndex(0)
                .currentStageName("INITIAL_REVIEW")
                .status(TaskStatus.PENDING)
                .tasks(List.of(sampleTaskResponse))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/verification/workflows creates workflow with 201 CREATED")
    void testCreateWorkflow() throws Exception {
        CreateWorkflowRequest req = new CreateWorkflowRequest();
        req.setApplicationId(appId);
        req.setSchemeId(UUID.randomUUID());
        req.setEligibilityScore(new BigDecimal("80.0"));
        req.setRequestedAmount(new BigDecimal("50000.00"));

        when(verificationService.createWorkflow(appId)).thenReturn(sampleWorkflowResponse);

        mockMvc.perform(post("/api/v1/verification/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.currentStageName").value("INITIAL_REVIEW"));
    }

    @Test
    @DisplayName("GET /api/v1/applications/{id}/workflow returns workflow for application")
    void testGetWorkflow() throws Exception {
        when(verificationService.getWorkflow(appId)).thenReturn(sampleWorkflowResponse);

        mockMvc.perform(get("/api/v1/applications/{id}/workflow", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.applicationId").value(appId.toString()));
    }

    @Test
    @DisplayName("GET /api/v1/verification/tasks returns pending tasks for officer")
    void testGetPendingTasks() throws Exception {
        when(verificationService.getPendingTasks(eq("OFFICER_001"), any()))
                .thenReturn(new PageImpl<>(List.of(sampleTaskResponse)));

        mockMvc.perform(get("/api/v1/verification/tasks?officerId=OFFICER_001&page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].assignedOfficerId").value("OFFICER_001"));
    }

    @Test
    @DisplayName("POST /api/v1/verification/tasks/{taskId}/decisions records decision")
    void testRecordDecision() throws Exception {
        RecordDecisionRequest req = new RecordDecisionRequest();
        req.setDecision(Decision.APPROVE);
        req.setActorId("OFFICER_001");
        req.setComments("Verified successfully");

        sampleTaskResponse.setStatus(TaskStatus.COMPLETED);
        sampleTaskResponse.setDecision(Decision.APPROVE);
        when(verificationService.recordDecision(eq(taskId), any())).thenReturn(sampleTaskResponse);

        mockMvc.perform(post("/api/v1/verification/tasks/{taskId}/decisions", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.decision").value("APPROVE"));
    }

    @Test
    @DisplayName("POST /api/v1/verification/tasks/{taskId}/reassign reassigns task")
    void testReassignTask() throws Exception {
        sampleTaskResponse.setAssignedOfficerId("OFFICER_002");
        when(verificationService.reassignTask(taskId, "OFFICER_002")).thenReturn(sampleTaskResponse);

        mockMvc.perform(post("/api/v1/verification/tasks/{taskId}/reassign?officerId=OFFICER_002", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assignedOfficerId").value("OFFICER_002"));
    }
}

