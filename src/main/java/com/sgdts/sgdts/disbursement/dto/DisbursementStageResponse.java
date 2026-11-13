package com.sgdts.sgdts.disbursement.dto;

import com.sgdts.sgdts.disbursement.DisbursementStage;
import com.sgdts.sgdts.disbursement.DisbursementStageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementStageResponse {

    private UUID id;
    private UUID planId;
    private int stageNumber;
    private String stageName;
    private BigDecimal amount;
    private LocalDate scheduledDate;
    private String releaseCondition;
    private DisbursementStageStatus status;
    private LocalDateTime releasedAt;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DisbursementStageResponse from(DisbursementStage stage) {
        if (stage == null) {
            return null;
        }
        return DisbursementStageResponse.builder()
                .id(stage.getId())
                .planId(stage.getPlanId())
                .stageNumber(stage.getStageNumber())
                .stageName(stage.getStageName())
                .amount(stage.getAmount())
                .scheduledDate(stage.getScheduledDate())
                .releaseCondition(stage.getReleaseCondition())
                .status(stage.getStatus())
                .releasedAt(stage.getReleasedAt())
                .notes(stage.getNotes())
                .createdAt(stage.getCreatedAt())
                .updatedAt(stage.getUpdatedAt())
                .build();
    }
}
