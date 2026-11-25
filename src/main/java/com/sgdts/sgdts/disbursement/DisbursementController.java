package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.disbursement.dto.*;
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
public class DisbursementController {

    private final DisbursementService disbursementService;


    @PostMapping("/disbursement-plans")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> createPlan(
            @Valid @RequestBody CreateDisbursementPlanRequest request) {
        DisbursementPlanResponse response = disbursementService.createPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Disbursement plan created successfully", response));
    }

    @GetMapping("/disbursement-plans/{id}")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> getPlan(@PathVariable UUID id) {
        DisbursementPlanResponse response = disbursementService.getPlan(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/disbursement-plans/{id}")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> updatePlan(
            @PathVariable UUID id,
            @RequestBody UpdateDisbursementPlanRequest request) {
        DisbursementPlanResponse response = disbursementService.updatePlan(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/applications/{applicationId}/disbursement-plan")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> getPlanByApplication(
            @PathVariable UUID applicationId) {
        DisbursementPlanResponse response = disbursementService.getPlanByApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/disbursement-plans/{id}/activate")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> activatePlan(@PathVariable UUID id) {
        DisbursementPlanResponse response = disbursementService.activatePlan(id);
        return ResponseEntity.ok(ApiResponse.success("Disbursement plan activated successfully", response));
    }

    @PostMapping("/disbursement-plans/{id}/hold")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> holdPlan(@PathVariable UUID id) {
        DisbursementPlanResponse response = disbursementService.holdPlan(id);
        return ResponseEntity.ok(ApiResponse.success("Disbursement plan put on hold", response));
    }

    @PostMapping("/disbursement-plans/{id}/cancel")
    public ResponseEntity<ApiResponse<DisbursementPlanResponse>> cancelPlan(@PathVariable UUID id) {
        DisbursementPlanResponse response = disbursementService.cancelPlan(id);
        return ResponseEntity.ok(ApiResponse.success("Disbursement plan cancelled", response));
    }


    @PostMapping("/disbursement-plans/{planId}/stages")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> addStage(
            @PathVariable UUID planId,
            @Valid @RequestBody CreateDisbursementStageRequest request) {
        DisbursementStageResponse response = disbursementService.addStage(planId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Disbursement stage added successfully", response));
    }

    @GetMapping("/disbursement-plans/{planId}/stages")
    public ResponseEntity<ApiResponse<List<DisbursementStageResponse>>> getStages(@PathVariable UUID planId) {
        List<DisbursementStageResponse> stages = disbursementService.getStages(planId);
        return ResponseEntity.ok(ApiResponse.success(stages));
    }

    @GetMapping("/disbursement-stages/{stageId}")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> getStage(@PathVariable UUID stageId) {
        DisbursementStageResponse stage = disbursementService.getStage(stageId);
        return ResponseEntity.ok(ApiResponse.success(stage));
    }

    @PutMapping("/disbursement-stages/{stageId}")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> updateStage(
            @PathVariable UUID stageId,
            @RequestBody UpdateDisbursementStageRequest request) {
        DisbursementStageResponse stage = disbursementService.updateStage(stageId, request);
        return ResponseEntity.ok(ApiResponse.success(stage));
    }

    @PostMapping("/disbursement-stages/{stageId}/prepare")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> prepareStage(@PathVariable UUID stageId) {
        DisbursementStageResponse response = disbursementService.prepareStage(stageId);
        return ResponseEntity.ok(ApiResponse.success("Stage prepared successfully", response));
    }

    @PostMapping("/disbursement-stages/{stageId}/release")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> releaseStage(@PathVariable UUID stageId) {
        DisbursementStageResponse response = disbursementService.releaseStage(stageId);
        return ResponseEntity.ok(ApiResponse.success("Stage disbursed successfully", response));
    }

    @PostMapping("/disbursement-stages/{stageId}/hold")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> holdStage(@PathVariable UUID stageId) {
        DisbursementStageResponse response = disbursementService.holdStage(stageId);
        return ResponseEntity.ok(ApiResponse.success("Stage put on hold", response));
    }

    @PostMapping("/disbursement-stages/{stageId}/cancel")
    public ResponseEntity<ApiResponse<DisbursementStageResponse>> cancelStage(@PathVariable UUID stageId) {
        DisbursementStageResponse response = disbursementService.cancelStage(stageId);
        return ResponseEntity.ok(ApiResponse.success("Stage cancelled", response));
    }
}
