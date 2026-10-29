package com.sgdts.sgdts.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
public class CreateApplicationRequest {

    @NotNull(message = "Beneficiary ID is required")
    private UUID beneficiaryId;

    @NotNull(message = "Scheme ID is required")
    private UUID schemeId;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.01", message = "Requested amount must be positive")
    private BigDecimal requestedAmount;

    /** Free-form eligibility input data keyed by criterion ID. */
    private Map<String, String> eligibilityData;
}
