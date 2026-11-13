package com.sgdts.sgdts.disbursement;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "disbursement_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @Column(nullable = false)
    private UUID applicationId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalSanctionedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DisbursementStatus planStatus = DisbursementStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String createdBy;

    private String updatedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.planStatus == null) {
            this.planStatus = DisbursementStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
