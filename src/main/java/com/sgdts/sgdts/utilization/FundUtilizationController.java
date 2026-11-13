package com.sgdts.sgdts.utilization;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.utilization.dto.FundUtilizationResponse;
import com.sgdts.sgdts.utilization.dto.RecordUtilizationRequest;
import com.sgdts.sgdts.utilization.dto.UtilizationSummaryResponse;
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
public class FundUtilizationController {

    private final FundUtilizationService utilizationService;

    @PostMapping("/utilization")
    public ResponseEntity<ApiResponse<FundUtilizationResponse>> recordUtilization(
            @Valid @RequestBody RecordUtilizationRequest request) {
        FundUtilizationResponse response = utilizationService.recordUtilization(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Fund utilization recorded successfully", response));
    }

    @GetMapping("/utilization/{id}")
    public ResponseEntity<ApiResponse<FundUtilizationResponse>> getUtilization(@PathVariable UUID id) {
        FundUtilizationResponse response = utilizationService.getUtilization(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/applications/{applicationId}/utilization")
    public ResponseEntity<ApiResponse<List<FundUtilizationResponse>>> listByApplication(
            @PathVariable UUID applicationId) {
        List<FundUtilizationResponse> response = utilizationService.listByApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/disbursement-stages/{stageId}/utilization")
    public ResponseEntity<ApiResponse<List<FundUtilizationResponse>>> listByStage(
            @PathVariable UUID stageId) {
        List<FundUtilizationResponse> response = utilizationService.listByStage(stageId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/utilization/summary")
    public ResponseEntity<ApiResponse<UtilizationSummaryResponse>> getSummary(
            @RequestParam(required = false) UUID applicationId) {
        UtilizationSummaryResponse response = utilizationService.getSummary(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
