package com.sgdts.sgdts.eligibility;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.scheme.Scheme;
import com.sgdts.sgdts.scheme.SchemeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EligibilityService {

    private final EligibilityAssessmentRepository assessmentRepository;
    private final ApplicationService applicationService;
    private final SchemeService schemeService;
    private final EligibilityScoringEngine scoringEngine;
    private final ObjectMapper objectMapper;

    /**
     * Runs the eligibility scoring engine against the submitted application.
     * Only SUBMITTED applications may be assessed; re-assessment is blocked to preserve
     * the immutable audit record.
     */
    public EligibilityAssessment assessApplication(UUID applicationId) {
        GrantApplication app = applicationService.findApplication(applicationId);

        if (app.getStatus() != ApplicationStatus.SUBMITTED) {
            throw new BusinessException(
                    "Eligibility assessment can only be performed on SUBMITTED applications. Current status: "
                    + app.getStatus());
        }

        // Idempotency: prevent re-assessment
        if (assessmentRepository.findByApplicationId(applicationId).isPresent()) {
            throw new ConflictException("An eligibility assessment already exists for application: " + applicationId);
        }

        Scheme scheme = schemeService.findScheme(app.getSchemeId());
        Map<String, String> input = applicationService.deserializeEligibilityData(app.getEligibilityData());

        // Run deterministic scoring
        AssessmentResult result = scoringEngine.evaluate(
                scheme.getCriteria(), input, app.getSchemeConfigVersion());

        EligibilityAssessment assessment = EligibilityAssessment.builder()
                .applicationId(applicationId)
                .schemeId(app.getSchemeId())
                .schemeConfigVersion(app.getSchemeConfigVersion())
                .outcome(result.outcome())
                .totalScore(result.totalScore())
                .maxPossibleScore(result.maxPossibleScore())
                .normalizedScore(result.normalizedScore())
                .assessmentDetails(serializeResult(result))
                .assessedAt(LocalDateTime.now())
                .build();

        EligibilityAssessment saved = assessmentRepository.save(assessment);

        // Update application: link assessment and transition status
        ApplicationStatus newAppStatus = result.outcome() == EligibilityOutcome.ELIGIBLE
                ? ApplicationStatus.ELIGIBILITY_REVIEW
                : ApplicationStatus.INELIGIBLE;

        applicationService.updateAfterEligibilityAssessment(applicationId, saved.getId(), newAppStatus);

        log.info("Assessment complete: appId={} outcome={} score={}/{}",
                applicationId, result.outcome(), result.totalScore(), result.maxPossibleScore());
        return saved;
    }

    @Transactional(readOnly = true)
    public EligibilityAssessment getAssessment(UUID applicationId) {
        return assessmentRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new NotFoundException(
                        "No eligibility assessment found for application: " + applicationId));
    }

    private String serializeResult(AssessmentResult result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize assessment details", e);
            return "{}";
        }
    }
}
