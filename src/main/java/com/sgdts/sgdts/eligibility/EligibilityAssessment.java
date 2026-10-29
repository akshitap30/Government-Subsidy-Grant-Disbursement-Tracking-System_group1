package com.sgdts.sgdts.eligibility;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "eligibility_assessments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID applicationId;

    @Column(nullable = false)
    private UUID schemeId;

    @Column(nullable = false)
    private int schemeConfigVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EligibilityOutcome outcome;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal totalScore;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal maxPossibleScore;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal normalizedScore;

    /** Per-criterion results serialised as JSON. */
    @Column(columnDefinition = "TEXT")
    private String assessmentDetails;

    @Column(nullable = false)
    private LocalDateTime assessedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
