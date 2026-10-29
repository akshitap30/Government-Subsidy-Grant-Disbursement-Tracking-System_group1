package com.sgdts.sgdts.scheme;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.common.PagedResponse;
import com.sgdts.sgdts.scheme.dto.ActivateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.CreateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.SchemeResponse;
import com.sgdts.sgdts.scheme.dto.UpdateSchemeRequest;
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
@RequestMapping("/api/v1/schemes")
@RequiredArgsConstructor
public class SchemeController {

    private final SchemeService schemeService;

    @PostMapping
    public ResponseEntity<ApiResponse<SchemeResponse>> createScheme(
            @Valid @RequestBody CreateSchemeRequest request) {
        SchemeResponse response = schemeService.createScheme(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Scheme created", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SchemeResponse>> getScheme(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(schemeService.getScheme(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<SchemeResponse>>> listSchemes(
            @RequestParam(required = false) SchemeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SchemeResponse> result = schemeService.listSchemes(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SchemeResponse>> updateScheme(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSchemeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(schemeService.updateScheme(id, request)));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<SchemeResponse>> activateScheme(
            @PathVariable UUID id,
            @RequestBody(required = false) ActivateSchemeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Scheme activated", schemeService.activateScheme(id)));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<SchemeResponse>> deactivateScheme(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Scheme deactivated", schemeService.deactivateScheme(id)));
    }
}
