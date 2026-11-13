package com.sgdts.sgdts.utilization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UtilizationSummaryResponse {

    private BigDecimal totalDisbursed;
    private BigDecimal totalUtilized;
    private double utilizationPercentage;
    private BigDecimal pendingUtilization;
    private long recordCount;
}
