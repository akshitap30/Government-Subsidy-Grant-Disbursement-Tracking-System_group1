package com.sgdts.sgdts.compliance.dto;

import com.sgdts.sgdts.compliance.ComplianceRequirement;
import com.sgdts.sgdts.compliance.ComplianceRequirementType;
import com.sgdts.sgdts.compliance.ComplianceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceRequirementResponse {

    private UUID id;
    private UUID applicationId;
    private UUID stageId;
    private ComplianceRequirementType requirementType;
    private String description;
    private LocalDate dueDate;
    private ComplianceStatus status;
    private boolean mandatory;
    private LocalDateTime submittedAt;
    private LocalDateTime verifiedAt;
    private String remarks;
    private String submittedBy;
    private String verifiedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ComplianceRequirementResponse from(ComplianceRequirement requirement) {
        if (requirement == null) {
            return null;
        }
        return ComplianceRequirementResponse.builder()
                .id(requirement.getId())
                .applicationId(requirement.getApplicationId())
                .stageId(requirement.getStageId())
                .requirementType(requirement.getRequirementType())
                .description(requirement.getDescription())
                .dueDate(requirement.getDueDate())
                .status(requirement.getStatus())
                .mandatory(requirement.isMandatory())
                .submittedAt(requirement.getSubmittedAt())
                .verifiedAt(requirement.getVerifiedAt())
                .remarks(requirement.getRemarks())
                .submittedBy(requirement.getSubmittedBy())
                .verifiedBy(requirement.getVerifiedBy())
                .createdAt(requirement.getCreatedAt())
                .updatedAt(requirement.getUpdatedAt())
                .build();
    }
}
