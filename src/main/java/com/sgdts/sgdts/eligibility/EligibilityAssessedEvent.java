package com.sgdts.sgdts.eligibility;

import java.util.UUID;

/**
 * Domain event published when an eligibility assessment completes.
 */
public record EligibilityAssessedEvent(UUID applicationId, EligibilityOutcome outcome) {
}

