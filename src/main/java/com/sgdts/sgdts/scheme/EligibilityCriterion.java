package com.sgdts.sgdts.scheme;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "eligibility_criteria")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String criterionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CriterionType type;

    private String expectedValue;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal weight = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private boolean mandatory = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", nullable = false)
    private Scheme scheme;
}
