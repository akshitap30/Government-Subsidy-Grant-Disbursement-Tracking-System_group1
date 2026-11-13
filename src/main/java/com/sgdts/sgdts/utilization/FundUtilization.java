package com.sgdts.sgdts.utilization;

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
@Table(name = "fund_utilizations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FundUtilization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @Column(nullable = false)
    private UUID applicationId;

    private UUID disbursementStageId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amountDisbursed;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amountUtilized;

    @Column(nullable = false)
    private LocalDate utilizationDate;

    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UtilizationVerificationStatus verificationStatus = UtilizationVerificationStatus.PENDING;

    private String recordedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.verificationStatus == null) {
            this.verificationStatus = UtilizationVerificationStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
