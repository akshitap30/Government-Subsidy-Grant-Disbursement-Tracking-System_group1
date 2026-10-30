package com.sgdts.sgdts.scheme;

import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.scheme.dto.*;
import com.sgdts.sgdts.verification.VerificationStage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SchemeService {

    private final SchemeRepository schemeRepository;

    public SchemeResponse createScheme(CreateSchemeRequest request) {
        validateGrantLimits(request.getMinGrantAmount(), request.getMaxGrantAmount());

        Scheme scheme = Scheme.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .status(SchemeStatus.DRAFT)
                .minGrantAmount(request.getMinGrantAmount())
                .maxGrantAmount(request.getMaxGrantAmount())
                .configVersion(1)
                .criteria(new ArrayList<>())
                .routingRules(new ArrayList<>())
                .build();

        Scheme saved = schemeRepository.save(scheme);

        if (request.getCriteria() != null) {
            addCriteria(saved, request.getCriteria());
        }
        if (request.getRoutingRules() != null) {
            addRoutingRules(saved, request.getRoutingRules());
        }

        Scheme finalSaved = schemeRepository.save(saved);
        log.info("Created scheme id={} name={}", finalSaved.getId(), finalSaved.getName());
        return SchemeResponse.from(finalSaved);
    }

    @Transactional(readOnly = true)
    public SchemeResponse getScheme(UUID id) {
        return SchemeResponse.from(findScheme(id));
    }

    @Transactional(readOnly = true)
    public Page<SchemeResponse> listSchemes(SchemeStatus status, Pageable pageable) {
        if (status != null) {
            return schemeRepository.findByStatus(status, pageable).map(SchemeResponse::from);
        }
        return schemeRepository.findAll(pageable).map(SchemeResponse::from);
    }

    public SchemeResponse updateScheme(UUID id, UpdateSchemeRequest request) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.DRAFT) {
            throw new BusinessException("Only DRAFT schemes can be updated. Current status: " + scheme.getStatus());
        }

        BigDecimal newMin = request.getMinGrantAmount() != null ? request.getMinGrantAmount() : scheme.getMinGrantAmount();
        BigDecimal newMax = request.getMaxGrantAmount() != null ? request.getMaxGrantAmount() : scheme.getMaxGrantAmount();
        validateGrantLimits(newMin, newMax);

        if (request.getName() != null && !request.getName().isBlank()) {
            scheme.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            scheme.setDescription(request.getDescription());
        }
        if (request.getMinGrantAmount() != null) {
            scheme.setMinGrantAmount(request.getMinGrantAmount());
        }
        if (request.getMaxGrantAmount() != null) {
            scheme.setMaxGrantAmount(request.getMaxGrantAmount());
        }
        if (request.getCriteria() != null) {
            scheme.getCriteria().clear();
            addCriteria(scheme, request.getCriteria());
        }
        if (request.getRoutingRules() != null) {
            scheme.getRoutingRules().clear();
            addRoutingRules(scheme, request.getRoutingRules());
        }

        Scheme saved = schemeRepository.save(scheme);
        return SchemeResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<CriterionDto> getCriteria(UUID id) {
        Scheme scheme = findScheme(id);
        return scheme.getCriteria().stream()
                .map(c -> CriterionDto.builder()
                        .criterionId(c.getCriterionId())
                        .type(c.getType())
                        .expectedValue(c.getExpectedValue())
                        .weight(c.getWeight())
                        .mandatory(c.isMandatory())
                        .description(c.getDescription())
                        .build())
                .collect(Collectors.toList());
    }

    public SchemeResponse updateCriteria(UUID id, List<CriterionDto> criteriaDtos) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.DRAFT) {
            throw new BusinessException("Only DRAFT schemes can have criteria updated");
        }
        scheme.getCriteria().clear();
        if (criteriaDtos != null) {
            addCriteria(scheme, criteriaDtos);
        }
        return SchemeResponse.from(schemeRepository.save(scheme));
    }

    @Transactional(readOnly = true)
    public List<RoutingRuleDto> getRoutingRules(UUID id) {
        Scheme scheme = findScheme(id);
        return scheme.getRoutingRules().stream()
                .map(r -> RoutingRuleDto.builder()
                        .minScore(r.getMinScore())
                        .maxScore(r.getMaxScore())
                        .minGrantAmount(r.getMinGrantAmount())
                        .maxGrantAmount(r.getMaxGrantAmount())
                        .stages(r.getStages())
                        .build())
                .collect(Collectors.toList());
    }

    public SchemeResponse updateRoutingRules(UUID id, List<RoutingRuleDto> ruleDtos) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.DRAFT) {
            throw new BusinessException("Only DRAFT schemes can have routing rules updated");
        }
        scheme.getRoutingRules().clear();
        if (ruleDtos != null) {
            addRoutingRules(scheme, ruleDtos);
        }
        return SchemeResponse.from(schemeRepository.save(scheme));
    }

    public SchemeResponse activateScheme(UUID id) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.DRAFT && scheme.getStatus() != SchemeStatus.INACTIVE) {
            throw new BusinessException("Scheme can only be activated from DRAFT or INACTIVE status");
        }
        validateSchemeForActivation(scheme);
        scheme.setStatus(SchemeStatus.ACTIVE);
        Scheme saved = schemeRepository.save(scheme);
        log.info("Activated scheme id={}", id);
        return SchemeResponse.from(saved);
    }

    public SchemeResponse deactivateScheme(UUID id) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE schemes can be deactivated");
        }
        scheme.setStatus(SchemeStatus.INACTIVE);
        Scheme saved = schemeRepository.save(scheme);
        log.info("Deactivated scheme id={}", id);
        return SchemeResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Scheme getSchemeForApplication(UUID id) {
        Scheme scheme = findScheme(id);
        if (scheme.getStatus() != SchemeStatus.ACTIVE) {
            throw new BusinessException("Scheme is not ACTIVE. Current status: " + scheme.getStatus());
        }
        return scheme;
    }

    @Transactional(readOnly = true)
    public Scheme findScheme(UUID id) {
        return schemeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Scheme", id));
    }

    private void validateGrantLimits(BigDecimal min, BigDecimal max) {
        if (min != null && min.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Minimum grant amount cannot be negative");
        }
        if (max != null && max.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Maximum grant amount cannot be negative");
        }
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new BusinessException("Minimum grant amount cannot exceed maximum grant amount");
        }
    }

    private void validateSchemeForActivation(Scheme scheme) {
        validateGrantLimits(scheme.getMinGrantAmount(), scheme.getMaxGrantAmount());

        if (scheme.getCriteria() != null && !scheme.getCriteria().isEmpty()) {
            Set<String> seenIds = new HashSet<>();
            BigDecimal totalWeight = BigDecimal.ZERO;
            for (EligibilityCriterion criterion : scheme.getCriteria()) {
                if (criterion.getCriterionId() == null || criterion.getCriterionId().isBlank()) {
                    throw new BusinessException("Criterion ID cannot be blank");
                }
                if (!seenIds.add(criterion.getCriterionId().trim().toLowerCase())) {
                    throw new BusinessException("Duplicate criterion ID in scheme: " + criterion.getCriterionId());
                }
                if (criterion.getWeight() != null && criterion.getWeight().compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException("Criterion weight cannot be negative for " + criterion.getCriterionId());
                }
                if (criterion.getWeight() != null) {
                    totalWeight = totalWeight.add(criterion.getWeight());
                }
            }
            if (totalWeight.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Criteria weights must sum to greater than 0");
            }
        }

        if (scheme.getRoutingRules() == null || scheme.getRoutingRules().isEmpty()) {
            throw new BusinessException("Scheme must have at least one routing rule before activation");
        }

        for (RoutingRule rule : scheme.getRoutingRules()) {
            if (rule.getMinScore() == null || rule.getMaxScore() == null) {
                throw new BusinessException("Routing rule must specify both minScore and maxScore");
            }
            if (rule.getMinScore().compareTo(BigDecimal.ZERO) < 0 || rule.getMaxScore().compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException("Routing rule score range must be within 0 to 100");
            }
            if (rule.getMinScore().compareTo(rule.getMaxScore()) > 0) {
                throw new BusinessException("Routing rule minScore cannot exceed maxScore");
            }
            if (rule.getMinGrantAmount() == null || rule.getMinGrantAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Routing rule minimum grant amount must be non-negative");
            }
            if (rule.getMaxGrantAmount() != null && rule.getMinGrantAmount().compareTo(rule.getMaxGrantAmount()) > 0) {
                throw new BusinessException("Routing rule minGrantAmount cannot exceed maxGrantAmount");
            }
            if (rule.getStages() == null || rule.getStages().isEmpty()) {
                throw new BusinessException("Each routing rule must have at least one stage");
            }
            for (String stageName : rule.getStages()) {
                try {
                    VerificationStage.valueOf(stageName);
                } catch (IllegalArgumentException e) {
                    throw new BusinessException("Unknown verification stage in routing rule: " + stageName);
                }
            }
        }
    }

    private void addCriteria(Scheme scheme, List<CriterionDto> dtos) {
        List<EligibilityCriterion> criteria = dtos.stream()
                .map(dto -> EligibilityCriterion.builder()
                        .criterionId(dto.getCriterionId())
                        .type(dto.getType())
                        .expectedValue(dto.getExpectedValue())
                        .weight(dto.getWeight() != null ? dto.getWeight() : BigDecimal.ZERO)
                        .mandatory(dto.isMandatory())
                        .description(dto.getDescription())
                        .scheme(scheme)
                        .build())
                .collect(Collectors.toList());
        scheme.getCriteria().addAll(criteria);
    }

    private void addRoutingRules(Scheme scheme, List<RoutingRuleDto> dtos) {
        List<RoutingRule> rules = dtos.stream()
                .map(dto -> RoutingRule.builder()
                        .minScore(dto.getMinScore())
                        .maxScore(dto.getMaxScore())
                        .minGrantAmount(dto.getMinGrantAmount())
                        .maxGrantAmount(dto.getMaxGrantAmount())
                        .stages(dto.getStages() != null ? new ArrayList<>(dto.getStages()) : new ArrayList<>())
                        .scheme(scheme)
                        .build())
                .collect(Collectors.toList());
        scheme.getRoutingRules().addAll(rules);
    }
}
