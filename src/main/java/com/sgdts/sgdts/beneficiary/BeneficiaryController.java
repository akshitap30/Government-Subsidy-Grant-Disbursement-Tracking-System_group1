package com.sgdts.sgdts.beneficiary;

import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.beneficiary.dto.UpdateBeneficiaryRequest;
import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.common.PagedResponse;
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
@RequestMapping("/api/v1/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> register(
            @Valid @RequestBody RegisterBeneficiaryRequest request) {
        BeneficiaryResponse response = beneficiaryService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Beneficiary registered successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> getById(@PathVariable UUID id) {
        BeneficiaryResponse response = beneficiaryService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<BeneficiaryResponse>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<BeneficiaryResponse> result = beneficiaryService.listAll(pageable);
        PagedResponse<BeneficiaryResponse> pagedResponse = PagedResponse.of(
                result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
        return ResponseEntity.ok(ApiResponse.success(pagedResponse));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBeneficiaryRequest request) {
        BeneficiaryResponse response = beneficiaryService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success("Beneficiary updated successfully", response));
    }
}
