package com.sgdts.sgdts.compliance.dto;

import com.sgdts.sgdts.compliance.NonComplianceFlag;
import com.sgdts.sgdts.compliance.NonComplianceFlagStatus;
import com.sgdts.sgdts.compliance.NonComplianceSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NonComplianceFlagResponse {

    private UUID id;
    private UUID applicationId;
    private UUID stageId;
    private UUID requirementId;
    private String flagType;
    private NonComplianceSeverity severity;
    private String reason;
    private NonComplianceFlagStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolvedBy;

    public static NonComplianceFlagResponse from(NonComplianceFlag flag) {
        if (flag == null) {
            return null;
        }
        return NonComplianceFlagResponse.builder()
                .id(flag.getId())
                .applicationId(flag.getApplicationId())
                .stageId(flag.getStageId())
                .requirementId(flag.getRequirementId())
                .flagType(flag.getFlagType())
                .severity(flag.getSeverity())
                .reason(flag.getReason())
                .status(flag.getStatus())
                .createdAt(flag.getCreatedAt())
                .resolvedAt(flag.getResolvedAt())
                .resolvedBy(flag.getResolvedBy())
                .build();
    }
}
