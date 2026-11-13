package com.sgdts.sgdts.disbursement.dto;

import com.sgdts.sgdts.disbursement.DisbursementPlan;
import com.sgdts.sgdts.disbursement.DisbursementStage;
import com.sgdts.sgdts.disbursement.DisbursementStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementPlanResponse {

    private UUID id;
    private UUID applicationId;
    private BigDecimal totalSanctionedAmount;
    private DisbursementStatus planStatus;
    private String notes;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<DisbursementStageResponse> stages = new ArrayList<>();

    public static DisbursementPlanResponse from(DisbursementPlan plan) {
        return from(plan, List.of());
    }

    public static DisbursementPlanResponse from(DisbursementPlan plan, List<DisbursementStage> stages) {
        if (plan == null) {
            return null;
        }
        List<DisbursementStageResponse> stageResponses = stages != null
                ? stages.stream().map(DisbursementStageResponse::from).toList()
                : List.of();

        return DisbursementPlanResponse.builder()
                .id(plan.getId())
                .applicationId(plan.getApplicationId())
                .totalSanctionedAmount(plan.getTotalSanctionedAmount())
                .planStatus(plan.getPlanStatus())
                .notes(plan.getNotes())
                .createdBy(plan.getCreatedBy())
                .updatedBy(plan.getUpdatedBy())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .stages(stageResponses)
                .build();
    }
}
