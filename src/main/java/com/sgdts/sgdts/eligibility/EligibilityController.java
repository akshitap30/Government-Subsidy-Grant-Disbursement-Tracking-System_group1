package com.sgdts.sgdts.eligibility;

import com.sgdts.sgdts.common.ApiResponse;
import com.sgdts.sgdts.eligibility.dto.EligibilityAssessmentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class EligibilityController {

    private final EligibilityService eligibilityService;

    @PostMapping("/{id}/eligibility-assessment")
    public ResponseEntity<ApiResponse<EligibilityAssessmentResponse>> assess(@PathVariable UUID id) {
        EligibilityAssessment assessment = eligibilityService.assessApplication(id);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Eligibility assessment complete",
                        EligibilityAssessmentResponse.from(assessment)));
    }

    @GetMapping("/{id}/eligibility-assessment")
    public ResponseEntity<ApiResponse<EligibilityAssessmentResponse>> getAssessment(@PathVariable UUID id) {
        EligibilityAssessment assessment = eligibilityService.getAssessment(id);
        return ResponseEntity.ok(ApiResponse.success(EligibilityAssessmentResponse.from(assessment)));
    }
}
