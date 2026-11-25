package com.sgdts.sgdts.disbursement;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="payment_batches") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentBatch {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Version private Long version;
    @Column(nullable=false, unique=true) private String batchReference;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private PaymentBatchStatus status;
    @Column(nullable=false, precision=19, scale=2) private BigDecimal totalAmount;
    @Column(nullable=false) private LocalDateTime createdAt;
    private LocalDateTime processedAt;
    @PrePersist void create(){ if(createdAt==null) createdAt=LocalDateTime.now(); }
}
