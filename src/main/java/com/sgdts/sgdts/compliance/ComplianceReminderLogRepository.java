package com.sgdts.sgdts.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplianceReminderLogRepository extends JpaRepository<ComplianceReminderLog, UUID> {

    boolean existsByRequirementIdAndReminderType(UUID requirementId, String reminderType);

    List<ComplianceReminderLog> findByRequirementId(UUID requirementId);
}
