package com.sgdts.sgdts.compliance;

import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.compliance.dto.NonComplianceFlagResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NonComplianceService {

    private final NonComplianceFlagRepository flagRepository;

    public NonComplianceFlag createFlagForOverdue(ComplianceRequirement requirement, long daysOverdue) {
        if (flagRepository.existsByRequirementIdAndStatus(requirement.getId(), NonComplianceFlagStatus.OPEN)) {
            log.debug("Open non-compliance flag already exists for requirement id={}", requirement.getId());
            return null;
        }

        NonComplianceSeverity severity;
        if (daysOverdue < 7) {
            severity = NonComplianceSeverity.LOW;
        } else if (daysOverdue < 14) {
            severity = NonComplianceSeverity.MEDIUM;
        } else if (daysOverdue < 30) {
            severity = NonComplianceSeverity.HIGH;
        } else {
            severity = NonComplianceSeverity.CRITICAL;
        }

        NonComplianceFlag flag = NonComplianceFlag.builder()
                .applicationId(requirement.getApplicationId())
                .stageId(requirement.getStageId())
                .requirementId(requirement.getId())
                .flagType("OVERDUE_COMPLIANCE")
                .severity(severity)
                .reason("Requirement '" + requirement.getDescription() + "' is overdue by " + daysOverdue + " day(s)")
                .status(NonComplianceFlagStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        NonComplianceFlag saved = flagRepository.save(flag);
        log.warn("Created NonComplianceFlag id={} requirementId={} severity={}", saved.getId(), requirement.getId(), severity);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<NonComplianceFlagResponse> listByApplication(UUID applicationId) {
        return flagRepository.findByApplicationId(applicationId).stream()
                .map(NonComplianceFlagResponse::from)
                .toList();
    }

    public NonComplianceFlagResponse resolveFlag(UUID flagId, String resolvedBy) {
        NonComplianceFlag flag = flagRepository.findById(flagId)
                .orElseThrow(() -> new NotFoundException("NonComplianceFlag", flagId));
        flag.setStatus(NonComplianceFlagStatus.RESOLVED);
        flag.setResolvedAt(LocalDateTime.now());
        flag.setResolvedBy(resolvedBy);
        NonComplianceFlag saved = flagRepository.save(flag);
        log.info("Resolved NonComplianceFlag id={} by {}", flagId, resolvedBy);
        return NonComplianceFlagResponse.from(saved);
    }
}
