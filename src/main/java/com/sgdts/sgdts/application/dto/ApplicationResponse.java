package com.sgdts.sgdts.application.dto;

import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ApplicationResponse {

    private UUID id;
    private String referenceNumber;
    private UUID beneficiaryId;
    private UUID schemeId;
    private int schemeConfigVersion;
    private BigDecimal requestedAmount;
    private ApplicationStatus status;
    private LocalDateTime submittedAt;
    private UUID eligibilityAssessmentId;
    private String currentVerificationStage;
    private List<String> statusHistory;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ApplicationResponse from(GrantApplication app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .referenceNumber(app.getReferenceNumber())
                .beneficiaryId(app.getBeneficiaryId())
                .schemeId(app.getSchemeId())
                .schemeConfigVersion(app.getSchemeConfigVersion())
                .requestedAmount(app.getRequestedAmount())
                .status(app.getStatus())
                .submittedAt(app.getSubmittedAt())
                .eligibilityAssessmentId(app.getEligibilityAssessmentId())
                .currentVerificationStage(app.getCurrentVerificationStage())
                .statusHistory(app.getStatusHistory())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }
}
