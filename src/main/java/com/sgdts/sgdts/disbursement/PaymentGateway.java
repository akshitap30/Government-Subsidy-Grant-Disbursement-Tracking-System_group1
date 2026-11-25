package com.sgdts.sgdts.disbursement;
import java.math.BigDecimal;
import java.util.UUID;
public interface PaymentGateway {
 GatewayResult process(UUID jobId, BigDecimal amount);
 record GatewayResult(boolean success, String reference, String message) { }
}
