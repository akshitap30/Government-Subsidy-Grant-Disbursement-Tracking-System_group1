package com.sgdts.sgdts.disbursement;
import java.math.BigDecimal; import java.time.LocalDateTime; import java.util.UUID;
public record PaymentJobResponse(UUID id,UUID stageId,UUID applicationId,UUID beneficiaryId,BigDecimal amount,PaymentJobStatus status,int attemptCount,String transactionReference,String gatewayMessage,LocalDateTime createdAt,LocalDateTime processedAt) { }
