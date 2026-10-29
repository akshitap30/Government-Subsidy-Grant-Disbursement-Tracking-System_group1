package com.sgdts.sgdts.verification;

import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.scheme.RoutingRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Determines the ordered list of verification stages for an application based
 * on the scheme's configured routing rules.
 *
 * <p>A routing rule matches when the eligibility score falls within
 * [minScore, maxScore] AND the requested amount is >= minGrantAmount and
 * (maxGrantAmount is null OR amount <= maxGrantAmount).
 *
 * <p>Rules are evaluated in the order they appear in the scheme; the first
 * matching rule is used. This allows scheme administrators to order rules
 * by priority without ambiguity.
 */
@Service
@Slf4j
public class RoutingService {

    /**
     * Returns the ordered stage names for the first matching routing rule.
     *
     * @throws BusinessException if no rule matches the given score and amount
     */
    public List<String> determineStages(List<RoutingRule> rules,
                                         BigDecimal score,
                                         BigDecimal amount) {
        if (rules == null || rules.isEmpty()) {
            throw new BusinessException("No routing rules configured for this scheme");
        }

        for (RoutingRule rule : rules) {
            boolean scoreMatches = score.compareTo(rule.getMinScore()) >= 0
                    && score.compareTo(rule.getMaxScore()) <= 0;
            boolean amountMatches = amount.compareTo(rule.getMinGrantAmount()) >= 0
                    && (rule.getMaxGrantAmount() == null
                        || amount.compareTo(rule.getMaxGrantAmount()) <= 0);

            if (scoreMatches && amountMatches) {
                if (rule.getStages() == null || rule.getStages().isEmpty()) {
                    throw new BusinessException("Matching routing rule has no stages configured");
                }
                log.debug("Matched routing rule: score={} amount={} → stages={}",
                        score, amount, rule.getStages());
                return List.copyOf(rule.getStages());
            }
        }

        throw new BusinessException(
                "No routing rule matched for score=" + score + " and amount=" + amount
                + ". Verify the scheme's routing configuration covers all expected ranges.");
    }
}
