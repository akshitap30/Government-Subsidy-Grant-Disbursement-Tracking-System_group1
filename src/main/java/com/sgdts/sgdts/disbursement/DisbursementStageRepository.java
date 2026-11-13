package com.sgdts.sgdts.disbursement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisbursementStageRepository extends JpaRepository<DisbursementStage, UUID> {

    List<DisbursementStage> findByPlanIdOrderByStageNumberAsc(UUID planId);

    Optional<DisbursementStage> findByPlanIdAndStageNumber(UUID planId, int stageNumber);

    boolean existsByPlanIdAndStageNumber(UUID planId, int stageNumber);

    List<DisbursementStage> findByStatus(DisbursementStageStatus status);

    long countByPlanId(UUID planId);

    long countByPlanIdAndStatus(UUID planId, DisbursementStageStatus status);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM DisbursementStage s WHERE s.planId = :planId AND s.status != :excludeStatus")
    BigDecimal sumAmountByPlanIdAndStatusNot(@Param("planId") UUID planId, @Param("excludeStatus") DisbursementStageStatus excludeStatus);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM DisbursementStage s WHERE s.planId = :planId")
    BigDecimal sumAmountByPlanId(@Param("planId") UUID planId);
}
