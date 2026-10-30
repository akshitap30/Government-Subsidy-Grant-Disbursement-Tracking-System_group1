package com.sgdts.sgdts.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.application.dto.ApplicationResponse;
import com.sgdts.sgdts.application.dto.CreateApplicationRequest;
import com.sgdts.sgdts.application.dto.UpdateApplicationRequest;
import com.sgdts.sgdts.beneficiary.BeneficiaryService;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.scheme.Scheme;
import com.sgdts.sgdts.scheme.SchemeService;
import com.sgdts.sgdts.scheme.SchemeStatus;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private BeneficiaryService beneficiaryService;

    @Mock
    private SchemeService schemeService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ApplicationService applicationService;

    private UUID beneficiaryId;
    private UUID schemeId;
    private GrantApplication sampleDraft;
    private Scheme activeScheme;

    @BeforeEach
    void setUp() {
        beneficiaryId = UUID.randomUUID();
        schemeId = UUID.randomUUID();

        activeScheme = Scheme.builder()
                .id(schemeId)
                .name("Dairy Entrepreneurship Development Scheme")
                .status(SchemeStatus.ACTIVE)
                .minGrantAmount(new BigDecimal("20000.00"))
                .maxGrantAmount(new BigDecimal("250000.00"))
                .configVersion(3)
                .build();

        sampleDraft = GrantApplication.builder()
                .id(UUID.randomUUID())
                .referenceNumber("APP-1700000000")
                .beneficiaryId(beneficiaryId)
                .schemeId(schemeId)
                .requestedAmount(new BigDecimal("100000.00"))
                .eligibilityData("{\"cattle_count\":\"5\"}")
                .status(ApplicationStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Create draft successfully when beneficiary and scheme exist")
    void testCreateDraftSuccess() {
        when(beneficiaryService.existsById(beneficiaryId)).thenReturn(true);
        when(schemeService.findScheme(schemeId)).thenReturn(activeScheme);
        when(applicationRepository.save(any(GrantApplication.class))).thenAnswer(i -> {
            GrantApplication a = i.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });

        CreateApplicationRequest req = new CreateApplicationRequest();
        req.setBeneficiaryId(beneficiaryId);
        req.setSchemeId(schemeId);
        req.setRequestedAmount(new BigDecimal("100000.00"));
        req.setEligibilityData(Map.of("cattle_count", "5"));

        ApplicationResponse res = applicationService.createDraft(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo(ApplicationStatus.DRAFT);
        assertThat(res.getBeneficiaryId()).isEqualTo(beneficiaryId);
        assertThat(res.getSchemeId()).isEqualTo(schemeId);
        assertThat(res.getRequestedAmount()).isEqualByComparingTo("100000.00");
    }

    @Test
    @DisplayName("Create draft throws NotFoundException when beneficiary does not exist")
    void testCreateDraftMissingBeneficiary() {
        when(beneficiaryService.existsById(beneficiaryId)).thenReturn(false);

        CreateApplicationRequest req = new CreateApplicationRequest();
        req.setBeneficiaryId(beneficiaryId);
        req.setSchemeId(schemeId);
        req.setRequestedAmount(new BigDecimal("100000.00"));

        assertThatThrownBy(() -> applicationService.createDraft(req))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Beneficiary");

        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Update draft succeeds when application is in DRAFT status")
    void testUpdateDraftSuccess() {
        UUID appId = sampleDraft.getId();
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.save(any(GrantApplication.class))).thenAnswer(i -> i.getArgument(0));

        UpdateApplicationRequest req = new UpdateApplicationRequest();
        req.setRequestedAmount(new BigDecimal("120000.00"));
        req.setEligibilityData(Map.of("cattle_count", "6"));

        ApplicationResponse res = applicationService.updateDraft(appId, req);

        assertThat(res.getRequestedAmount()).isEqualByComparingTo("120000.00");
    }

    @Test
    @DisplayName("Update draft throws BusinessException if status is not DRAFT")
    void testUpdateNonDraftThrows() {
        UUID appId = sampleDraft.getId();
        sampleDraft.setStatus(ApplicationStatus.SUBMITTED);
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));

        UpdateApplicationRequest req = new UpdateApplicationRequest();
        req.setRequestedAmount(new BigDecimal("120000.00"));

        assertThatThrownBy(() -> applicationService.updateDraft(appId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only DRAFT applications can be updated");
    }

    @Test
    @DisplayName("Submit application snapshots scheme version and publishes domain event")
    void testSubmitApplicationSuccess() {
        UUID appId = sampleDraft.getId();
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeIdAndStatusIn(eq(beneficiaryId), eq(schemeId), anyList()))
                .thenReturn(false);
        when(schemeService.getSchemeForApplication(schemeId)).thenReturn(activeScheme);
        when(applicationRepository.save(any(GrantApplication.class))).thenAnswer(i -> i.getArgument(0));

        ApplicationResponse res = applicationService.submitApplication(appId);

        assertThat(res.getStatus()).isEqualTo(ApplicationStatus.SUBMITTED);
        assertThat(res.getSchemeConfigVersion()).isEqualTo(3);
        verify(eventPublisher).publishEvent(any(ApplicationSubmittedEvent.class));
    }

    @Test
    @DisplayName("Submit application throws ConflictException if active application already exists")
    void testSubmitDuplicateConflict() {
        UUID appId = sampleDraft.getId();
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeIdAndStatusIn(eq(beneficiaryId), eq(schemeId), anyList()))
                .thenReturn(true);

        assertThatThrownBy(() -> applicationService.submitApplication(appId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("An active application already exists");

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Submit application is idempotent when invoked repeatedly on an already submitted application")
    void testSubmitApplicationIdempotent() {
        UUID appId = sampleDraft.getId();
        sampleDraft.setStatus(ApplicationStatus.SUBMITTED);
        sampleDraft.setSchemeConfigVersion(3);
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));

        ApplicationResponse res = applicationService.submitApplication(appId);

        assertThat(res.getStatus()).isEqualTo(ApplicationStatus.SUBMITTED);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Submit throws BusinessException if requested amount is below scheme minimum")
    void testSubmitBelowMinGrant() {
        UUID appId = sampleDraft.getId();
        sampleDraft.setRequestedAmount(new BigDecimal("5000.00")); // min is 20000
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeIdAndStatusIn(any(), any(), any()))
                .thenReturn(false);
        when(schemeService.getSchemeForApplication(schemeId)).thenReturn(activeScheme);

        assertThatThrownBy(() -> applicationService.submitApplication(appId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Requested amount is below the scheme minimum");
    }

    @Test
    @DisplayName("Submit throws BusinessException if requested amount exceeds scheme maximum")
    void testSubmitAboveMaxGrant() {
        UUID appId = sampleDraft.getId();
        sampleDraft.setRequestedAmount(new BigDecimal("300000.00")); // max is 250000
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeIdAndStatusIn(any(), any(), any()))
                .thenReturn(false);
        when(schemeService.getSchemeForApplication(schemeId)).thenReturn(activeScheme);

        assertThatThrownBy(() -> applicationService.submitApplication(appId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Requested amount exceeds the scheme maximum");
    }

    @Test
    @DisplayName("Cancel application transitions draft or in-progress application to CANCELLED")
    void testCancelApplication() {
        UUID appId = sampleDraft.getId();
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));
        when(applicationRepository.save(any(GrantApplication.class))).thenAnswer(i -> i.getArgument(0));

        ApplicationResponse res = applicationService.cancelApplication(appId);

        assertThat(res.getStatus()).isEqualTo(ApplicationStatus.CANCELLED);
    }

    @Test
    @DisplayName("Cancel application throws BusinessException if already APPROVED")
    void testCancelTerminalApplicationThrows() {
        UUID appId = sampleDraft.getId();
        sampleDraft.setStatus(ApplicationStatus.APPROVED);
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(sampleDraft));

        assertThatThrownBy(() -> applicationService.cancelApplication(appId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot cancel application in status: APPROVED");
    }
}

