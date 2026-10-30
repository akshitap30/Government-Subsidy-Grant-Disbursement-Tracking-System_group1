package com.sgdts.sgdts.scheme;

import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.NotFoundException;
import com.sgdts.sgdts.scheme.dto.CreateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.CriterionDto;
import com.sgdts.sgdts.scheme.dto.RoutingRuleDto;
import com.sgdts.sgdts.scheme.dto.SchemeResponse;
import com.sgdts.sgdts.scheme.dto.UpdateSchemeRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchemeServiceTest {

    @Mock
    private SchemeRepository schemeRepository;

    @InjectMocks
    private SchemeService schemeService;

    private Scheme sampleScheme;
    private CreateSchemeRequest validCreateRequest;

    @BeforeEach
    void setUp() {
        UUID schemeId = UUID.randomUUID();
        sampleScheme = Scheme.builder()
                .id(schemeId)
                .name("Agriculture Modernization Grant")
                .description("Subsidies for farm mechanization")
                .status(SchemeStatus.DRAFT)
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("500000.00"))
                .configVersion(1)
                .criteria(new ArrayList<>())
                .routingRules(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        validCreateRequest = CreateSchemeRequest.builder()
                .name("Agriculture Modernization Grant")
                .description("Subsidies for farm mechanization")
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("500000.00"))
                .criteria(List.of(
                        CriterionDto.builder()
                                .criterionId("annual_income")
                                .type(CriterionType.NUMERIC_MAX)
                                .expectedValue("300000")
                                .weight(new BigDecimal("60.0"))
                                .mandatory(true)
                                .build(),
                        CriterionDto.builder()
                                .criterionId("land_size_acres")
                                .type(CriterionType.NUMERIC_MIN)
                                .expectedValue("2.5")
                                .weight(new BigDecimal("40.0"))
                                .mandatory(false)
                                .build()
                ))
                .routingRules(List.of(
                        RoutingRuleDto.builder()
                                .minScore(new BigDecimal("60.0"))
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("10000.00"))
                                .maxGrantAmount(new BigDecimal("100000.00"))
                                .stages(List.of("INITIAL_REVIEW", "DISTRICT_REVIEW"))
                                .build()
                ))
                .build();
    }

    @Test
    @DisplayName("Successfully create scheme in DRAFT status with configVersion 1")
    void testCreateSchemeSuccess() {
        when(schemeRepository.save(any(Scheme.class))).thenAnswer(i -> {
            Scheme s = i.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        SchemeResponse response = schemeService.createScheme(validCreateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Agriculture Modernization Grant");
        assertThat(response.getStatus()).isEqualTo(SchemeStatus.DRAFT);
        assertThat(response.getConfigVersion()).isEqualTo(1);
        assertThat(response.getCriteria()).hasSize(2);
        assertThat(response.getRoutingRules()).hasSize(1);
    }

    @Test
    @DisplayName("Create scheme throws BusinessException when minGrantAmount exceeds maxGrantAmount")
    void testCreateSchemeInvalidGrantLimits() {
        validCreateRequest.setMinGrantAmount(new BigDecimal("600000.00"));
        validCreateRequest.setMaxGrantAmount(new BigDecimal("500000.00"));

        assertThatThrownBy(() -> schemeService.createScheme(validCreateRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Minimum grant amount cannot exceed maximum grant amount");

        verify(schemeRepository, never()).save(any(Scheme.class));
    }

    @Test
    @DisplayName("Create scheme throws BusinessException when grant amounts are negative")
    void testCreateSchemeNegativeGrant() {
        validCreateRequest.setMinGrantAmount(new BigDecimal("-100.00"));

        assertThatThrownBy(() -> schemeService.createScheme(validCreateRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Minimum grant amount cannot be negative");
    }

    @Test
    @DisplayName("Activate scheme successfully when criteria and routing rules are valid")
    void testActivateSchemeSuccess() {
        UUID id = sampleScheme.getId();
        // Add valid criteria
        sampleScheme.getCriteria().add(EligibilityCriterion.builder()
                .criterionId("income")
                .type(CriterionType.NUMERIC_MAX)
                .expectedValue("500000")
                .weight(new BigDecimal("100.0"))
                .mandatory(true)
                .scheme(sampleScheme)
                .build());
        // Add valid routing rule
        sampleScheme.getRoutingRules().add(RoutingRule.builder()
                .minScore(BigDecimal.ZERO)
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(new BigDecimal("10000.00"))
                .maxGrantAmount(new BigDecimal("500000.00"))
                .stages(List.of("INITIAL_REVIEW"))
                .scheme(sampleScheme)
                .build());

        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));
        when(schemeRepository.save(any(Scheme.class))).thenAnswer(i -> i.getArgument(0));

        SchemeResponse response = schemeService.activateScheme(id);

        assertThat(response.getStatus()).isEqualTo(SchemeStatus.ACTIVE);
    }

    @Test
    @DisplayName("Activate scheme fails if weights sum to 0 or less")
    void testActivateSchemeInvalidWeights() {
        UUID id = sampleScheme.getId();
        sampleScheme.getCriteria().add(EligibilityCriterion.builder()
                .criterionId("income")
                .type(CriterionType.NUMERIC_MAX)
                .expectedValue("500000")
                .weight(BigDecimal.ZERO)
                .mandatory(true)
                .scheme(sampleScheme)
                .build());
        sampleScheme.getRoutingRules().add(RoutingRule.builder()
                .minScore(BigDecimal.ZERO)
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(new BigDecimal("10000.00"))
                .stages(List.of("INITIAL_REVIEW"))
                .scheme(sampleScheme)
                .build());

        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));

        assertThatThrownBy(() -> schemeService.activateScheme(id))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Criteria weights must sum to greater than 0");
    }

    @Test
    @DisplayName("Activate scheme fails if duplicate criterion IDs exist")
    void testActivateSchemeDuplicateCriteria() {
        UUID id = sampleScheme.getId();
        sampleScheme.getCriteria().add(EligibilityCriterion.builder()
                .criterionId("income")
                .type(CriterionType.NUMERIC_MAX)
                .expectedValue("500000")
                .weight(new BigDecimal("50.0"))
                .scheme(sampleScheme)
                .build());
        sampleScheme.getCriteria().add(EligibilityCriterion.builder()
                .criterionId("income")
                .type(CriterionType.NUMERIC_MAX)
                .expectedValue("600000")
                .weight(new BigDecimal("50.0"))
                .scheme(sampleScheme)
                .build());

        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));

        assertThatThrownBy(() -> schemeService.activateScheme(id))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Duplicate criterion ID in scheme: income");
    }

    @Test
    @DisplayName("Activate scheme fails if scheme has no routing rules")
    void testActivateSchemeMissingRoutingRules() {
        UUID id = sampleScheme.getId();
        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));

        assertThatThrownBy(() -> schemeService.activateScheme(id))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Scheme must have at least one routing rule before activation");
    }

    @Test
    @DisplayName("Activate scheme fails if routing rule specifies invalid stage name")
    void testActivateSchemeInvalidStageName() {
        UUID id = sampleScheme.getId();
        sampleScheme.getRoutingRules().add(RoutingRule.builder()
                .minScore(BigDecimal.ZERO)
                .maxScore(new BigDecimal("100.0"))
                .minGrantAmount(new BigDecimal("10000.00"))
                .stages(List.of("NON_EXISTENT_STAGE"))
                .scheme(sampleScheme)
                .build());

        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));

        assertThatThrownBy(() -> schemeService.activateScheme(id))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unknown verification stage in routing rule");
    }

    @Test
    @DisplayName("Update scheme updates fields when scheme is DRAFT")
    void testUpdateSchemeSuccess() {
        UUID id = sampleScheme.getId();
        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));
        when(schemeRepository.save(any(Scheme.class))).thenAnswer(i -> i.getArgument(0));

        UpdateSchemeRequest updateReq = UpdateSchemeRequest.builder()
                .name("Updated Scheme Name")
                .description("Updated description")
                .build();

        SchemeResponse response = schemeService.updateScheme(id, updateReq);

        assertThat(response.getName()).isEqualTo("Updated Scheme Name");
        assertThat(response.getDescription()).isEqualTo("Updated description");
    }

    @Test
    @DisplayName("Update scheme throws BusinessException if scheme is already ACTIVE")
    void testUpdateActiveSchemeThrows() {
        UUID id = sampleScheme.getId();
        sampleScheme.setStatus(SchemeStatus.ACTIVE);
        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));

        UpdateSchemeRequest updateReq = UpdateSchemeRequest.builder()
                .name("Updated Scheme Name")
                .build();

        assertThatThrownBy(() -> schemeService.updateScheme(id, updateReq))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only DRAFT schemes can be updated");
    }

    @Test
    @DisplayName("Deactivate active scheme succeeds")
    void testDeactivateScheme() {
        UUID id = sampleScheme.getId();
        sampleScheme.setStatus(SchemeStatus.ACTIVE);
        when(schemeRepository.findById(id)).thenReturn(Optional.of(sampleScheme));
        when(schemeRepository.save(any(Scheme.class))).thenAnswer(i -> i.getArgument(0));

        SchemeResponse response = schemeService.deactivateScheme(id);

        assertThat(response.getStatus()).isEqualTo(SchemeStatus.INACTIVE);
    }
}

