package com.sgdts.sgdts.verification;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.common.PagedResponse;
import com.sgdts.sgdts.verification.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    // ── Workflow ─────────────────────────────────────────────────────────────

    /** Creates a verification workflow after eligibility review is complete. */
    @PostMapping("/api/v1/verification/workflows")
    public ResponseEntity<ApiResponse<WorkflowResponse>> createWorkflow(
            @Valid @RequestBody CreateWorkflowRequest request) {
        WorkflowResponse response = verificationService.createWorkflow(request.getApplicationId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Verification workflow created", response));
    }

    /** Returns the full workflow (with task history) for a given application. */
    @GetMapping("/api/v1/applications/{id}/workflow")
    public ResponseEntity<ApiResponse<WorkflowResponse>> getWorkflow(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.getWorkflow(id)));
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/verification/tasks")
    public ResponseEntity<ApiResponse<PagedResponse<TaskResponse>>> getPendingTasks(
            @RequestParam String officerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<TaskResponse> result = verificationService.getPendingTasks(officerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @PostMapping("/api/v1/verification/tasks/{taskId}/decisions")
    public ResponseEntity<ApiResponse<TaskResponse>> recordDecision(
            @PathVariable UUID taskId,
            @Valid @RequestBody RecordDecisionRequest request) {
        TaskResponse response = verificationService.recordDecision(taskId, request);
        return ResponseEntity.ok(ApiResponse.success("Decision recorded", response));
    }

    @PostMapping("/api/v1/verification/tasks/{taskId}/reassign")
    public ResponseEntity<ApiResponse<TaskResponse>> reassignTask(
            @PathVariable UUID taskId,
            @RequestParam String officerId) {
        TaskResponse response = verificationService.reassignTask(taskId, officerId);
        return ResponseEntity.ok(ApiResponse.success("Task reassigned", response));
    }
}
