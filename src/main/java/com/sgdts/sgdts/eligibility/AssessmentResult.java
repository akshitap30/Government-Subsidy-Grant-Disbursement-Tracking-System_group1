package com.sgdts.sgdts.eligibility;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Full result of an eligibility assessment for one application.
 *
 * @param outcome              ELIGIBLE, INELIGIBLE, or INCOMPLETE
 * @param totalScore           sum of weighted scores for passed criteria
 * @param maxPossibleScore     sum of all criterion weights
 * @param normalizedScore      (totalScore / maxPossibleScore) * 100, range 0–100
 * @param criterionResults     per-criterion breakdown
 * @param failedMandatory      IDs of mandatory criteria that failed (empty when ELIGIBLE)
 * @param schemeConfigVersion  version of the scheme rules used for evaluation
 * @param assessedAt           UTC instant when assessment was produced
 */
public record AssessmentResult(
        EligibilityOutcome outcome,
        BigDecimal totalScore,
        BigDecimal maxPossibleScore,
        BigDecimal normalizedScore,
        List<CriterionResult> criterionResults,
        List<String> failedMandatory,
        int schemeConfigVersion,
        Instant assessedAt
) {}
