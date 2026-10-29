package com.sgdts.sgdts.scheme;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "schemes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Scheme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SchemeStatus status = SchemeStatus.DRAFT;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal minGrantAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal maxGrantAmount;

    @Column(nullable = false)
    @Builder.Default
    private int configVersion = 1;

    @OneToMany(mappedBy = "scheme", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<EligibilityCriterion> criteria = new ArrayList<>();

    @OneToMany(mappedBy = "scheme", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoutingRule> routingRules = new ArrayList<>();

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
            this.status = SchemeStatus.DRAFT;
        }
        if (this.configVersion == 0) {
            this.configVersion = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        this.configVersion++;
    }
}
