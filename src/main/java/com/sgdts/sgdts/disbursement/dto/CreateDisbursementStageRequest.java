package com.sgdts.sgdts.disbursement.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateDisbursementStageRequest {

    @Min(value = 1, message = "Stage number must be at least 1")
    private int stageNumber;

    @NotBlank(message = "Stage name is required")
    private String stageName;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    private LocalDate scheduledDate;

    private String releaseCondition;

    private String notes;
}
