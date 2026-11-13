package com.sgdts.sgdts.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchemeAnalyticsResponse {

    private UUID schemeId;
    private String schemeName;
    private long totalApplications;
    private long approvedApplications;
    private BigDecimal totalSanctionedAmount;
    private BigDecimal totalDisbursedAmount;
    private BigDecimal totalUtilizedAmount;
}
