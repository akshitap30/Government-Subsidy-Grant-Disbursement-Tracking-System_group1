package com.sgdts.sgdts.eligibility;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.scheme.Scheme;
import com.sgdts.sgdts.scheme.SchemeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EligibilityServiceTest {

    @Mock
    private EligibilityAssessmentRepository assessmentRepository;

    @Mock
    private ApplicationService applicationService;

    @Mock
    private SchemeService schemeService;

    @Mock
    private EligibilityScoringEngine scoringEngine;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private EligibilityService eligibilityService;

    private UUID appId;
    private UUID schemeId;
    private GrantApplication submittedApp;
    private Scheme scheme;

    @BeforeEach
    void setUp() {
        appId = UUID.randomUUID();
        schemeId = UUID.randomUUID();

        submittedApp = GrantApplication.builder()
                .id(appId)
                .schemeId(schemeId)
                .status(ApplicationStatus.SUBMITTED)
                .schemeConfigVersion(1)
                .eligibilityData("{\"annual_income\":\"200000\"}")
                .statusHistory(new ArrayList<>())
                .build();

        scheme = Scheme.builder()
                .id(schemeId)
                .criteria(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Assess application succeeds for SUBMITTED application and transitions to ELIGIBILITY_REVIEW when ELIGIBLE")
    void testAssessEligibleSuccess() {
        when(applicationService.findApplication(appId)).thenReturn(submittedApp);
        when(assessmentRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(schemeService.findScheme(schemeId)).thenReturn(scheme);
        when(applicationService.deserializeEligibilityData(any())).thenReturn(Map.of("annual_income", "200000"));

        AssessmentResult result = new AssessmentResult(
                EligibilityOutcome.ELIGIBLE,
                new BigDecimal("80.0"), new BigDecimal("100.0"), new BigDecimal("80.00"),
                List.of(), List.of(), 1, Instant.now());
        when(scoringEngine.evaluate(any(), any(), eq(1))).thenReturn(result);

        when(assessmentRepository.save(any(EligibilityAssessment.class))).thenAnswer(i -> {
            EligibilityAssessment a = i.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });

        EligibilityAssessment assessment = eligibilityService.assessApplication(appId);

        assertThat(assessment).isNotNull();
        assertThat(assessment.getOutcome()).isEqualTo(EligibilityOutcome.ELIGIBLE);
        assertThat(assessment.getNormalizedScore()).isEqualByComparingTo("80.00");

        verify(applicationService).updateAfterEligibilityAssessment(eq(appId), any(UUID.class), eq(ApplicationStatus.ELIGIBILITY_REVIEW));
        verify(eventPublisher).publishEvent(any(EligibilityAssessedEvent.class));
    }

    @Test
    @DisplayName("Assess application transitions to INELIGIBLE when assessment outcome is INELIGIBLE")
    void testAssessIneligibleSuccess() {
        when(applicationService.findApplication(appId)).thenReturn(submittedApp);
        when(assessmentRepository.findByApplicationId(appId)).thenReturn(Optional.empty());
        when(schemeService.findScheme(schemeId)).thenReturn(scheme);
        when(applicationService.deserializeEligibilityData(any())).thenReturn(Map.of("annual_income", "800000"));

        AssessmentResult result = new AssessmentResult(
                EligibilityOutcome.INELIGIBLE,
                BigDecimal.ZERO, new BigDecimal("100.0"), BigDecimal.ZERO,
                List.of(), List.of("annual_income"), 1, Instant.now());
        when(scoringEngine.evaluate(any(), any(), eq(1))).thenReturn(result);

        when(assessmentRepository.save(any(EligibilityAssessment.class))).thenAnswer(i -> {
            EligibilityAssessment a = i.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });

        EligibilityAssessment assessment = eligibilityService.assessApplication(appId);

        assertThat(assessment.getOutcome()).isEqualTo(EligibilityOutcome.INELIGIBLE);
        verify(applicationService).updateAfterEligibilityAssessment(eq(appId), any(UUID.class), eq(ApplicationStatus.INELIGIBLE));
    }

    @Test
    @DisplayName("Assess application throws BusinessException if status is not SUBMITTED")
    void testAssessNonSubmittedThrows() {
        submittedApp.setStatus(ApplicationStatus.DRAFT);
        when(applicationService.findApplication(appId)).thenReturn(submittedApp);

        assertThatThrownBy(() -> eligibilityService.assessApplication(appId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Eligibility assessment can only be performed on SUBMITTED applications");
    }

    @Test
    @DisplayName("Assess application throws ConflictException if assessment already exists")
    void testAssessDuplicateThrows() {
        when(applicationService.findApplication(appId)).thenReturn(submittedApp);
        when(assessmentRepository.findByApplicationId(appId))
                .thenReturn(Optional.of(EligibilityAssessment.builder().id(UUID.randomUUID()).build()));

        assertThatThrownBy(() -> eligibilityService.assessApplication(appId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("An eligibility assessment already exists");
    }

    @Test
    @DisplayName("Get assessment returns record when found")
    void testGetAssessmentFound() {
        EligibilityAssessment a = EligibilityAssessment.builder()
                .id(UUID.randomUUID())
                .applicationId(appId)
                .outcome(EligibilityOutcome.ELIGIBLE)
                .assessedAt(LocalDateTime.now())
                .build();
        when(assessmentRepository.findByApplicationId(appId)).thenReturn(Optional.of(a));

        EligibilityAssessment found = eligibilityService.getAssessment(appId);
        assertThat(found.getApplicationId()).isEqualTo(appId);
    }

    @Test
    @DisplayName("Get assessment throws NotFoundException when not found")
    void testGetAssessmentNotFound() {
        when(assessmentRepository.findByApplicationId(appId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eligibilityService.getAssessment(appId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("No eligibility assessment found");
    }
}

