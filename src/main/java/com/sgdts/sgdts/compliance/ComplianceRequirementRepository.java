package com.sgdts.sgdts.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ComplianceRequirementRepository extends JpaRepository<ComplianceRequirement, UUID> {

    List<ComplianceRequirement> findByApplicationId(UUID applicationId);

    List<ComplianceRequirement> findByStageId(UUID stageId);

    List<ComplianceRequirement> findByStatus(ComplianceStatus status);

    List<ComplianceRequirement> findByStageIdAndMandatoryTrue(UUID stageId);

    List<ComplianceRequirement> findByDueDateLessThanAndStatusNotIn(LocalDate date, Collection<ComplianceStatus> statuses);

    List<ComplianceRequirement> findByDueDateAndStatusNotIn(LocalDate date, Collection<ComplianceStatus> statuses);
}
