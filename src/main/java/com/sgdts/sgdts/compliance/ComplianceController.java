package com.sgdts.sgdts.compliance;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.compliance.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ComplianceController {

    private final ComplianceService complianceService;
    private final NonComplianceService nonComplianceService;

    @PostMapping("/compliance")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> createRequirement(
            @Valid @RequestBody CreateComplianceRequirementRequest request) {
        ComplianceRequirementResponse response = complianceService.createRequirement(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compliance requirement created successfully", response));
    }

    @GetMapping("/compliance/{id}")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> getRequirement(@PathVariable UUID id) {
        ComplianceRequirementResponse response = complianceService.getRequirement(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/applications/{applicationId}/compliance")
    public ResponseEntity<ApiResponse<List<ComplianceRequirementResponse>>> listByApplication(
            @PathVariable UUID applicationId) {
        List<ComplianceRequirementResponse> response = complianceService.listByApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/disbursement-stages/{stageId}/compliance")
    public ResponseEntity<ApiResponse<List<ComplianceRequirementResponse>>> listByStage(
            @PathVariable UUID stageId) {
        List<ComplianceRequirementResponse> response = complianceService.listByStage(stageId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/compliance/{id}/submit")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> submitCompliance(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitComplianceRequest request) {
        ComplianceRequirementResponse response = complianceService.submitCompliance(id, request);
        return ResponseEntity.ok(ApiResponse.success("Compliance submitted successfully", response));
    }

    @PostMapping("/compliance/{id}/verify")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> verifyCompliance(
            @PathVariable UUID id,
            @Valid @RequestBody VerifyComplianceRequest request) {
        ComplianceRequirementResponse response = complianceService.verifyCompliance(id, request);
        return ResponseEntity.ok(ApiResponse.success("Compliance verified successfully", response));
    }

    @PostMapping("/compliance/{id}/reject")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> rejectCompliance(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "Rejected by officer") String remarks,
            @RequestParam(required = false, defaultValue = "OFFICER") String rejectedBy) {
        ComplianceRequirementResponse response = complianceService.rejectCompliance(id, remarks, rejectedBy);
        return ResponseEntity.ok(ApiResponse.success("Compliance requirement rejected", response));
    }

    @GetMapping("/compliance/overdue")
    public ResponseEntity<ApiResponse<List<ComplianceRequirementResponse>>> listOverdue() {
        List<ComplianceRequirementResponse> response = complianceService.listOverdue();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/applications/{applicationId}/non-compliance")
    public ResponseEntity<ApiResponse<List<NonComplianceFlagResponse>>> listNonCompliance(
            @PathVariable UUID applicationId) {
        List<NonComplianceFlagResponse> response = nonComplianceService.listByApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
