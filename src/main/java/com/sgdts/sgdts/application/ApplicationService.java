package com.sgdts.sgdts.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final BeneficiaryService beneficiaryService;
    private final SchemeService schemeService;
    private final ObjectMapper objectMapper;

    /** Valid terminal or in-progress statuses that block a new duplicate application. */
    private static final List<ApplicationStatus> ACTIVE_STATUSES = List.of(
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.ELIGIBILITY_REVIEW,
            ApplicationStatus.UNDER_VERIFICATION
    );

    public ApplicationResponse createDraft(CreateApplicationRequest request) {
        // Verify beneficiary exists
        if (!beneficiaryService.existsById(request.getBeneficiaryId())) {
            throw new NotFoundException("Beneficiary", request.getBeneficiaryId());
        }

        // Scheme must exist (status check happens at submit, not at draft creation)
        schemeService.findScheme(request.getSchemeId());

        String refNumber = "APP-" + System.currentTimeMillis();

        GrantApplication app = GrantApplication.builder()
                .referenceNumber(refNumber)
                .beneficiaryId(request.getBeneficiaryId())
                .schemeId(request.getSchemeId())
                .requestedAmount(request.getRequestedAmount())
                .eligibilityData(serializeMap(request.getEligibilityData()))
                .status(ApplicationStatus.DRAFT)
                .build();

        app.getStatusHistory().add(ApplicationStatus.DRAFT.name() + ":" + LocalDateTime.now());
        GrantApplication saved = applicationRepository.save(app);
        log.info("Created application draft id={} ref={}", saved.getId(), saved.getReferenceNumber());
        return ApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplication(UUID id) {
        return ApplicationResponse.from(findApplication(id));
    }

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> listApplications(UUID beneficiaryId, UUID schemeId,
                                                       ApplicationStatus status, Pageable pageable) {
        if (beneficiaryId != null) {
            return applicationRepository.findByBeneficiaryId(beneficiaryId, pageable)
                    .map(ApplicationResponse::from);
        }
        if (schemeId != null) {
            return applicationRepository.findBySchemeId(schemeId, pageable)
                    .map(ApplicationResponse::from);
        }
        if (status != null) {
            return applicationRepository.findByStatus(status, pageable)
                    .map(ApplicationResponse::from);
        }
        return applicationRepository.findAll(pageable).map(ApplicationResponse::from);
    }

    public ApplicationResponse updateDraft(UUID id, UpdateApplicationRequest request) {
        GrantApplication app = findApplication(id);
        if (app.getStatus() != ApplicationStatus.DRAFT) {
            throw new BusinessException("Only DRAFT applications can be updated. Current status: " + app.getStatus());
        }
        if (request.getRequestedAmount() != null) {
            app.setRequestedAmount(request.getRequestedAmount());
        }
        if (request.getEligibilityData() != null) {
            app.setEligibilityData(serializeMap(request.getEligibilityData()));
        }
        return ApplicationResponse.from(applicationRepository.save(app));
    }

    public ApplicationResponse submitApplication(UUID id) {
        GrantApplication app = findApplication(id);
        if (app.getStatus() != ApplicationStatus.DRAFT) {
            throw new BusinessException("Only DRAFT applications can be submitted. Current status: " + app.getStatus());
        }

        // Idempotency guard: block duplicate active applications
        if (applicationRepository.existsByBeneficiaryIdAndSchemeIdAndStatusIn(
                app.getBeneficiaryId(), app.getSchemeId(), ACTIVE_STATUSES)) {
            throw new ConflictException(
                    "An active application already exists for this beneficiary and scheme");
        }

        // Scheme must be ACTIVE at submission time
        Scheme scheme = schemeService.getSchemeForApplication(app.getSchemeId());

        // Validate requested amount within scheme limits
        if (app.getRequestedAmount().compareTo(scheme.getMinGrantAmount()) < 0) {
            throw new BusinessException("Requested amount is below the scheme minimum of " + scheme.getMinGrantAmount());
        }
        if (app.getRequestedAmount().compareTo(scheme.getMaxGrantAmount()) > 0) {
            throw new BusinessException("Requested amount exceeds the scheme maximum of " + scheme.getMaxGrantAmount());
        }

        // Snapshot the scheme config version
        app.setSchemeConfigVersion(scheme.getConfigVersion());
        app.setSubmittedAt(LocalDateTime.now());
        app.recordStatusChange(ApplicationStatus.SUBMITTED);

        GrantApplication saved = applicationRepository.save(app);
        log.info("Submitted application id={} ref={}", saved.getId(), saved.getReferenceNumber());
        return ApplicationResponse.from(saved);
    }

    public ApplicationResponse cancelApplication(UUID id) {
        GrantApplication app = findApplication(id);
        if (app.getStatus() == ApplicationStatus.APPROVED
                || app.getStatus() == ApplicationStatus.REJECTED
                || app.getStatus() == ApplicationStatus.CANCELLED) {
            throw new BusinessException("Cannot cancel application in status: " + app.getStatus());
        }
        app.recordStatusChange(ApplicationStatus.CANCELLED);
        return ApplicationResponse.from(applicationRepository.save(app));
    }

    /** Used by EligibilityService to update status and link assessment. */
    public void updateAfterEligibilityAssessment(UUID id, UUID assessmentId, ApplicationStatus newStatus) {
        GrantApplication app = findApplication(id);
        app.setEligibilityAssessmentId(assessmentId);
        app.recordStatusChange(newStatus);
        applicationRepository.save(app);
    }

    /** Used by VerificationService to update status and current stage. */
    public void updateVerificationState(UUID id, String stage, ApplicationStatus newStatus) {
        GrantApplication app = findApplication(id);
        app.setCurrentVerificationStage(stage);
        app.recordStatusChange(newStatus);
        applicationRepository.save(app);
    }

    @Transactional(readOnly = true)
    public GrantApplication findApplication(UUID id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Application", id));
    }

    private String serializeMap(Map<String, String> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to serialize eligibility data: " + e.getMessage());
        }
    }

    public Map<String, String> deserializeEligibilityData(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to deserialize eligibility data: " + e.getMessage());
        }
    }
}
