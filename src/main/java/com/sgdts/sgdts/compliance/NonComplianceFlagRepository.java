package com.sgdts.sgdts.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NonComplianceFlagRepository extends JpaRepository<NonComplianceFlag, UUID> {

    List<NonComplianceFlag> findByApplicationId(UUID applicationId);

    List<NonComplianceFlag> findByRequirementId(UUID requirementId);

    boolean existsByRequirementIdAndStatus(UUID requirementId, NonComplianceFlagStatus status);

    boolean existsByRequirementId(UUID requirementId);

    List<NonComplianceFlag> findByStatus(NonComplianceFlagStatus status);
}
