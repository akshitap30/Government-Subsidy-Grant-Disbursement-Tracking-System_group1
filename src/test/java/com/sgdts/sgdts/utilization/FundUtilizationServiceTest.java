package com.sgdts.sgdts.utilization;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.utilization.dto.FundUtilizationResponse;
import com.sgdts.sgdts.utilization.dto.RecordUtilizationRequest;
import com.sgdts.sgdts.utilization.dto.UtilizationSummaryResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FundUtilizationServiceTest {

    @Mock
    private FundUtilizationRepository utilizationRepository;

    @Mock
    private ApplicationService applicationService;

    @InjectMocks
    private FundUtilizationService utilizationService;

    private UUID applicationId;
    private UUID stageId;

    @BeforeEach
    void setUp() {
        applicationId = UUID.randomUUID();
        stageId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Record utilization succeeds and computes utilization percentage correctly")
    void testRecordUtilization_Success() {
        when(applicationService.findApplication(applicationId)).thenReturn(new GrantApplication());
        when(utilizationRepository.save(any(FundUtilization.class))).thenAnswer(i -> {
            FundUtilization u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RecordUtilizationRequest req = RecordUtilizationRequest.builder()
                .applicationId(applicationId)
                .disbursementStageId(stageId)
                .amountDisbursed(new BigDecimal("50000.00"))
                .amountUtilized(new BigDecimal("25000.00"))
                .utilizationDate(LocalDate.now())
                .category("EQUIPMENT")
                .description("Purchase of drone sprayer")
                .recordedBy("OFFICER_01")
                .build();

        FundUtilizationResponse resp = utilizationService.recordUtilization(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getAmountDisbursed()).isEqualByComparingTo("50000.00");
        assertThat(resp.getAmountUtilized()).isEqualByComparingTo("25000.00");
        assertThat(resp.getUtilizationPercentage()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("Record utilization throws BusinessException when amount utilized is negative")
    void testRecordUtilization_NegativeAmountUtilized() {
        when(applicationService.findApplication(applicationId)).thenReturn(new GrantApplication());

        RecordUtilizationRequest req = RecordUtilizationRequest.builder()
                .applicationId(applicationId)
                .amountDisbursed(new BigDecimal("50000.00"))
                .amountUtilized(new BigDecimal("-100.00"))
                .build();

        assertThatThrownBy(() -> utilizationService.recordUtilization(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot be negative");
    }

    @Test
    @DisplayName("Record utilization throws BusinessException when amount utilized exceeds amount disbursed")
    void testRecordUtilization_AmountExceedsDisbursed() {
        when(applicationService.findApplication(applicationId)).thenReturn(new GrantApplication());

        RecordUtilizationRequest req = RecordUtilizationRequest.builder()
                .applicationId(applicationId)
                .amountDisbursed(new BigDecimal("50000.00"))
                .amountUtilized(new BigDecimal("60000.00"))
                .build();

        assertThatThrownBy(() -> utilizationService.recordUtilization(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot exceed amount disbursed");
    }

    @Test
    @DisplayName("Record stage disbursement creates zero-utilized initial record")
    void testRecordStageDisbursement_Success() {
        when(utilizationRepository.save(any(FundUtilization.class))).thenAnswer(i -> {
            FundUtilization u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        FundUtilization u = utilizationService.recordStageDisbursement(applicationId, stageId, new BigDecimal("40000.00"));

        assertThat(u).isNotNull();
        assertThat(u.getAmountDisbursed()).isEqualByComparingTo("40000.00");
        assertThat(u.getAmountUtilized()).isEqualByComparingTo("0");
        assertThat(u.getCategory()).isEqualTo("STAGE_DISBURSEMENT");
    }

    @Test
    @DisplayName("Get summary aggregates disbursed, utilized, and pending amounts")
    void testGetSummary() {
        when(utilizationRepository.sumTotalAmountDisbursed()).thenReturn(new BigDecimal("100000.00"));
        when(utilizationRepository.sumTotalAmountUtilized()).thenReturn(new BigDecimal("75000.00"));
        when(utilizationRepository.count()).thenReturn(5L);

        UtilizationSummaryResponse summary = utilizationService.getSummary(null);

        assertThat(summary.getTotalDisbursed()).isEqualByComparingTo("100000.00");
        assertThat(summary.getTotalUtilized()).isEqualByComparingTo("75000.00");
        assertThat(summary.getPendingUtilization()).isEqualByComparingTo("25000.00");
        assertThat(summary.getUtilizationPercentage()).isEqualTo(75.0);
        assertThat(summary.getRecordCount()).isEqualTo(5L);
    }
}
