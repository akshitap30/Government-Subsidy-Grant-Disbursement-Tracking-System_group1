package com.sgdts.sgdts.application;

import java.util.UUID;

/**
 * Domain event published when a grant application is submitted.
 */
public record ApplicationSubmittedEvent(UUID applicationId) {
}

