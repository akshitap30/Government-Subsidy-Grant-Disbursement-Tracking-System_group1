package com.sgdts.sgdts.disbursement;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="payment_jobs", uniqueConstraints=@UniqueConstraint(name="uk_payment_job_stage", columnNames="stageId"))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentJob {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Version private Long version;
    @Column(nullable=false) private UUID batchId;
    @Column(nullable=false, unique=true) private UUID stageId;
    @Column(nullable=false) private UUID applicationId;
    @Column(nullable=false) private UUID beneficiaryId;
    @Column(nullable=false, precision=19, scale=2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private PaymentJobStatus status;
    @Column(nullable=false) private int attemptCount;
    private String transactionReference;
    private String gatewayMessage;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
    @PrePersist void create(){ if(createdAt==null) createdAt=LocalDateTime.now(); }
}
