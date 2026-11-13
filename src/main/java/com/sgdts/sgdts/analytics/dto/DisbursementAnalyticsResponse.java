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
public class DisbursementAnalyticsResponse {

    private long totalApplications;
    private long approvedApplications;
    private BigDecimal totalSanctionedAmount;
    private BigDecimal totalDisbursedAmount;
    private BigDecimal averageDisbursementAmount;
}
