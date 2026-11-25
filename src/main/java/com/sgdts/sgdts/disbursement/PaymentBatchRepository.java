package com.sgdts.sgdts.disbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PaymentBatchRepository extends JpaRepository<PaymentBatch, UUID> { }
