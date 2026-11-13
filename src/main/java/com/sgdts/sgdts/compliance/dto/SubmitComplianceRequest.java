package com.sgdts.sgdts.compliance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitComplianceRequest {

    @NotBlank(message = "SubmittedBy is required")
    private String submittedBy;

    private String remarks;
}
