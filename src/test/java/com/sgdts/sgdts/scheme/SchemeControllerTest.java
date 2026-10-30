package com.sgdts.sgdts.scheme;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.common.GlobalExceptionHandler;
import com.sgdts.sgdts.scheme.dto.CreateSchemeRequest;
import com.sgdts.sgdts.scheme.dto.CriterionDto;
import com.sgdts.sgdts.scheme.dto.RoutingRuleDto;
import com.sgdts.sgdts.scheme.dto.SchemeResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SchemeController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class SchemeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SchemeService schemeService;

    private UUID schemeId;
    private SchemeResponse sampleResponse;

    @BeforeEach
    void setUp() {
        schemeId = UUID.randomUUID();
        sampleResponse = SchemeResponse.builder()
                .id(schemeId)
                .name("Solar Irrigation Scheme")
                .description("Subsidies for solar pump installation")
                .status(SchemeStatus.DRAFT)
                .minGrantAmount(new BigDecimal("50000.00"))
                .maxGrantAmount(new BigDecimal("200000.00"))
                .configVersion(1)
                .criteria(List.of(
                        CriterionDto.builder()
                                .criterionId("pump_capacity_hp")
                                .type(CriterionType.NUMERIC_MIN)
                                .expectedValue("3")
                                .weight(new BigDecimal("100.0"))
                                .mandatory(true)
                                .build()
                ))
                .routingRules(List.of(
                        RoutingRuleDto.builder()
                                .minScore(new BigDecimal("50.0"))
                                .maxScore(new BigDecimal("100.0"))
                                .minGrantAmount(new BigDecimal("50000.00"))
                                .maxGrantAmount(new BigDecimal("200000.00"))
                                .stages(List.of("INITIAL_REVIEW", "FIELD_VERIFICATION"))
                                .build()
                ))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/schemes creates scheme with 201 CREATED")
    void testCreateScheme() throws Exception {
        CreateSchemeRequest req = CreateSchemeRequest.builder()
                .name("Solar Irrigation Scheme")
                .description("Subsidies for solar pump installation")
                .minGrantAmount(new BigDecimal("50000.00"))
                .maxGrantAmount(new BigDecimal("200000.00"))
                .build();

        when(schemeService.createScheme(any())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/schemes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Solar Irrigation Scheme"));
    }

    @Test
    @DisplayName("GET /api/v1/schemes/{id} returns scheme")
    void testGetScheme() throws Exception {
        when(schemeService.getScheme(schemeId)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/schemes/{id}", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(schemeId.toString()));
    }

    @Test
    @DisplayName("GET /api/v1/schemes lists schemes")
    void testListSchemes() throws Exception {
        when(schemeService.listSchemes(any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleResponse)));

        mockMvc.perform(get("/api/v1/schemes?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].name").value("Solar Irrigation Scheme"));
    }

    @Test
    @DisplayName("GET /api/v1/schemes/{id}/criteria returns criteria list")
    void testGetCriteria() throws Exception {
        when(schemeService.getCriteria(schemeId)).thenReturn(sampleResponse.getCriteria());

        mockMvc.perform(get("/api/v1/schemes/{id}/criteria", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].criterionId").value("pump_capacity_hp"));
    }

    @Test
    @DisplayName("GET /api/v1/schemes/{id}/routing-rules returns routing rules")
    void testGetRoutingRules() throws Exception {
        when(schemeService.getRoutingRules(schemeId)).thenReturn(sampleResponse.getRoutingRules());

        mockMvc.perform(get("/api/v1/schemes/{id}/routing-rules", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].stages[0]").value("INITIAL_REVIEW"));
    }

    @Test
    @DisplayName("POST /api/v1/schemes/{id}/activate activates scheme")
    void testActivateScheme() throws Exception {
        sampleResponse.setStatus(SchemeStatus.ACTIVE);
        when(schemeService.activateScheme(schemeId)).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/schemes/{id}/activate", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /api/v1/schemes/{id}/deactivate deactivates scheme")
    void testDeactivateScheme() throws Exception {
        sampleResponse.setStatus(SchemeStatus.INACTIVE);
        when(schemeService.deactivateScheme(schemeId)).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/schemes/{id}/deactivate", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }
}

