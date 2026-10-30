package com.sgdts.sgdts.verification;

import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.scheme.RoutingRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoutingServiceTest {

    private RoutingService routingService;
    private List<RoutingRule> rules;

    @BeforeEach
    void setUp() {
        routingService = new RoutingService();

        // 1. Low grant, high score: fast-track initial review only
        RoutingRule lowGrantHighScore = RoutingRule.builder()
                .minScore(new BigDecimal("80.0"))
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(new BigDecimal("1000.00"))
                .maxGrantAmount(new BigDecimal("50000.00"))
                .stages(List.of("INITIAL_REVIEW"))
                .build();

        // 2. Low grant, moderate score: initial + field verification
        RoutingRule lowGrantModerateScore = RoutingRule.builder()
                .minScore(new BigDecimal("50.0"))
                .maxScore(new BigDecimal("79.99"))
                .minGrantAmount(new BigDecimal("1000.00"))
                .maxGrantAmount(new BigDecimal("50000.00"))
                .stages(List.of("INITIAL_REVIEW", "FIELD_VERIFICATION"))
                .build();

        // 3. High grant: comprehensive multi-stage review
        RoutingRule highGrantRule = RoutingRule.builder()
                .minScore(new BigDecimal("50.0"))
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(new BigDecimal("50000.01"))
                .maxGrantAmount(new BigDecimal("1000000.00"))
                .stages(List.of("INITIAL_REVIEW", "DISTRICT_REVIEW", "SENIOR_APPROVAL", "FINANCE_REVIEW"))
                .build();

        rules = List.of(lowGrantHighScore, lowGrantModerateScore, highGrantRule);
    }

    @Test
    @DisplayName("Low grant with high score matches single stage fast-track route")
    void testLowGrantHighScoreRouting() {
        List<String> stages = routingService.determineStages(
                rules,
                new BigDecimal("90.0"),
                new BigDecimal("30000.00"));

        assertThat(stages).containsExactly("INITIAL_REVIEW");
    }

    @Test
    @DisplayName("Low grant with moderate score routes to initial and field verification")
    void testLowGrantModerateScoreRouting() {
        List<String> stages = routingService.determineStages(
                rules,
                new BigDecimal("65.0"),
                new BigDecimal("30000.00"));

        assertThat(stages).containsExactly("INITIAL_REVIEW", "FIELD_VERIFICATION");
    }

    @Test
    @DisplayName("High grant amount routes to multi-level approval stages")
    void testHighGrantRouting() {
        List<String> stages = routingService.determineStages(
                rules,
                new BigDecimal("85.0"),
                new BigDecimal("250000.00"));

        assertThat(stages).containsExactly(
                "INITIAL_REVIEW", "DISTRICT_REVIEW", "SENIOR_APPROVAL", "FINANCE_REVIEW");
    }

    @Test
    @DisplayName("determineStages throws BusinessException when rules list is null or empty")
    void testEmptyRulesThrows() {
        assertThatThrownBy(() -> routingService.determineStages(List.of(), new BigDecimal("80"), new BigDecimal("10000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No routing rules configured");

        assertThatThrownBy(() -> routingService.determineStages(null, new BigDecimal("80"), new BigDecimal("10000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No routing rules configured");
    }

    @Test
    @DisplayName("determineStages throws BusinessException when no rule matches score and amount")
    void testNoMatchingRuleThrows() {
        // Score 40 is below minimum 50 of any rule
        assertThatThrownBy(() -> routingService.determineStages(rules, new BigDecimal("40.0"), new BigDecimal("30000.00")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No routing rule matched");
    }

    @Test
    @DisplayName("determineStages throws BusinessException when matching rule has empty stages")
    void testMatchingRuleEmptyStagesThrows() {
        RoutingRule ruleWithNoStages = RoutingRule.builder()
                .minScore(BigDecimal.ZERO)
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(BigDecimal.ZERO)
                .maxGrantAmount(null)
                .stages(new ArrayList<>())
                .build();

        assertThatThrownBy(() -> routingService.determineStages(List.of(ruleWithNoStages), new BigDecimal("50"), new BigDecimal("10000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Matching routing rule has no stages configured");
    }
}

