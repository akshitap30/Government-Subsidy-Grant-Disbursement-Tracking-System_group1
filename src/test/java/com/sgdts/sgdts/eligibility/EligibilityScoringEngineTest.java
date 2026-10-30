package com.sgdts.sgdts.eligibility;

import com.sgdts.sgdts.scheme.CriterionType;
import com.sgdts.sgdts.scheme.EligibilityCriterion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EligibilityScoringEngineTest {

    private EligibilityScoringEngine scoringEngine;

    @BeforeEach
    void setUp() {
        scoringEngine = new EligibilityScoringEngine();
    }

    @Test
    @DisplayName("Application meeting all criteria is ELIGIBLE with 100% normalized score")
    void testAllCriteriaPass() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("annual_income")
                        .type(CriterionType.NUMERIC_MAX)
                        .expectedValue("300000")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build(),
                EligibilityCriterion.builder()
                        .criterionId("land_size_acres")
                        .type(CriterionType.NUMERIC_MIN)
                        .expectedValue("2.0")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(false)
                        .build()
        );

        Map<String, String> input = Map.of(
                "annual_income", "250000",
                "land_size_acres", "3.5"
        );

        AssessmentResult result = scoringEngine.evaluate(criteria, input, 1);

        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);
        assertThat(result.totalScore()).isEqualByComparingTo("100.0");
        assertThat(result.maxPossibleScore()).isEqualByComparingTo("100.0");
        assertThat(result.normalizedScore()).isEqualByComparingTo("100.00");
        assertThat(result.failedMandatory()).isEmpty();
    }

    @Test
    @DisplayName("Mandatory condition failure marks outcome INELIGIBLE even with high score")
    void testMandatoryConditionFailure() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("annual_income")
                        .type(CriterionType.NUMERIC_MAX)
                        .expectedValue("300000")
                        .weight(new BigDecimal("20.0"))
                        .mandatory(true)
                        .build(),
                EligibilityCriterion.builder()
                        .criterionId("land_size_acres")
                        .type(CriterionType.NUMERIC_MIN)
                        .expectedValue("2.0")
                        .weight(new BigDecimal("80.0"))
                        .mandatory(false)
                        .build()
        );

        // annual_income exceeds 300,000 (fails mandatory)
        Map<String, String> input = Map.of(
                "annual_income", "450000",
                "land_size_acres", "5.0"
        );

        AssessmentResult result = scoringEngine.evaluate(criteria, input, 1);

        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
        assertThat(result.failedMandatory()).containsExactly("annual_income");
        // Score for optional passing condition is still recorded
        assertThat(result.totalScore()).isEqualByComparingTo("80.0");
        assertThat(result.normalizedScore()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("Missing mandatory input treated as failure, not skipped")
    void testMissingMandatoryInput() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("caste_certificate")
                        .type(CriterionType.REQUIRED)
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build()
        );

        AssessmentResult result = scoringEngine.evaluate(criteria, Map.of(), 1);

        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
        assertThat(result.failedMandatory()).containsExactly("caste_certificate");
        assertThat(result.totalScore()).isEqualByComparingTo("0.0");
    }

    @Test
    @DisplayName("Missing optional input is skipped without causing failure")
    void testMissingOptionalInput() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("mandatory_field")
                        .type(CriterionType.REQUIRED)
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build(),
                EligibilityCriterion.builder()
                        .criterionId("optional_bonus")
                        .type(CriterionType.REQUIRED)
                        .weight(new BigDecimal("50.0"))
                        .mandatory(false)
                        .build()
        );

        Map<String, String> input = Map.of("mandatory_field", "present");

        AssessmentResult result = scoringEngine.evaluate(criteria, input, 1);

        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);
        assertThat(result.totalScore()).isEqualByComparingTo("50.0");
        assertThat(result.normalizedScore()).isEqualByComparingTo("50.00");
    }

    @Test
    @DisplayName("Non-numeric input for NUMERIC_MIN criterion fails gracefully without crashing")
    void testInvalidNumericInput() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("farm_size")
                        .type(CriterionType.NUMERIC_MIN)
                        .expectedValue("5")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build()
        );

        Map<String, String> input = Map.of("farm_size", "not-a-number");

        AssessmentResult result = scoringEngine.evaluate(criteria, input, 1);

        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
        assertThat(result.failedMandatory()).containsExactly("farm_size");
        assertThat(result.criterionResults().get(0).passed()).isFalse();
        assertThat(result.criterionResults().get(0).reason()).contains("Non-numeric value");
    }

    @Test
    @DisplayName("NOT_EQUALS criterion succeeds when actual does not match restricted value")
    void testNotEqualsCriterion() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("tax_payer_status")
                        .type(CriterionType.NOT_EQUALS)
                        .expectedValue("INCOME_TAX_PAYER")
                        .weight(new BigDecimal("100.0"))
                        .mandatory(true)
                        .build()
        );

        Map<String, String> passingInput = Map.of("tax_payer_status", "NON_PAYER");
        AssessmentResult passResult = scoringEngine.evaluate(criteria, passingInput, 1);
        assertThat(passResult.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);

        Map<String, String> failingInput = Map.of("tax_payer_status", "INCOME_TAX_PAYER");
        AssessmentResult failResult = scoringEngine.evaluate(criteria, failingInput, 1);
        assertThat(failResult.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
    }

    @Test
    @DisplayName("ENUM_MATCH criterion validates value against accepted comma-separated set")
    void testEnumMatchCriterion() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("category")
                        .type(CriterionType.ENUM_MATCH)
                        .expectedValue("SMALL_FARMER, MARGINAL_FARMER, TENANT")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build()
        );

        AssessmentResult matchResult = scoringEngine.evaluate(criteria, Map.of("category", "MARGINAL_FARMER"), 1);
        assertThat(matchResult.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);

        AssessmentResult mismatchResult = scoringEngine.evaluate(criteria, Map.of("category", "LARGE_COMMERCIAL"), 1);
        assertThat(mismatchResult.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
    }

    @Test
    @DisplayName("BOOLEAN criterion validates true/false condition")
    void testBooleanCriterion() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("is_resident")
                        .type(CriterionType.BOOLEAN)
                        .expectedValue("true")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build()
        );

        AssessmentResult trueResult = scoringEngine.evaluate(criteria, Map.of("is_resident", "true"), 1);
        assertThat(trueResult.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);

        AssessmentResult falseResult = scoringEngine.evaluate(criteria, Map.of("is_resident", "false"), 1);
        assertThat(falseResult.outcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
    }

    @Test
    @DisplayName("Zero weight criterion contributes 0 score but enforces mandatory condition")
    void testZeroWeightCriterion() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("citizen_check")
                        .type(CriterionType.BOOLEAN)
                        .expectedValue("true")
                        .weight(BigDecimal.ZERO)
                        .mandatory(true)
                        .build(),
                EligibilityCriterion.builder()
                        .criterionId("merit_score")
                        .type(CriterionType.NUMERIC_MIN)
                        .expectedValue("50")
                        .weight(new BigDecimal("100.0"))
                        .mandatory(false)
                        .build()
        );

        Map<String, String> input = Map.of(
                "citizen_check", "true",
                "merit_score", "75"
        );

        AssessmentResult result = scoringEngine.evaluate(criteria, input, 1);
        assertThat(result.outcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);
        assertThat(result.totalScore()).isEqualByComparingTo("100.0");
        assertThat(result.normalizedScore()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("Assessment results are deterministic and reproducible")
    void testDeterministicReproducibility() {
        List<EligibilityCriterion> criteria = List.of(
                EligibilityCriterion.builder()
                        .criterionId("income")
                        .type(CriterionType.NUMERIC_MAX)
                        .expectedValue("200000")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build(),
                EligibilityCriterion.builder()
                        .criterionId("age")
                        .type(CriterionType.NUMERIC_MIN)
                        .expectedValue("18")
                        .weight(new BigDecimal("50.0"))
                        .mandatory(true)
                        .build()
        );

        Map<String, String> input = Map.of("income", "150000", "age", "25");

        AssessmentResult run1 = scoringEngine.evaluate(criteria, input, 2);
        AssessmentResult run2 = scoringEngine.evaluate(criteria, input, 2);

        assertThat(run1.outcome()).isEqualTo(run2.outcome());
        assertThat(run1.totalScore()).isEqualTo(run2.totalScore());
        assertThat(run1.normalizedScore()).isEqualTo(run2.normalizedScore());
        assertThat(run1.schemeConfigVersion()).isEqualTo(run2.schemeConfigVersion());
    }
}

