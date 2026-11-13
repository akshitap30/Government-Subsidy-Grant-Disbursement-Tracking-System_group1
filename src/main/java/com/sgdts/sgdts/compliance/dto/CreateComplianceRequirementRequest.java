package com.sgdts.sgdts.compliance.dto;

import com.sgdts.sgdts.compliance.ComplianceRequirementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateComplianceRequirementRequest {

    @NotNull(message = "Application ID is required")
    private UUID applicationId;

    private UUID stageId;

    @NotNull(message = "Requirement type is required")
    private ComplianceRequirementType requirementType;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    @Builder.Default
    private Boolean mandatory = true;

    private String remarks;
}
