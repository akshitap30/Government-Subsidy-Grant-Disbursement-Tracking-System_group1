package com.sgdts.sgdts.eligibility;

import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.scheme.CriterionType;
import com.sgdts.sgdts.scheme.EligibilityCriterion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Deterministic weighted-score eligibility engine.
 *
 * <p>Evaluation contract:
 * <ol>
 *   <li>All mandatory criteria are checked; any single failure marks the outcome INELIGIBLE
 *       regardless of the weighted score.</li>
 *   <li>Missing input for a mandatory criterion is treated as a failure, not a skip.</li>
 *   <li>Non-mandatory criteria contribute their weight to the total only when passed.</li>
 *   <li>The normalised score is always 0–100. When maxPossibleScore is 0, the score is 0.</li>
 *   <li>Results are deterministic: same input + same criteria → same output.</li>
 * </ol>
 *
 * <p>NOTE: Default weights are for local demonstration only. Official policy weights
 * must be loaded from an approved scheme configuration before production use.
 */
@Service
@Slf4j
public class EligibilityScoringEngine {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final int SCALE = 4;

    /**
     * Evaluates the given criteria against the provided applicant input.
     *
     * @param criteria            ordered list of scheme eligibility criteria
     * @param input               key-value map of applicant-provided answers (criterionId → value)
     * @param schemeConfigVersion the scheme config version snapshot to record in the result
     * @return deterministic {@link AssessmentResult}
     */
    public AssessmentResult evaluate(List<EligibilityCriterion> criteria,
                                     Map<String, String> input,
                                     int schemeConfigVersion) {
        if (criteria == null || criteria.isEmpty()) {
            // No criteria = eligible with zero score
            return new AssessmentResult(
                    EligibilityOutcome.ELIGIBLE,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    List.of(), List.of(), schemeConfigVersion, Instant.now());
        }

        List<CriterionResult> results = new ArrayList<>();
        List<String> failedMandatory = new ArrayList<>();
        BigDecimal totalScore = BigDecimal.ZERO;
        BigDecimal maxPossibleScore = BigDecimal.ZERO;

        for (EligibilityCriterion criterion : criteria) {
            maxPossibleScore = maxPossibleScore.add(criterion.getWeight());
            String rawValue = input != null ? input.get(criterion.getCriterionId()) : null;

            CriterionResult result = evaluateCriterion(criterion, rawValue);
            results.add(result);

            if (result.passed()) {
                totalScore = totalScore.add(result.score());
            } else if (criterion.isMandatory()) {
                failedMandatory.add(criterion.getCriterionId());
            }
        }

        EligibilityOutcome outcome = failedMandatory.isEmpty()
                ? EligibilityOutcome.ELIGIBLE
                : EligibilityOutcome.INELIGIBLE;

        BigDecimal normalizedScore = computeNormalizedScore(totalScore, maxPossibleScore);

        log.debug("Assessment: outcome={} score={}/{} normalized={}",
                outcome, totalScore, maxPossibleScore, normalizedScore);

        return new AssessmentResult(
                outcome, totalScore, maxPossibleScore, normalizedScore,
                results, failedMandatory, schemeConfigVersion, Instant.now());
    }

    private CriterionResult evaluateCriterion(EligibilityCriterion criterion, String rawValue) {
        String id = criterion.getCriterionId();
        BigDecimal weight = criterion.getWeight();
        CriterionType type = criterion.getType();
        String expected = criterion.getExpectedValue();

        // Missing input
        if (rawValue == null || rawValue.isBlank()) {
            if (criterion.isMandatory()) {
                return new CriterionResult(id, false, BigDecimal.ZERO, weight,
                        "Required value missing for criterion: " + id);
            }
            // Optional criterion with no input — skip (no score awarded, not a failure)
            return new CriterionResult(id, false, BigDecimal.ZERO, weight,
                    "Optional criterion skipped — no value provided");
        }

        return switch (type) {
            case NUMERIC_MIN -> {
                BigDecimal actual = parseBigDecimal(id, rawValue);
                BigDecimal threshold = parseBigDecimal(id + ".expected", expected);
                boolean passed = actual.compareTo(threshold) >= 0;
                yield new CriterionResult(id, passed, passed ? weight : BigDecimal.ZERO, weight,
                        passed ? "Value " + actual + " >= minimum " + threshold
                               : "Value " + actual + " is below minimum " + threshold);
            }
            case NUMERIC_MAX -> {
                BigDecimal actual = parseBigDecimal(id, rawValue);
                BigDecimal threshold = parseBigDecimal(id + ".expected", expected);
                boolean passed = actual.compareTo(threshold) <= 0;
                yield new CriterionResult(id, passed, passed ? weight : BigDecimal.ZERO, weight,
                        passed ? "Value " + actual + " <= maximum " + threshold
                               : "Value " + actual + " exceeds maximum " + threshold);
            }
            case EQUALS -> {
                boolean passed = rawValue.equalsIgnoreCase(expected);
                yield new CriterionResult(id, passed, passed ? weight : BigDecimal.ZERO, weight,
                        passed ? "Value matches expected: " + expected
                               : "Expected '" + expected + "' but got '" + rawValue + "'");
            }
            case BOOLEAN -> {
                boolean actualBool = Boolean.parseBoolean(rawValue);
                boolean expectedBool = Boolean.parseBoolean(expected);
                boolean passed = actualBool == expectedBool;
                yield new CriterionResult(id, passed, passed ? weight : BigDecimal.ZERO, weight,
                        passed ? "Boolean condition met"
                               : "Expected " + expectedBool + " but got " + actualBool);
            }
            case ENUM_MATCH -> {
                // expected is a comma-separated list of accepted values
                boolean passed = List.of(expected.split(","))
                        .stream()
                        .map(String::trim)
                        .anyMatch(v -> v.equalsIgnoreCase(rawValue.trim()));
                yield new CriterionResult(id, passed, passed ? weight : BigDecimal.ZERO, weight,
                        passed ? "Value '" + rawValue + "' is in accepted set"
                               : "Value '" + rawValue + "' not in accepted set: " + expected);
            }
            case REQUIRED -> {
                // Simply checks value is non-blank (already confirmed above)
                yield new CriterionResult(id, true, weight, weight, "Required field is present");
            }
        };
    }

    private BigDecimal parseBigDecimal(String field, String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            throw new BusinessException("Non-numeric value for field '" + field + "': " + value);
        }
    }

    private BigDecimal computeNormalizedScore(BigDecimal total, BigDecimal max) {
        if (max.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return total.divide(max, SCALE, RoundingMode.HALF_UP)
                .multiply(HUNDRED)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
