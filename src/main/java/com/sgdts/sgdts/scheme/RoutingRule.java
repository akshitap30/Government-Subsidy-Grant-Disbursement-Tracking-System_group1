package com.sgdts.sgdts.scheme;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "routing_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal minScore;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal maxScore;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal minGrantAmount;

    @Column(precision = 19, scale = 2)
    private BigDecimal maxGrantAmount;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "routing_rule_stages", joinColumns = @JoinColumn(name = "routing_rule_id"))
    @Column(name = "stage")
    @Builder.Default
    private List<String> stages = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", nullable = false)
    private Scheme scheme;
}
