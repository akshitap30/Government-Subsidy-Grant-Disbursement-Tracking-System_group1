package com.sgdts.sgdts.verification.dto;

import com.sgdts.sgdts.verification.Decision;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RecordDecisionRequest {

    @NotNull(message = "Decision is required")
    private Decision decision;

    private String comments;

    /** Officer making the decision — must match the assigned officer in a production system. */
    private String actorId;
}
