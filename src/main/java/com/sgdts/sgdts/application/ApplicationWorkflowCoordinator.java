package com.sgdts.sgdts.application;

import com.sgdts.sgdts.eligibility.EligibilityAssessment;
import com.sgdts.sgdts.eligibility.EligibilityOutcome;
import com.sgdts.sgdts.eligibility.EligibilityService;
import com.sgdts.sgdts.verification.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Cross-module coordinator that orchestrates post-submission workflows.
 * Subscribes to {@link ApplicationSubmittedEvent} to invoke eligibility evaluation
 * and subsequent multi-level verification routing without introducing circular dependencies.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApplicationWorkflowCoordinator {

    private final EligibilityService eligibilityService;
    private final VerificationService verificationService;

    @EventListener
    public void onApplicationSubmitted(ApplicationSubmittedEvent event) {
        log.info("Processing submitted application id={}", event.applicationId());
        try {
            EligibilityAssessment assessment = eligibilityService.assessApplication(event.applicationId());
            log.info("Eligibility outcome for application id={}: {}", event.applicationId(), assessment.getOutcome());

            if (assessment.getOutcome() == EligibilityOutcome.ELIGIBLE) {
                verificationService.createWorkflow(event.applicationId());
                log.info("Verification workflow initiated for application id={}", event.applicationId());
            } else {
                log.info("Application id={} is INELIGIBLE; verification workflow not created", event.applicationId());
            }
        } catch (Exception e) {
            log.error("Error during automated post-submission workflow for application id={}: {}",
                    event.applicationId(), e.getMessage(), e);
        }
    }
}

