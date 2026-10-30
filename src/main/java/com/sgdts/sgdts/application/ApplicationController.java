package com.sgdts.sgdts.application;

import com.sgdts.sgdts.application.dto.ApplicationResponse;
import com.sgdts.sgdts.application.dto.CreateApplicationRequest;
import com.sgdts.sgdts.application.dto.UpdateApplicationRequest;
import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.common.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApiResponse<ApplicationResponse>> createDraft(
            @Valid @RequestBody CreateApplicationRequest request) {
        ApplicationResponse response = applicationService.createDraft(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application draft created", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> getApplication(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.getApplication(id)));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ApplicationResponse>> getApplicationStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.getApplicationStatus(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ApplicationResponse>>> listApplications(
            @RequestParam(required = false) UUID beneficiaryId,
            @RequestParam(required = false) UUID schemeId,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ApplicationResponse> result = applicationService.listApplications(
                beneficiaryId, schemeId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> updateDraft(
            @PathVariable UUID id,
            @RequestBody UpdateApplicationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.updateDraft(id, request)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ApplicationResponse>> submitApplication(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Application submitted", applicationService.submitApplication(id)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ApplicationResponse>> cancelApplication(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Application cancelled", applicationService.cancelApplication(id)));
    }
}
