package com.sgdts.sgdts.scheme.dto;

import com.sgdts.sgdts.scheme.EligibilityCriterion;
import com.sgdts.sgdts.scheme.RoutingRule;
import com.sgdts.sgdts.scheme.Scheme;
import com.sgdts.sgdts.scheme.SchemeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchemeResponse {

    private UUID id;
    private String name;
    private String description;
    private SchemeStatus status;
    private BigDecimal minGrantAmount;
    private BigDecimal maxGrantAmount;
    private int configVersion;
    private List<CriterionDto> criteria;
    private List<RoutingRuleDto> routingRules;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SchemeResponse from(Scheme scheme) {
        List<CriterionDto> criteriaDto = scheme.getCriteria().stream()
                .map(c -> CriterionDto.builder()
                        .criterionId(c.getCriterionId())
                        .type(c.getType())
                        .expectedValue(c.getExpectedValue())
                        .weight(c.getWeight())
                        .mandatory(c.isMandatory())
                        .description(c.getDescription())
                        .build())
                .collect(Collectors.toList());

        List<RoutingRuleDto> rulesDto = scheme.getRoutingRules().stream()
                .map(r -> RoutingRuleDto.builder()
                        .minScore(r.getMinScore())
                        .maxScore(r.getMaxScore())
                        .minGrantAmount(r.getMinGrantAmount())
                        .maxGrantAmount(r.getMaxGrantAmount())
                        .stages(r.getStages())
                        .build())
                .collect(Collectors.toList());

        return SchemeResponse.builder()
                .id(scheme.getId())
                .name(scheme.getName())
                .description(scheme.getDescription())
                .status(scheme.getStatus())
                .minGrantAmount(scheme.getMinGrantAmount())
                .maxGrantAmount(scheme.getMaxGrantAmount())
                .configVersion(scheme.getConfigVersion())
                .criteria(criteriaDto)
                .routingRules(rulesDto)
                .createdAt(scheme.getCreatedAt())
                .updatedAt(scheme.getUpdatedAt())
                .build();
    }
}
