package com.sgdts.sgdts.disbursement;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import java.math.BigDecimal;
import java.time.Year;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
@Component
public class MockPaymentGateway implements PaymentGateway {
 private final AtomicLong requests=new AtomicLong();
 @Value("${sgdts.mock-gateway.fail-every-n:0}") private int failEveryN;
 @Override public GatewayResult process(UUID jobId, BigDecimal amount) {
  if(failEveryN>0 && requests.incrementAndGet()%failEveryN==0) return new GatewayResult(false,null,"Simulated gateway rejection; no money transferred.");
  return new GatewayResult(true, "SIM-PFMS-"+Year.now().getValue()+"-"+jobId.toString().substring(0,12).toUpperCase(), "Simulated payment processed successfully; no money transferred.");
 }
}
