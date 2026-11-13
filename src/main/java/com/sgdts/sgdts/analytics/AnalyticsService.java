package com.sgdts.sgdts.analytics;

import com.sgdts.sgdts.analytics.dto.DisbursementAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.RegionalAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.SchemeAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.UtilizationAnalyticsResponse;
import com.sgdts.sgdts.application.ApplicationStatus;
import com.sgdts.sgdts.disbursement.DisbursementStageStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    @PersistenceContext
    private final EntityManager entityManager;

    public DisbursementAnalyticsResponse getDisbursementAnalytics(UUID schemeId, LocalDate fromDate, LocalDate toDate) {
        LocalDateTime startDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime endDateTime = toDate != null ? toDate.atTime(LocalTime.MAX) : null;

        // Total applications
        StringBuilder totalAppJpql = new StringBuilder("SELECT COUNT(a) FROM GrantApplication a WHERE 1=1");
        if (schemeId != null) totalAppJpql.append(" AND a.schemeId = :schemeId");
        if (startDateTime != null) totalAppJpql.append(" AND a.createdAt >= :startDateTime");
        if (endDateTime != null) totalAppJpql.append(" AND a.createdAt <= :endDateTime");

        Query totalAppQ = entityManager.createQuery(totalAppJpql.toString());
        if (schemeId != null) totalAppQ.setParameter("schemeId", schemeId);
        if (startDateTime != null) totalAppQ.setParameter("startDateTime", startDateTime);
        if (endDateTime != null) totalAppQ.setParameter("endDateTime", endDateTime);
        long totalApplications = ((Number) totalAppQ.getSingleResult()).longValue();

        // Approved applications
        StringBuilder approvedAppJpql = new StringBuilder("SELECT COUNT(a) FROM GrantApplication a WHERE a.status = :status");
        if (schemeId != null) approvedAppJpql.append(" AND a.schemeId = :schemeId");
        if (startDateTime != null) approvedAppJpql.append(" AND a.createdAt >= :startDateTime");
        if (endDateTime != null) approvedAppJpql.append(" AND a.createdAt <= :endDateTime");

        Query approvedAppQ = entityManager.createQuery(approvedAppJpql.toString());
        approvedAppQ.setParameter("status", ApplicationStatus.APPROVED);
        if (schemeId != null) approvedAppQ.setParameter("schemeId", schemeId);
        if (startDateTime != null) approvedAppQ.setParameter("startDateTime", startDateTime);
        if (endDateTime != null) approvedAppQ.setParameter("endDateTime", endDateTime);
        long approvedApplications = ((Number) approvedAppQ.getSingleResult()).longValue();

        // Total Sanctioned Amount for approved applications
        StringBuilder sanctionedJpql = new StringBuilder(
                "SELECT COALESCE(SUM(a.requestedAmount), 0) FROM GrantApplication a WHERE a.status = :status");
        if (schemeId != null) sanctionedJpql.append(" AND a.schemeId = :schemeId");
        if (startDateTime != null) sanctionedJpql.append(" AND a.createdAt >= :startDateTime");
        if (endDateTime != null) sanctionedJpql.append(" AND a.createdAt <= :endDateTime");

        Query sanctionedQ = entityManager.createQuery(sanctionedJpql.toString());
        sanctionedQ.setParameter("status", ApplicationStatus.APPROVED);
        if (schemeId != null) sanctionedQ.setParameter("schemeId", schemeId);
        if (startDateTime != null) sanctionedQ.setParameter("startDateTime", startDateTime);
        if (endDateTime != null) sanctionedQ.setParameter("endDateTime", endDateTime);
        BigDecimal totalSanctionedAmount = (BigDecimal) sanctionedQ.getSingleResult();

        // Total Disbursed Amount
        StringBuilder disbursedJpql = new StringBuilder(
                "SELECT COALESCE(SUM(s.amount), 0), COUNT(s) FROM DisbursementStage s, DisbursementPlan p, GrantApplication a " +
                        "WHERE s.planId = p.id AND p.applicationId = a.id AND s.status = :disbursedStatus");
        if (schemeId != null) disbursedJpql.append(" AND a.schemeId = :schemeId");
        if (startDateTime != null) disbursedJpql.append(" AND s.releasedAt >= :startDateTime");
        if (endDateTime != null) disbursedJpql.append(" AND s.releasedAt <= :endDateTime");

        Query disbursedQ = entityManager.createQuery(disbursedJpql.toString());
        disbursedQ.setParameter("disbursedStatus", DisbursementStageStatus.DISBURSED);
        if (schemeId != null) disbursedQ.setParameter("schemeId", schemeId);
        if (startDateTime != null) disbursedQ.setParameter("startDateTime", startDateTime);
        if (endDateTime != null) disbursedQ.setParameter("endDateTime", endDateTime);

        Object[] disbursedResult = (Object[]) disbursedQ.getSingleResult();
        BigDecimal totalDisbursedAmount = (BigDecimal) disbursedResult[0];
        long disbursedStageCount = ((Number) disbursedResult[1]).longValue();

        BigDecimal averageDisbursementAmount = BigDecimal.ZERO;
        if (disbursedStageCount > 0 && totalDisbursedAmount.compareTo(BigDecimal.ZERO) > 0) {
            averageDisbursementAmount = totalDisbursedAmount.divide(BigDecimal.valueOf(disbursedStageCount), 2, RoundingMode.HALF_UP);
        }

        return DisbursementAnalyticsResponse.builder()
                .totalApplications(totalApplications)
                .approvedApplications(approvedApplications)
                .totalSanctionedAmount(totalSanctionedAmount)
                .totalDisbursedAmount(totalDisbursedAmount)
                .averageDisbursementAmount(averageDisbursementAmount)
                .build();
    }

    public UtilizationAnalyticsResponse getUtilizationAnalytics(UUID applicationId) {
        StringBuilder jpql = new StringBuilder(
                "SELECT COALESCE(SUM(u.amountDisbursed), 0), COALESCE(SUM(u.amountUtilized), 0) FROM FundUtilization u WHERE 1=1");
        if (applicationId != null) {
            jpql.append(" AND u.applicationId = :applicationId");
        }

        Query query = entityManager.createQuery(jpql.toString());
        if (applicationId != null) {
            query.setParameter("applicationId", applicationId);
        }

        Object[] result = (Object[]) query.getSingleResult();
        BigDecimal totalDisbursed = (BigDecimal) result[0];
        BigDecimal totalUtilized = (BigDecimal) result[1];

        double percentage = 0.0;
        if (totalDisbursed != null && totalDisbursed.compareTo(BigDecimal.ZERO) > 0 && totalUtilized != null) {
            percentage = totalUtilized.multiply(BigDecimal.valueOf(100))
                    .divide(totalDisbursed, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        BigDecimal pending = BigDecimal.ZERO;
        if (totalDisbursed != null && totalUtilized != null) {
            pending = totalDisbursed.subtract(totalUtilized).max(BigDecimal.ZERO);
        }

        return UtilizationAnalyticsResponse.builder()
                .totalDisbursed(totalDisbursed != null ? totalDisbursed : BigDecimal.ZERO)
                .totalUtilized(totalUtilized != null ? totalUtilized : BigDecimal.ZERO)
                .utilizationPercentage(percentage)
                .pendingUtilization(pending)
                .build();
    }

    @SuppressWarnings("unchecked")
    public List<RegionalAnalyticsResponse> getRegionalAnalytics(String state, LocalDate fromDate, LocalDate toDate) {
        LocalDateTime startDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime endDateTime = toDate != null ? toDate.atTime(LocalTime.MAX) : null;

        // Group applications by beneficiary state and district
        StringBuilder appJpql = new StringBuilder(
                "SELECT b.state, b.district, COUNT(DISTINCT a.id), " +
                        "COALESCE(SUM(CASE WHEN a.status = :approvedStatus THEN a.requestedAmount ELSE 0 END), 0) " +
                        "FROM Beneficiary b LEFT JOIN GrantApplication a ON a.beneficiaryId = b.id WHERE 1=1");

        if (state != null && !state.isBlank()) appJpql.append(" AND b.state = :state");
        if (startDateTime != null) appJpql.append(" AND (a IS NULL OR a.createdAt >= :startDateTime)");
        if (endDateTime != null) appJpql.append(" AND (a IS NULL OR a.createdAt <= :endDateTime)");
        appJpql.append(" GROUP BY b.state, b.district ORDER BY b.state, b.district");

        Query appQ = entityManager.createQuery(appJpql.toString());
        appQ.setParameter("approvedStatus", ApplicationStatus.APPROVED);
        if (state != null && !state.isBlank()) appQ.setParameter("state", state);
        if (startDateTime != null) appQ.setParameter("startDateTime", startDateTime);
        if (endDateTime != null) appQ.setParameter("endDateTime", endDateTime);

        List<Object[]> appRows = appQ.getResultList();

        // Query utilization amounts grouped by beneficiary state and district
        StringBuilder utilJpql = new StringBuilder(
                "SELECT b.state, b.district, COALESCE(SUM(u.amountDisbursed), 0), COALESCE(SUM(u.amountUtilized), 0) " +
                        "FROM Beneficiary b, GrantApplication a, FundUtilization u " +
                        "WHERE a.beneficiaryId = b.id AND u.applicationId = a.id");
        if (state != null && !state.isBlank()) utilJpql.append(" AND b.state = :state");
        utilJpql.append(" GROUP BY b.state, b.district");

        Query utilQ = entityManager.createQuery(utilJpql.toString());
        if (state != null && !state.isBlank()) utilQ.setParameter("state", state);
        List<Object[]> utilRows = utilQ.getResultList();

        Map<String, BigDecimal[]> utilMap = new HashMap<>();
        for (Object[] row : utilRows) {
            String key = row[0] + "##" + row[1];
            utilMap.put(key, new BigDecimal[]{(BigDecimal) row[2], (BigDecimal) row[3]});
        }

        List<RegionalAnalyticsResponse> results = new ArrayList<>();
        for (Object[] row : appRows) {
            String rowState = (String) row[0];
            String rowDistrict = (String) row[1];
            long totalApps = ((Number) row[2]).longValue();
            BigDecimal totalSanctioned = (BigDecimal) row[3];

            String key = rowState + "##" + rowDistrict;
            BigDecimal[] utilData = utilMap.getOrDefault(key, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});

            results.add(RegionalAnalyticsResponse.builder()
                    .state(rowState)
                    .district(rowDistrict)
                    .totalApplications(totalApps)
                    .totalSanctionedAmount(totalSanctioned)
                    .totalDisbursedAmount(utilData[0])
                    .totalUtilizedAmount(utilData[1])
                    .build());
        }

        return results;
    }

    @SuppressWarnings("unchecked")
    public List<SchemeAnalyticsResponse> getSchemeAnalytics() {
        // Query applications grouped by Scheme
        String schemeAppJpql =
                "SELECT s.id, s.name, COUNT(DISTINCT a.id), " +
                        "COUNT(DISTINCT CASE WHEN a.status = :approvedStatus THEN a.id ELSE NULL END), " +
                        "COALESCE(SUM(CASE WHEN a.status = :approvedStatus THEN a.requestedAmount ELSE 0 END), 0) " +
                        "FROM Scheme s LEFT JOIN GrantApplication a ON a.schemeId = s.id " +
                        "GROUP BY s.id, s.name ORDER BY s.name";

        Query schemeQ = entityManager.createQuery(schemeAppJpql);
        schemeQ.setParameter("approvedStatus", ApplicationStatus.APPROVED);
        List<Object[]> schemeRows = schemeQ.getResultList();

        // Query utilization amounts grouped by Scheme
        String utilJpql =
                "SELECT s.id, COALESCE(SUM(u.amountDisbursed), 0), COALESCE(SUM(u.amountUtilized), 0) " +
                        "FROM Scheme s, GrantApplication a, FundUtilization u " +
                        "WHERE a.schemeId = s.id AND u.applicationId = a.id " +
                        "GROUP BY s.id";

        Query utilQ = entityManager.createQuery(utilJpql);
        List<Object[]> utilRows = utilQ.getResultList();

        Map<UUID, BigDecimal[]> utilMap = new HashMap<>();
        for (Object[] row : utilRows) {
            UUID sid = (UUID) row[0];
            utilMap.put(sid, new BigDecimal[]{(BigDecimal) row[1], (BigDecimal) row[2]});
        }

        List<SchemeAnalyticsResponse> results = new ArrayList<>();
        for (Object[] row : schemeRows) {
            UUID schemeId = (UUID) row[0];
            String schemeName = (String) row[1];
            long totalApps = ((Number) row[2]).longValue();
            long approvedApps = ((Number) row[3]).longValue();
            BigDecimal totalSanctioned = (BigDecimal) row[4];

            BigDecimal[] utilData = utilMap.getOrDefault(schemeId, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});

            results.add(SchemeAnalyticsResponse.builder()
                    .schemeId(schemeId)
                    .schemeName(schemeName)
                    .totalApplications(totalApps)
                    .approvedApplications(approvedApps)
                    .totalSanctionedAmount(totalSanctioned)
                    .totalDisbursedAmount(utilData[0])
                    .totalUtilizedAmount(utilData[1])
                    .build());
        }

        return results;
    }
}
