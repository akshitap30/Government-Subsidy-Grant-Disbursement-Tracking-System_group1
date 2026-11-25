package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.beneficiary.BeneficiaryService;
import com.sgdts.sgdts.compliance.ComplianceService;
import com.sgdts.sgdts.utilization.FundUtilizationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentBatchServiceTest {
 @Mock PaymentBatchRepository batches;
 @Mock PaymentJobRepository jobs;
 @Mock DisbursementStageRepository stages;
 @Mock DisbursementPlanRepository plans;
 @Mock ApplicationService applications;
 @Mock BeneficiaryService beneficiaries;
 @Mock ComplianceService compliance;
 @Mock FundUtilizationService utilization;
 @Mock PaymentGateway gateway;
 @InjectMocks PaymentBatchService service;

 @Test void successfulMockPaymentDisbursesStageAndCreatesUtilization(){
  UUID batchId=UUID.randomUUID(), jobId=UUID.randomUUID(), stageId=UUID.randomUUID(), planId=UUID.randomUUID();
  UUID appId=UUID.randomUUID(), beneficiaryId=UUID.randomUUID();
  PaymentBatch batch=PaymentBatch.builder().id(batchId).batchReference("SIM-BATCH-1").status(PaymentBatchStatus.VALIDATED).totalAmount(new BigDecimal("25000.00")).build();
  PaymentJob job=PaymentJob.builder().id(jobId).batchId(batchId).stageId(stageId).applicationId(appId).beneficiaryId(beneficiaryId).amount(new BigDecimal("25000.00")).status(PaymentJobStatus.QUEUED).build();
  DisbursementStage stage=DisbursementStage.builder().id(stageId).planId(planId).amount(new BigDecimal("25000.00")).status(DisbursementStageStatus.READY).build();
  DisbursementPlan plan=DisbursementPlan.builder().id(planId).applicationId(appId).planStatus(DisbursementStatus.ACTIVE).build();
  when(batches.findById(batchId)).thenReturn(Optional.of(batch));
  when(jobs.findByBatchIdOrderByCreatedAtAsc(batchId)).thenReturn(List.of(job));
  when(stages.findById(stageId)).thenReturn(Optional.of(stage));
  when(plans.findById(planId)).thenReturn(Optional.of(plan));
  when(stages.findByPlanIdOrderByStageNumberAsc(planId)).thenReturn(List.of(stage));
  when(gateway.process(jobId, job.getAmount())).thenReturn(new PaymentGateway.GatewayResult(true,"SIM-PFMS-TEST","Simulated success"));
  when(jobs.save(any(PaymentJob.class))).thenAnswer(invocation->invocation.getArgument(0));
  when(stages.save(any(DisbursementStage.class))).thenAnswer(invocation->invocation.getArgument(0));
  when(batches.save(any(PaymentBatch.class))).thenAnswer(invocation->invocation.getArgument(0));

  PaymentBatchResponse response=service.process(batchId);

  assertEquals(PaymentBatchStatus.COMPLETED,response.status());
  assertEquals(PaymentJobStatus.SUCCESS,response.payments().getFirst().status());
  assertEquals("SIM-PFMS-TEST",response.payments().getFirst().transactionReference());
  assertEquals(DisbursementStageStatus.DISBURSED,stage.getStatus());
  verify(utilization).recordStageDisbursement(appId,stageId,new BigDecimal("25000.00"));
 }

 @Test void processingAnUnvalidatedBatchIsRejected(){
  UUID batchId=UUID.randomUUID();
  when(batches.findById(batchId)).thenReturn(Optional.of(PaymentBatch.builder().id(batchId).status(PaymentBatchStatus.DRAFT).build()));
  assertThrows(RuntimeException.class,()->service.process(batchId));
  verifyNoInteractions(gateway);
 }
}
