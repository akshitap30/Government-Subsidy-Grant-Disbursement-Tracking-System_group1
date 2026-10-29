package com.sgdts.sgdts.scheme.dto;

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
public class UpdateSchemeRequest {

    private String name;
    private String description;
    private BigDecimal minGrantAmount;
    private BigDecimal maxGrantAmount;
    private List<CriterionDto> criteria;
    private List<RoutingRuleDto> routingRules;
}
