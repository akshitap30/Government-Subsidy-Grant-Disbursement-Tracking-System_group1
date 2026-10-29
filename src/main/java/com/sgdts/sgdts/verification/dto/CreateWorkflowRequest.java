package com.sgdts.sgdts.verification.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateWorkflowRequest {

    @NotNull
    private UUID applicationId;

    @NotNull
    private UUID schemeId;

    @NotNull
    private BigDecimal eligibilityScore;

    @NotNull
    private BigDecimal requestedAmount;
}
