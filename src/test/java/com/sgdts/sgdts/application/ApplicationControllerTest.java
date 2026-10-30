package com.sgdts.sgdts.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.application.dto.ApplicationResponse;
import com.sgdts.sgdts.application.dto.CreateApplicationRequest;
import com.sgdts.sgdts.common.GlobalExceptionHandler;
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

@WebMvcTest(ApplicationController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ApplicationService applicationService;

    private UUID appId;
    private ApplicationResponse sampleResponse;

    @BeforeEach
    void setUp() {
        appId = UUID.randomUUID();
        sampleResponse = ApplicationResponse.builder()
                .id(appId)
                .referenceNumber("APP-123456789")
                .beneficiaryId(UUID.randomUUID())
                .schemeId(UUID.randomUUID())
                .schemeConfigVersion(1)
                .requestedAmount(new BigDecimal("75000.00"))
                .status(ApplicationStatus.DRAFT)
                .statusHistory(List.of("DRAFT:" + LocalDateTime.now()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/applications creates draft with 201 CREATED")
    void testCreateDraft() throws Exception {
        CreateApplicationRequest req = new CreateApplicationRequest();
        req.setBeneficiaryId(UUID.randomUUID());
        req.setSchemeId(UUID.randomUUID());
        req.setRequestedAmount(new BigDecimal("75000.00"));

        when(applicationService.createDraft(any())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.referenceNumber").value("APP-123456789"));
    }

    @Test
    @DisplayName("GET /api/v1/applications/{id} returns application")
    void testGetApplication() throws Exception {
        when(applicationService.getApplication(appId)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/applications/{id}", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(appId.toString()));
    }

    @Test
    @DisplayName("GET /api/v1/applications/{id}/status returns application status and history")
    void testGetApplicationStatus() throws Exception {
        when(applicationService.getApplicationStatus(appId)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/applications/{id}/status", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.statusHistory").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/applications returns paged applications")
    void testListApplications() throws Exception {
        when(applicationService.listApplications(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleResponse)));

        mockMvc.perform(get("/api/v1/applications?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].referenceNumber").value("APP-123456789"));
    }

    @Test
    @DisplayName("POST /api/v1/applications/{id}/submit submits application")
    void testSubmitApplication() throws Exception {
        sampleResponse.setStatus(ApplicationStatus.SUBMITTED);
        when(applicationService.submitApplication(appId)).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/applications/{id}/submit", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
    }

    @Test
    @DisplayName("POST /api/v1/applications/{id}/cancel cancels application")
    void testCancelApplication() throws Exception {
        sampleResponse.setStatus(ApplicationStatus.CANCELLED);
        when(applicationService.cancelApplication(appId)).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/applications/{id}/cancel", appId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }
}

