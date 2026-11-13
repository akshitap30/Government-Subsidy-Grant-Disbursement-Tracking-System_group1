package com.sgdts.sgdts.utilization.dto;

import com.sgdts.sgdts.utilization.FundUtilization;
import com.sgdts.sgdts.utilization.UtilizationVerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FundUtilizationResponse {

    private UUID id;
    private UUID applicationId;
    private UUID disbursementStageId;
    private BigDecimal amountDisbursed;
    private BigDecimal amountUtilized;
    private double utilizationPercentage;
    private LocalDate utilizationDate;
    private String category;
    private String description;
    private UtilizationVerificationStatus verificationStatus;
    private String recordedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FundUtilizationResponse from(FundUtilization utilization) {
        if (utilization == null) {
            return null;
        }
        double percentage = 0.0;
        if (utilization.getAmountDisbursed() != null
                && utilization.getAmountDisbursed().compareTo(BigDecimal.ZERO) > 0
                && utilization.getAmountUtilized() != null) {
            percentage = utilization.getAmountUtilized()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(utilization.getAmountDisbursed(), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        return FundUtilizationResponse.builder()
                .id(utilization.getId())
                .applicationId(utilization.getApplicationId())
                .disbursementStageId(utilization.getDisbursementStageId())
                .amountDisbursed(utilization.getAmountDisbursed())
                .amountUtilized(utilization.getAmountUtilized())
                .utilizationPercentage(percentage)
                .utilizationDate(utilization.getUtilizationDate())
                .category(utilization.getCategory())
                .description(utilization.getDescription())
                .verificationStatus(utilization.getVerificationStatus())
                .recordedBy(utilization.getRecordedBy())
                .createdAt(utilization.getCreatedAt())
                .updatedAt(utilization.getUpdatedAt())
                .build();
    }
}
