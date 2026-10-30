package com.sgdts.sgdts.eligibility;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.common.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EligibilityController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class EligibilityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EligibilityService eligibilityService;

    private UUID appId;
    private EligibilityAssessment sampleAssessment;

    @BeforeEach
    void setUp() {
        appId = UUID.randomUUID();
        sampleAssessment = EligibilityAssessment.builder()
                .id(UUID.randomUUID())
                .applicationId(appId)
                .schemeId(UUID.randomUUID())
                .schemeConfigVersion(1)
                .outcome(EligibilityOutcome.ELIGIBLE)
                .totalScore(new BigDecimal("85.0000"))
                .maxPossibleScore(new BigDecimal("100.0000"))
                .normalizedScore(new BigDecimal("85.00"))
                .assessedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/applications/{id}/eligibility-assessment runs assessment and returns 201")
    void testAssessEndpoint() throws Exception {
        when(eligibilityService.assessApplication(appId)).thenReturn(sampleAssessment);

        mockMvc.perform(post("/api/v1/applications/{id}/eligibility-assessment", appId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.outcome").value("ELIGIBLE"))
                .andExpect(jsonPath("$.data.normalizedScore").value(85.0));
    }

    @Test
    @DisplayName("GET /api/v1/applications/{id}/eligibility-assessment returns existing assessment")
    void testGetAssessmentEndpoint() throws Exception {
        when(eligibilityService.getAssessment(appId)).thenReturn(sampleAssessment);

        mockMvc.perform(get("/api/v1/applications/{id}/eligibility-assessment", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.outcome").value("ELIGIBLE"));
    }
}

