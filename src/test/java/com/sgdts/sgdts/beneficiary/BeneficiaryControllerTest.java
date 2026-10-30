package com.sgdts.sgdts.beneficiary;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.beneficiary.dto.UpdateBeneficiaryRequest;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.GlobalExceptionHandler;
import com.sgdts.sgdts.common.NotFoundException;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BeneficiaryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class BeneficiaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BeneficiaryService beneficiaryService;

    private UUID sampleId;
    private BeneficiaryResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleId = UUID.randomUUID();
        sampleResponse = BeneficiaryResponse.builder()
                .id(sampleId)
                .fullName("Priya Patel")
                .email("priya.patel@example.gov")
                .phone("+91-9876501234")
                .address("Sector 4, Gandhinagar")
                .district("Gandhinagar")
                .state("Gujarat")
                .dateOfBirth(LocalDate.of(1992, 8, 20))
                .profileStatus(ProfileStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/beneficiaries returns 201 on valid registration")
    void testRegisterValid() throws Exception {
        RegisterBeneficiaryRequest req = RegisterBeneficiaryRequest.builder()
                .fullName("Priya Patel")
                .email("priya.patel@example.gov")
                .phone("+91-9876501234")
                .address("Sector 4, Gandhinagar")
                .district("Gandhinagar")
                .state("Gujarat")
                .dateOfBirth(LocalDate.of(1992, 8, 20))
                .build();

        when(beneficiaryService.register(any())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/beneficiaries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Priya Patel"))
                .andExpect(jsonPath("$.data.email").value("priya.patel@example.gov"));
    }

    @Test
    @DisplayName("POST /api/v1/beneficiaries returns 400 when required fields are missing")
    void testRegisterValidationFailure() throws Exception {
        RegisterBeneficiaryRequest req = RegisterBeneficiaryRequest.builder()
                .email("not-an-email")
                .build();

        mockMvc.perform(post("/api/v1/beneficiaries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    @DisplayName("POST /api/v1/beneficiaries returns 409 on duplicate email")
    void testRegisterDuplicate() throws Exception {
        RegisterBeneficiaryRequest req = RegisterBeneficiaryRequest.builder()
                .fullName("Priya Patel")
                .email("priya.patel@example.gov")
                .phone("+91-9876501234")
                .address("Sector 4, Gandhinagar")
                .district("Gandhinagar")
                .state("Gujarat")
                .dateOfBirth(LocalDate.of(1992, 8, 20))
                .build();

        when(beneficiaryService.register(any()))
                .thenThrow(new ConflictException("A beneficiary with email 'priya.patel@example.gov' already exists"));

        mockMvc.perform(post("/api/v1/beneficiaries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("A beneficiary with email 'priya.patel@example.gov' already exists"));
    }

    @Test
    @DisplayName("GET /api/v1/beneficiaries/{id} returns 200 when exists")
    void testGetByIdFound() throws Exception {
        when(beneficiaryService.findById(sampleId)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/beneficiaries/{id}", sampleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(sampleId.toString()));
    }

    @Test
    @DisplayName("GET /api/v1/beneficiaries/{id} returns 404 when missing")
    void testGetByIdNotFound() throws Exception {
        when(beneficiaryService.findById(sampleId)).thenThrow(new NotFoundException("Beneficiary", sampleId));

        mockMvc.perform(get("/api/v1/beneficiaries/{id}", sampleId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/beneficiaries/{id}/exists returns existence boolean")
    void testCheckExists() throws Exception {
        when(beneficiaryService.existsById(sampleId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/beneficiaries/{id}/exists", sampleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    @DisplayName("GET /api/v1/beneficiaries returns paged list")
    void testListAll() throws Exception {
        when(beneficiaryService.listAll(any()))
                .thenReturn(new PageImpl<>(List.of(sampleResponse)));

        mockMvc.perform(get("/api/v1/beneficiaries?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].fullName").value("Priya Patel"));
    }

    @Test
    @DisplayName("PUT /api/v1/beneficiaries/{id} updates profile")
    void testUpdate() throws Exception {
        UpdateBeneficiaryRequest updateReq = UpdateBeneficiaryRequest.builder()
                .fullName("Priya R. Patel")
                .build();

        when(beneficiaryService.update(eq(sampleId), any())).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/v1/beneficiaries/{id}", sampleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

