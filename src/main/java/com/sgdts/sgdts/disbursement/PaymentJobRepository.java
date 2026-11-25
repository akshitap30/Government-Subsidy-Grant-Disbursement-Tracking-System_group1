package com.sgdts.sgdts.disbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface PaymentJobRepository extends JpaRepository<PaymentJob, UUID> {
 List<PaymentJob> findByBatchIdOrderByCreatedAtAsc(UUID batchId);
 boolean existsByStageId(UUID stageId);
}
