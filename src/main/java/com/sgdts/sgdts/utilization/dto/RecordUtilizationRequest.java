package com.sgdts.sgdts.utilization.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordUtilizationRequest {

    @NotNull(message = "Application ID is required")
    private UUID applicationId;

    private UUID disbursementStageId;

    private BigDecimal amountDisbursed;

    @NotNull(message = "Amount utilized is required")
    @PositiveOrZero(message = "Amount utilized must not be negative")
    private BigDecimal amountUtilized;

    @NotNull(message = "Utilization date is required")
    private LocalDate utilizationDate;

    private String category;

    private String description;

    private String recordedBy;
}
