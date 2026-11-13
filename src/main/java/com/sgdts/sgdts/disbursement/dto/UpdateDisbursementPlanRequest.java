package com.sgdts.sgdts.disbursement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDisbursementPlanRequest {

    private String notes;

    private String updatedBy;
}
