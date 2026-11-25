package com.sgdts.sgdts.disbursement;
import com.sgdts.sgdts.common.ApiResponse; import lombok.RequiredArgsConstructor; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class PaymentBatchController {
 private final PaymentBatchService service;
 public record CreateBatchRequest(List<UUID> stageIds) { }
 @PostMapping("/payment-batches") public ResponseEntity<ApiResponse<PaymentBatchResponse>> create(@RequestBody CreateBatchRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Simulated payment batch created",service.create(r.stageIds())));}
 @GetMapping("/payment-batches") public ResponseEntity<ApiResponse<List<PaymentBatchResponse>>> list(){return ResponseEntity.ok(ApiResponse.success(service.list()));}
 @GetMapping("/payment-batches/{id}") public ResponseEntity<ApiResponse<PaymentBatchResponse>> get(@PathVariable UUID id){return ResponseEntity.ok(ApiResponse.success(service.get(id)));}
 @PostMapping("/payment-batches/{id}/validate") public ResponseEntity<ApiResponse<PaymentBatchResponse>> validate(@PathVariable UUID id){return ResponseEntity.ok(ApiResponse.success("Batch validated",service.validate(id)));}
 @PostMapping("/payment-batches/{id}/process") public ResponseEntity<ApiResponse<PaymentBatchResponse>> process(@PathVariable UUID id){return ResponseEntity.ok(ApiResponse.success("Simulated payment processing complete",service.process(id)));}
 @GetMapping("/payment-jobs/{id}") public ResponseEntity<ApiResponse<PaymentJobResponse>> getJob(@PathVariable UUID id){return ResponseEntity.ok(ApiResponse.success(service.getJob(id)));}
 @PostMapping("/payment-jobs/{id}/retry") public ResponseEntity<ApiResponse<PaymentBatchResponse>> retry(@PathVariable UUID id){return ResponseEntity.ok(ApiResponse.success("Payment queued for retry",service.retry(id)));}
}
