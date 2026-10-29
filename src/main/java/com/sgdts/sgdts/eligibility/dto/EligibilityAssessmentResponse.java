package com.sgdts.sgdts.eligibility.dto;

import com.sgdts.sgdts.eligibility.EligibilityAssessment;
import com.sgdts.sgdts.eligibility.EligibilityOutcome;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class EligibilityAssessmentResponse {

    private UUID id;
    private UUID applicationId;
    private UUID schemeId;
    private int schemeConfigVersion;
    private EligibilityOutcome outcome;
    private BigDecimal totalScore;
    private BigDecimal maxPossibleScore;
    private BigDecimal normalizedScore;
    private String assessmentDetails;
    private LocalDateTime assessedAt;
    private LocalDateTime createdAt;

    public static EligibilityAssessmentResponse from(EligibilityAssessment a) {
        return EligibilityAssessmentResponse.builder()
                .id(a.getId())
                .applicationId(a.getApplicationId())
                .schemeId(a.getSchemeId())
                .schemeConfigVersion(a.getSchemeConfigVersion())
                .outcome(a.getOutcome())
                .totalScore(a.getTotalScore())
                .maxPossibleScore(a.getMaxPossibleScore())
                .normalizedScore(a.getNormalizedScore())
                .assessmentDetails(a.getAssessmentDetails())
                .assessedAt(a.getAssessedAt())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
