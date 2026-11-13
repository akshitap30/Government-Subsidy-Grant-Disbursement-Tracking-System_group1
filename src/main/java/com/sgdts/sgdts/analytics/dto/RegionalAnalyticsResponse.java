package com.sgdts.sgdts.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegionalAnalyticsResponse {

    private String state;
    private String district;
    private long totalApplications;
    private BigDecimal totalSanctionedAmount;
    private BigDecimal totalDisbursedAmount;
    private BigDecimal totalUtilizedAmount;
}
