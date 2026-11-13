package com.sgdts.sgdts.disbursement;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "disbursement_stages",
        uniqueConstraints = @UniqueConstraint(columnNames = {"planId", "stageNumber"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @Column(nullable = false)
    private UUID planId;

    @Column(nullable = false)
    private int stageNumber;

    @Column(nullable = false)
    private String stageName;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    private LocalDate scheduledDate;

    @Column(columnDefinition = "TEXT")
    private String releaseCondition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DisbursementStageStatus status = DisbursementStageStatus.SCHEDULED;

    private LocalDateTime releasedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = DisbursementStageStatus.SCHEDULED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
