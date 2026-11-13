package com.sgdts.sgdts.compliance;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "compliance_requirements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @Column(nullable = false)
    private UUID applicationId;

    private UUID stageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplianceRequirementType requirementType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ComplianceStatus status = ComplianceStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private boolean mandatory = true;

    private LocalDateTime submittedAt;

    private LocalDateTime verifiedAt;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    private String submittedBy;

    private String verifiedBy;

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
            this.status = ComplianceStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
