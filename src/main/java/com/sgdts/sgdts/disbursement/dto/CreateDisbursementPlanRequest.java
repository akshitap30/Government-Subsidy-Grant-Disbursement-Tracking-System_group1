package com.sgdts.sgdts.disbursement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDisbursementPlanRequest {

    @NotNull(message = "Application ID is required")
    private UUID applicationId;

    private String notes;

    private String createdBy;
}
