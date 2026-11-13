package com.sgdts.sgdts.disbursement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDisbursementStageRequest {

    private String stageName;

    private BigDecimal amount;

    private LocalDate scheduledDate;

    private String releaseCondition;

    private String notes;
}
