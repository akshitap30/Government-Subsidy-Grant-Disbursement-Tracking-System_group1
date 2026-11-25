package com.sgdts.sgdts.disbursement;

import com.sgdts.sgdts.application.*;
import com.sgdts.sgdts.beneficiary.BeneficiaryService;
import com.sgdts.sgdts.common.*;
import com.sgdts.sgdts.compliance.ComplianceService;
import com.sgdts.sgdts.utilization.FundUtilizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class PaymentBatchService {
 private final PaymentBatchRepository batches;
 private final PaymentJobRepository jobs;
 private final DisbursementStageRepository stages;
 private final DisbursementPlanRepository plans;
 private final ApplicationService applications;
 private final BeneficiaryService beneficiaries;
 private final ComplianceService compliance;
 private final FundUtilizationService utilization;
 private final PaymentGateway gateway;
 @Value("${sgdts.payment.max-attempts:3}") private int maxAttempts;

 public PaymentBatchResponse create(List<UUID> stageIds) {
  if(stageIds==null || stageIds.isEmpty()) throw new BusinessException("Select at least one eligible READY stage");
  if(new HashSet<>(stageIds).size()!=stageIds.size()) throw new BusinessException("Duplicate stage ids are not allowed");
  List<PaymentJob> newJobs=new ArrayList<>(); BigDecimal total=BigDecimal.ZERO;
  for(UUID id:stageIds){
   DisbursementStage stage=stages.findById(id).orElseThrow(()->new NotFoundException("DisbursementStage",id));
   if(stage.getStatus()!=DisbursementStageStatus.READY) throw new BusinessException("Stage "+id+" must be READY before batching");
   if(stage.getAmount()==null || stage.getAmount().compareTo(BigDecimal.ZERO)<=0) throw new BusinessException("Stage amount must be positive");
   if(jobs.existsByStageId(id)) throw new ConflictException("A payment job already exists for stage "+id);
   DisbursementPlan plan=plans.findById(stage.getPlanId()).orElseThrow(()->new NotFoundException("DisbursementPlan",stage.getPlanId()));
   if(plan.getPlanStatus()!=DisbursementStatus.ACTIVE) throw new BusinessException("Stage plan must be ACTIVE");
   GrantApplication app=applications.findApplication(plan.getApplicationId());
   if(app.getStatus()!=ApplicationStatus.APPROVED) throw new BusinessException("Application is not approved");
   if(!beneficiaries.existsById(app.getBeneficiaryId())) throw new BusinessException("Beneficiary does not exist");
   if(!compliance.isStageComplianceMet(id)) throw new BusinessException("Mandatory compliance is incomplete for stage "+id);
   total=total.add(stage.getAmount());
   newJobs.add(PaymentJob.builder().stageId(id).applicationId(app.getId()).beneficiaryId(app.getBeneficiaryId()).amount(stage.getAmount()).status(PaymentJobStatus.QUEUED).attemptCount(0).build());
  }
  PaymentBatch batch=batches.save(PaymentBatch.builder().batchReference("SIM-BATCH-"+UUID.randomUUID().toString().substring(0,8).toUpperCase()).status(PaymentBatchStatus.DRAFT).totalAmount(total).build());
  for(PaymentJob job:newJobs) job.setBatchId(batch.getId());
  jobs.saveAll(newJobs);
  return get(batch.getId());
 }

 @Transactional(readOnly=true) public List<PaymentBatchResponse> list(){return batches.findAll().stream().sorted(Comparator.comparing(PaymentBatch::getCreatedAt).reversed()).map(b->response(b,jobs.findByBatchIdOrderByCreatedAtAsc(b.getId()))).toList();}
 @Transactional(readOnly=true) public PaymentBatchResponse get(UUID id){PaymentBatch b=batches.findById(id).orElseThrow(()->new NotFoundException("PaymentBatch",id)); return response(b,jobs.findByBatchIdOrderByCreatedAtAsc(id));}
 public PaymentBatchResponse validate(UUID id){PaymentBatch b=find(id); List<PaymentJob> list=jobs.findByBatchIdOrderByCreatedAtAsc(id); if(list.isEmpty()) throw new BusinessException("Batch contains no payments");
  for(PaymentJob job:list){DisbursementStage s=stage(job); if(job.getStatus()!=PaymentJobStatus.QUEUED || s.getStatus()!=DisbursementStageStatus.READY || !compliance.isStageComplianceMet(s.getId())) throw new BusinessException("Payment is no longer eligible: "+job.getId());}
  b.setStatus(PaymentBatchStatus.VALIDATED); batches.save(b); return get(id);
 }
 public PaymentBatchResponse process(UUID id){PaymentBatch b=find(id); if(b.getStatus()!=PaymentBatchStatus.VALIDATED) throw new BusinessException("Validate the batch before processing");
  b.setStatus(PaymentBatchStatus.PROCESSING); List<PaymentJob> list=jobs.findByBatchIdOrderByCreatedAtAsc(id);
  for(PaymentJob job:list){ if(job.getStatus()!=PaymentJobStatus.QUEUED) continue; job.setStatus(PaymentJobStatus.PROCESSING); job.setAttemptCount(job.getAttemptCount()+1); jobs.save(job);
   DisbursementStage stage=stage(job); PaymentGateway.GatewayResult result=gateway.process(job.getId(),job.getAmount()); job.setGatewayMessage(result.message()); job.setProcessedAt(LocalDateTime.now());
   if(result.success()){job.setStatus(PaymentJobStatus.SUCCESS); job.setTransactionReference(result.reference()); stage.setStatus(DisbursementStageStatus.DISBURSED); stage.setReleasedAt(LocalDateTime.now()); stages.save(stage); utilization.recordStageDisbursement(job.getApplicationId(),stage.getId(),job.getAmount());}
   else {job.setStatus(PaymentJobStatus.FAILED); stage.setStatus(DisbursementStageStatus.FAILED); stages.save(stage);} jobs.save(job);
  }
  long success=list.stream().filter(j->j.getStatus()==PaymentJobStatus.SUCCESS).count();
  b.setStatus(success==list.size()?PaymentBatchStatus.COMPLETED:success>0?PaymentBatchStatus.PARTIALLY_PROCESSED:PaymentBatchStatus.FAILED); b.setProcessedAt(LocalDateTime.now()); batches.save(b);
  refreshPlanStatuses(list); return get(id);
 }
 public PaymentBatchResponse retry(UUID jobId){
  PaymentJob job=jobs.findById(jobId).orElseThrow(()->new NotFoundException("PaymentJob",jobId));
  if(job.getStatus()!=PaymentJobStatus.FAILED) throw new BusinessException("Only FAILED payments can be retried");
  if(job.getAttemptCount()>=maxAttempts) throw new BusinessException("Maximum retry attempts exceeded");
  DisbursementStage stage=stage(job);
  if(stage.getStatus()==DisbursementStageStatus.DISBURSED || !compliance.isStageComplianceMet(stage.getId())) throw new BusinessException("Stage is no longer eligible for retry");
  DisbursementPlan plan=plans.findById(stage.getPlanId()).orElseThrow();
  if(plan.getPlanStatus()!=DisbursementStatus.ACTIVE) throw new BusinessException("Stage plan must be ACTIVE to retry");
  stage.setStatus(DisbursementStageStatus.READY); stages.save(stage); job.setStatus(PaymentJobStatus.QUEUED); jobs.save(job);
  PaymentBatch batch=find(job.getBatchId()); batch.setStatus(PaymentBatchStatus.VALIDATED); batches.save(batch); return get(batch.getId());
 }
 @Transactional(readOnly=true) public PaymentJobResponse getJob(UUID id){PaymentJob j=jobs.findById(id).orElseThrow(()->new NotFoundException("PaymentJob",id)); return new PaymentJobResponse(j.getId(),j.getStageId(),j.getApplicationId(),j.getBeneficiaryId(),j.getAmount(),j.getStatus(),j.getAttemptCount(),j.getTransactionReference(),j.getGatewayMessage(),j.getCreatedAt(),j.getProcessedAt());}
 private void refreshPlanStatuses(List<PaymentJob> list){for(PaymentJob job:list){DisbursementStage stage=stage(job); DisbursementPlan plan=plans.findById(stage.getPlanId()).orElseThrow(); List<DisbursementStage> all=stages.findByPlanIdOrderByStageNumberAsc(plan.getId()); if(all.stream().filter(s->s.getStatus()!=DisbursementStageStatus.CANCELLED).allMatch(s->s.getStatus()==DisbursementStageStatus.DISBURSED)){plan.setPlanStatus(DisbursementStatus.COMPLETED);plans.save(plan);}}}
 private DisbursementStage stage(PaymentJob j){return stages.findById(j.getStageId()).orElseThrow(()->new NotFoundException("DisbursementStage",j.getStageId()));}
 private PaymentBatch find(UUID id){return batches.findById(id).orElseThrow(()->new NotFoundException("PaymentBatch",id));}
 private PaymentBatchResponse response(PaymentBatch b,List<PaymentJob> js){return new PaymentBatchResponse(b.getId(),b.getBatchReference(),b.getStatus(),b.getTotalAmount(),js.size(),js.stream().filter(j->j.getStatus()==PaymentJobStatus.SUCCESS).count(),js.stream().filter(j->j.getStatus()==PaymentJobStatus.FAILED).count(),b.getCreatedAt(),b.getProcessedAt(),js.stream().map(j->new PaymentJobResponse(j.getId(),j.getStageId(),j.getApplicationId(),j.getBeneficiaryId(),j.getAmount(),j.getStatus(),j.getAttemptCount(),j.getTransactionReference(),j.getGatewayMessage(),j.getCreatedAt(),j.getProcessedAt())).toList());}
}
