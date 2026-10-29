package com.sgdts.sgdts.eligibility;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EligibilityAssessmentRepository extends JpaRepository<EligibilityAssessment, UUID> {

    Optional<EligibilityAssessment> findByApplicationId(UUID applicationId);
}
