package com.sgdts.sgdts.disbursement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisbursementPlanRepository extends JpaRepository<DisbursementPlan, UUID> {

    Optional<DisbursementPlan> findByApplicationId(UUID applicationId);

    boolean existsByApplicationIdAndPlanStatusIn(UUID applicationId, Collection<DisbursementStatus> statuses);

    List<DisbursementPlan> findByPlanStatus(DisbursementStatus status);
}
