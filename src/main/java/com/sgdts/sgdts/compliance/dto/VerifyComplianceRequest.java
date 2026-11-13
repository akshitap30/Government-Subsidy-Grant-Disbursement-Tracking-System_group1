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
public class VerifyComplianceRequest {

    @NotBlank(message = "VerifiedBy is required")
    private String verifiedBy;

    @Builder.Default
    private boolean approved = true;

    private String remarks;
}
