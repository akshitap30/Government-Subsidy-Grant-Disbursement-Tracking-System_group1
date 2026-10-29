package com.sgdts.sgdts.application.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class UpdateApplicationRequest {
    private BigDecimal requestedAmount;
    private Map<String, String> eligibilityData;
}
