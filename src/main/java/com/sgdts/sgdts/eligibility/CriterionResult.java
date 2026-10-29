package com.sgdts.sgdts.eligibility;

import java.math.BigDecimal;

/**
 * Immutable result for a single criterion evaluation.
 *
 * @param criterionId  matches {@link com.sgdts.sgdts.scheme.EligibilityCriterion#getCriterionId()}
 * @param passed       true if the criterion was satisfied
 * @param score        points awarded (0 if failed or non-weighted)
 * @param maxScore     maximum points this criterion could award
 * @param reason       human-readable explanation, especially on failure
 */
public record CriterionResult(
        String criterionId,
        boolean passed,
        BigDecimal score,
        BigDecimal maxScore,
        String reason
) {}
