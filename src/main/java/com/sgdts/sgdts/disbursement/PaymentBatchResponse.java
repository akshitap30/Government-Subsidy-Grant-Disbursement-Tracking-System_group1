package com.sgdts.sgdts.disbursement;
import java.math.BigDecimal; import java.time.LocalDateTime; import java.util.List; import java.util.UUID;
public record PaymentBatchResponse(UUID id,String batchReference,PaymentBatchStatus status,BigDecimal totalAmount,int paymentCount,long successfulPayments,long failedPayments,LocalDateTime createdAt,LocalDateTime processedAt,List<PaymentJobResponse> payments) { }
