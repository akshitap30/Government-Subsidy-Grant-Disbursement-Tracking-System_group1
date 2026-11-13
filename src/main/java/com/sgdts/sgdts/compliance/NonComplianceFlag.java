package com.sgdts.sgdts.compliance;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "non_compliance_flags")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NonComplianceFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID applicationId;

    private UUID stageId;

    @Column(nullable = false)
    private UUID requirementId;

    private String flagType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NonComplianceSeverity severity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private NonComplianceFlagStatus status = NonComplianceFlagStatus.OPEN;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;

    private String resolvedBy;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = NonComplianceFlagStatus.OPEN;
        }
    }
}
