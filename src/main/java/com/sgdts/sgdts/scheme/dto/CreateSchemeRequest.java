package com.sgdts.sgdts.scheme.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSchemeRequest {

    @NotBlank(message = "Scheme name is required")
    private String name;

    private String description;

    @NotNull(message = "Minimum grant amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Minimum grant amount must be positive")
    private BigDecimal minGrantAmount;

    @NotNull(message = "Maximum grant amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum grant amount must be positive")
    private BigDecimal maxGrantAmount;

    private List<CriterionDto> criteria;

    private List<RoutingRuleDto> routingRules;
}
