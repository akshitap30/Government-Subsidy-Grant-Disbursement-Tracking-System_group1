package com.sgdts.sgdts.utilization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface FundUtilizationRepository extends JpaRepository<FundUtilization, UUID> {

    List<FundUtilization> findByApplicationId(UUID applicationId);

    List<FundUtilization> findByDisbursementStageId(UUID stageId);

    @Query("SELECT COALESCE(SUM(u.amountDisbursed), 0) FROM FundUtilization u WHERE u.applicationId = :applicationId")
    BigDecimal sumAmountDisbursedByApplicationId(@Param("applicationId") UUID applicationId);

    @Query("SELECT COALESCE(SUM(u.amountUtilized), 0) FROM FundUtilization u WHERE u.applicationId = :applicationId")
    BigDecimal sumAmountUtilizedByApplicationId(@Param("applicationId") UUID applicationId);

    @Query("SELECT COALESCE(SUM(u.amountDisbursed), 0) FROM FundUtilization u")
    BigDecimal sumTotalAmountDisbursed();

    @Query("SELECT COALESCE(SUM(u.amountUtilized), 0) FROM FundUtilization u")
    BigDecimal sumTotalAmountUtilized();

    long countByApplicationId(UUID applicationId);
}
