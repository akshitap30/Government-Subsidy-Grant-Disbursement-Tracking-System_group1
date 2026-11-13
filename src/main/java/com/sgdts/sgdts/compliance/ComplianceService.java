package com.sgdts.sgdts.compliance;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.compliance.dto.ComplianceRequirementResponse;
import com.sgdts.sgdts.compliance.dto.CreateComplianceRequirementRequest;
import com.sgdts.sgdts.compliance.dto.SubmitComplianceRequest;
import com.sgdts.sgdts.compliance.dto.VerifyComplianceRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ComplianceService {

    private final ComplianceRequirementRepository requirementRepository;
    private final ApplicationService applicationService;
    private final NonComplianceService nonComplianceService;
    private final Clock clock;

    private static final List<ComplianceStatus> SATISFIED_OR_TERMINAL_STATUSES = List.of(
            ComplianceStatus.VERIFIED,
            ComplianceStatus.WAIVED
    );

    public ComplianceRequirementResponse createRequirement(CreateComplianceRequirementRequest request) {
        // Validate application exists
        applicationService.findApplication(request.getApplicationId());

        ComplianceRequirement requirement = ComplianceRequirement.builder()
                .applicationId(request.getApplicationId())
                .stageId(request.getStageId())
                .requirementType(request.getRequirementType())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .mandatory(request.getMandatory() != null ? request.getMandatory() : true)
                .status(ComplianceStatus.PENDING)
                .remarks(request.getRemarks())
                .build();

        ComplianceRequirement saved = requirementRepository.save(requirement);
        log.info("Created ComplianceRequirement id={} for application={}", saved.getId(), saved.getApplicationId());
        return ComplianceRequirementResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ComplianceRequirementResponse getRequirement(UUID id) {
        return ComplianceRequirementResponse.from(findRequirement(id));
    }

    @Transactional(readOnly = true)
    public ComplianceRequirement findRequirement(UUID id) {
        return requirementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("ComplianceRequirement", id));
    }

    @Transactional(readOnly = true)
    public List<ComplianceRequirementResponse> listByApplication(UUID applicationId) {
        return requirementRepository.findByApplicationId(applicationId).stream()
                .map(ComplianceRequirementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComplianceRequirementResponse> listByStage(UUID stageId) {
        return requirementRepository.findByStageId(stageId).stream()
                .map(ComplianceRequirementResponse::from)
                .toList();
    }

    public ComplianceRequirementResponse submitCompliance(UUID id, SubmitComplianceRequest request) {
        ComplianceRequirement req = findRequirement(id);

        if (req.getStatus() == ComplianceStatus.VERIFIED || req.getStatus() == ComplianceStatus.WAIVED) {
            throw new BusinessException("Cannot submit compliance in status: " + req.getStatus());
        }

        req.setStatus(ComplianceStatus.SUBMITTED);
        req.setSubmittedAt(LocalDateTime.now(clock));
        req.setSubmittedBy(request.getSubmittedBy());
        if (request.getRemarks() != null) {
            req.setRemarks(request.getRemarks());
        }

        ComplianceRequirement saved = requirementRepository.save(req);
        log.info("Submitted ComplianceRequirement id={} by {}", saved.getId(), request.getSubmittedBy());
        return ComplianceRequirementResponse.from(saved);
    }

    public ComplianceRequirementResponse verifyCompliance(UUID id, VerifyComplianceRequest request) {
        ComplianceRequirement req = findRequirement(id);

        if (request.isApproved()) {
            req.setStatus(ComplianceStatus.VERIFIED);
        } else {
            req.setStatus(ComplianceStatus.REJECTED);
        }

        req.setVerifiedAt(LocalDateTime.now(clock));
        req.setVerifiedBy(request.getVerifiedBy());
        if (request.getRemarks() != null) {
            req.setRemarks(request.getRemarks());
        }

        ComplianceRequirement saved = requirementRepository.save(req);
        log.info("Verified ComplianceRequirement id={} decision={} by {}", saved.getId(), req.getStatus(), request.getVerifiedBy());
        return ComplianceRequirementResponse.from(saved);
    }

    public ComplianceRequirementResponse rejectCompliance(UUID id, String remarks, String rejectedBy) {
        ComplianceRequirement req = findRequirement(id);
        req.setStatus(ComplianceStatus.REJECTED);
        req.setVerifiedAt(LocalDateTime.now(clock));
        req.setVerifiedBy(rejectedBy);
        req.setRemarks(remarks);

        ComplianceRequirement saved = requirementRepository.save(req);
        log.info("Rejected ComplianceRequirement id={} by {}", saved.getId(), rejectedBy);
        return ComplianceRequirementResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ComplianceRequirementResponse> listOverdue() {
        return requirementRepository.findByStatus(ComplianceStatus.OVERDUE).stream()
                .map(ComplianceRequirementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isStageComplianceMet(UUID stageId) {
        if (stageId == null) {
            return true;
        }
        List<ComplianceRequirement> mandatoryRequirements = requirementRepository.findByStageIdAndMandatoryTrue(stageId);
        for (ComplianceRequirement req : mandatoryRequirements) {
            if (req.getStatus() != ComplianceStatus.VERIFIED && req.getStatus() != ComplianceStatus.WAIVED) {
                return false;
            }
        }
        return true;
    }

    public int checkAndProcessOverdue() {
        LocalDate today = LocalDate.now(clock);
        List<ComplianceRequirement> overdueList = requirementRepository.findByDueDateLessThanAndStatusNotIn(
                today, SATISFIED_OR_TERMINAL_STATUSES);

        int processed = 0;
        for (ComplianceRequirement req : overdueList) {
            req.setStatus(ComplianceStatus.OVERDUE);
            long daysOverdue = ChronoUnit.DAYS.between(req.getDueDate(), today);

            if (req.isMandatory()) {
                nonComplianceService.createFlagForOverdue(req, Math.max(1, daysOverdue));
            }

            requirementRepository.save(req);
            processed++;
        }

        if (processed > 0) {
            log.info("Processed {} overdue compliance requirement(s)", processed);
        }
        return processed;
    }
}
