package com.sgdts.sgdts.utilization;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.utilization.dto.FundUtilizationResponse;
import com.sgdts.sgdts.utilization.dto.RecordUtilizationRequest;
import com.sgdts.sgdts.utilization.dto.UtilizationSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FundUtilizationService {

    private final FundUtilizationRepository fundUtilizationRepository;
    private final ApplicationService applicationService;

    public FundUtilizationResponse recordUtilization(RecordUtilizationRequest request) {
        // Validate application exists
        applicationService.findApplication(request.getApplicationId());

        if (request.getAmountUtilized() == null || request.getAmountUtilized().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Amount utilized cannot be negative");
        }

        BigDecimal disbursed = request.getAmountDisbursed();
        if (disbursed == null) {
            disbursed = request.getAmountUtilized();
        }

        if (disbursed.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Amount disbursed cannot be negative");
        }

        if (request.getAmountUtilized().compareTo(disbursed) > 0) {
            throw new BusinessException("Amount utilized (" + request.getAmountUtilized()
                    + ") cannot exceed amount disbursed (" + disbursed + ")");
        }

        FundUtilization utilization = FundUtilization.builder()
                .applicationId(request.getApplicationId())
                .disbursementStageId(request.getDisbursementStageId())
                .amountDisbursed(disbursed)
                .amountUtilized(request.getAmountUtilized())
                .utilizationDate(request.getUtilizationDate() != null ? request.getUtilizationDate() : LocalDate.now())
                .category(request.getCategory())
                .description(request.getDescription())
                .recordedBy(request.getRecordedBy())
                .verificationStatus(UtilizationVerificationStatus.PENDING)
                .build();

        FundUtilization saved = fundUtilizationRepository.save(utilization);
        log.info("Recorded fund utilization id={} for application={}", saved.getId(), saved.getApplicationId());
        return FundUtilizationResponse.from(saved);
    }

    public FundUtilization recordStageDisbursement(UUID applicationId, UUID stageId, BigDecimal amountDisbursed) {
        FundUtilization utilization = FundUtilization.builder()
                .applicationId(applicationId)
                .disbursementStageId(stageId)
                .amountDisbursed(amountDisbursed)
                .amountUtilized(BigDecimal.ZERO)
                .utilizationDate(LocalDate.now())
                .category("STAGE_DISBURSEMENT")
                .description("Initial disbursement allocation for stage " + stageId)
                .verificationStatus(UtilizationVerificationStatus.PENDING)
                .recordedBy("SYSTEM")
                .build();

        return fundUtilizationRepository.save(utilization);
    }

    @Transactional(readOnly = true)
    public FundUtilizationResponse getUtilization(UUID id) {
        return FundUtilizationResponse.from(findUtilization(id));
    }

    @Transactional(readOnly = true)
    public FundUtilization findUtilization(UUID id) {
        return fundUtilizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("FundUtilization", id));
    }

    @Transactional(readOnly = true)
    public List<FundUtilizationResponse> listByApplication(UUID applicationId) {
        return fundUtilizationRepository.findByApplicationId(applicationId).stream()
                .map(FundUtilizationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FundUtilizationResponse> listByStage(UUID stageId) {
        return fundUtilizationRepository.findByDisbursementStageId(stageId).stream()
                .map(FundUtilizationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UtilizationSummaryResponse getSummary(UUID applicationId) {
        BigDecimal totalDisbursed;
        BigDecimal totalUtilized;
        long recordCount;

        if (applicationId != null) {
            totalDisbursed = fundUtilizationRepository.sumAmountDisbursedByApplicationId(applicationId);
            totalUtilized = fundUtilizationRepository.sumAmountUtilizedByApplicationId(applicationId);
            recordCount = fundUtilizationRepository.countByApplicationId(applicationId);
        } else {
            totalDisbursed = fundUtilizationRepository.sumTotalAmountDisbursed();
            totalUtilized = fundUtilizationRepository.sumTotalAmountUtilized();
            recordCount = fundUtilizationRepository.count();
        }

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

        return UtilizationSummaryResponse.builder()
                .totalDisbursed(totalDisbursed != null ? totalDisbursed : BigDecimal.ZERO)
                .totalUtilized(totalUtilized != null ? totalUtilized : BigDecimal.ZERO)
                .utilizationPercentage(percentage)
                .pendingUtilization(pending)
                .recordCount(recordCount)
                .build();
    }
}
