package com.sgdts.sgdts.application;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a grant application submitted by a beneficiary for a scheme.
 * The table name uses "grant_application" to avoid the SQL reserved word "application".
 */
@Entity
@Table(name = "grant_application")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrantApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Human-readable unique reference, e.g. APP-1700000000000 */
    @Column(nullable = false, unique = true)
    private String referenceNumber;

    @Column(nullable = false)
    private UUID beneficiaryId;

    @Column(nullable = false)
    private UUID schemeId;

    /**
     * Snapshot of scheme.configVersion at the time of submission.
     * Ensures eligibility evaluation uses the exact rules in force at submission.
     */
    @Column(nullable = false)
    @Builder.Default
    private int schemeConfigVersion = 0;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal requestedAmount;

    /** Applicant-provided eligibility data serialised as JSON. */
    @Column(columnDefinition = "TEXT")
    private String eligibilityData;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.DRAFT;

    private LocalDateTime submittedAt;

    /** Reference to the EligibilityAssessment once evaluated. */
    private UUID eligibilityAssessmentId;

    /** Identifier of the current verification stage, populated after routing. */
    private String currentVerificationStage;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Ordered log of status transitions: "STATUS:ISO-timestamp".
     * Provides a lightweight audit trail without a separate audit entity.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "application_status_history",
            joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "history_entry")
    @Builder.Default
    private List<String> statusHistory = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = ApplicationStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /** Records a status transition into the history log. */
    public void recordStatusChange(ApplicationStatus newStatus) {
        this.statusHistory.add(newStatus.name() + ":" + LocalDateTime.now());
        this.status = newStatus;
    }
}
