package com.sgdts.sgdts.analytics;

import com.sgdts.sgdts.analytics.dto.DisbursementAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.RegionalAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.SchemeAnalyticsResponse;
import com.sgdts.sgdts.analytics.dto.UtilizationAnalyticsResponse;
import com.sgdts.sgdts.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/disbursement")
    public ResponseEntity<ApiResponse<DisbursementAnalyticsResponse>> getDisbursementAnalytics(
            @RequestParam(required = false) UUID schemeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        DisbursementAnalyticsResponse response = analyticsService.getDisbursementAnalytics(schemeId, fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/utilization")
    public ResponseEntity<ApiResponse<UtilizationAnalyticsResponse>> getUtilizationAnalytics(
            @RequestParam(required = false) UUID applicationId) {
        UtilizationAnalyticsResponse response = analyticsService.getUtilizationAnalytics(applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/regional")
    public ResponseEntity<ApiResponse<List<RegionalAnalyticsResponse>>> getRegionalAnalytics(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        List<RegionalAnalyticsResponse> response = analyticsService.getRegionalAnalytics(state, fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/schemes")
    public ResponseEntity<ApiResponse<List<SchemeAnalyticsResponse>>> getSchemeAnalytics() {
        List<SchemeAnalyticsResponse> response = analyticsService.getSchemeAnalytics();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
