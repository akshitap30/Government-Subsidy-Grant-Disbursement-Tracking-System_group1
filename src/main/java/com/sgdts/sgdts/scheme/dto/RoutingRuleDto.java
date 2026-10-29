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
public class RoutingRuleDto {

    private BigDecimal minScore;
    private BigDecimal maxScore;
    private BigDecimal minGrantAmount;
    private BigDecimal maxGrantAmount;
    private List<String> stages;
}
