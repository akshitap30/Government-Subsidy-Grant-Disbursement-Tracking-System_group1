package com.sgdts.sgdts.beneficiary;

import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.beneficiary.dto.UpdateBeneficiaryRequest;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BeneficiaryServiceTest {

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @InjectMocks
    private BeneficiaryService beneficiaryService;

    private Beneficiary sampleBeneficiary;
    private RegisterBeneficiaryRequest registerRequest;

    @BeforeEach
    void setUp() {
        UUID id = UUID.randomUUID();
        sampleBeneficiary = Beneficiary.builder()
                .id(id)
                .fullName("Aarav Sharma")
                .email("aarav.sharma@example.gov")
                .phone("+91-9876543210")
                .address("123 Civil Lines")
                .district("Pune")
                .state("Maharashtra")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .profileStatus(ProfileStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        registerRequest = RegisterBeneficiaryRequest.builder()
                .fullName("Aarav Sharma")
                .email("aarav.sharma@example.gov")
                .phone("+91-9876543210")
                .address("123 Civil Lines")
                .district("Pune")
                .state("Maharashtra")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .build();
    }

    @Test
    @DisplayName("Successfully register a new beneficiary with normalized email")
    void testRegisterSuccess() {
        when(beneficiaryRepository.findByEmail("aarav.sharma@example.gov")).thenReturn(Optional.empty());
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenReturn(sampleBeneficiary);

        BeneficiaryResponse response = beneficiaryService.register(registerRequest);

        assertThat(response).isNotNull();
        assertThat(response.getFullName()).isEqualTo("Aarav Sharma");
        assertThat(response.getEmail()).isEqualTo("aarav.sharma@example.gov");
        assertThat(response.getProfileStatus()).isEqualTo(ProfileStatus.ACTIVE);
        verify(beneficiaryRepository).findByEmail("aarav.sharma@example.gov");
        verify(beneficiaryRepository).save(any(Beneficiary.class));
    }

    @Test
    @DisplayName("Duplicate registration with existing normalized email throws ConflictException")
    void testRegisterDuplicateConflict() {
        when(beneficiaryRepository.findByEmail("aarav.sharma@example.gov")).thenReturn(Optional.of(sampleBeneficiary));

        assertThatThrownBy(() -> beneficiaryService.register(registerRequest))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");

        verify(beneficiaryRepository, never()).save(any(Beneficiary.class));
    }

    @Test
    @DisplayName("Find beneficiary by ID returns profile when present")
    void testFindByIdSuccess() {
        UUID id = sampleBeneficiary.getId();
        when(beneficiaryRepository.findById(id)).thenReturn(Optional.of(sampleBeneficiary));

        BeneficiaryResponse response = beneficiaryService.findById(id);

        assertThat(response.getId()).isEqualTo(id);
        assertThat(response.getFullName()).isEqualTo("Aarav Sharma");
    }

    @Test
    @DisplayName("Find beneficiary by ID throws NotFoundException when missing")
    void testFindByIdNotFound() {
        UUID randomId = UUID.randomUUID();
        when(beneficiaryRepository.findById(randomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> beneficiaryService.findById(randomId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Beneficiary not found");
    }

    @Test
    @DisplayName("List beneficiaries with pagination returns paged response")
    void testListAll() {
        PageRequest pageRequest = PageRequest.of(0, 10);
        when(beneficiaryRepository.findAll(pageRequest))
                .thenReturn(new PageImpl<>(List.of(sampleBeneficiary), pageRequest, 1));

        Page<BeneficiaryResponse> page = beneficiaryService.listAll(pageRequest);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getFullName()).isEqualTo("Aarav Sharma");
    }

    @Test
    @DisplayName("Update permitted fields for ACTIVE beneficiary succeeds")
    void testUpdateSuccess() {
        UUID id = sampleBeneficiary.getId();
        when(beneficiaryRepository.findById(id)).thenReturn(Optional.of(sampleBeneficiary));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(i -> i.getArgument(0));

        UpdateBeneficiaryRequest updateReq = UpdateBeneficiaryRequest.builder()
                .fullName("Aarav K. Sharma")
                .phone("+91-9123456789")
                .address("456 MG Road")
                .district("Nagpur")
                .state("Maharashtra")
                .build();

        BeneficiaryResponse updated = beneficiaryService.update(id, updateReq);

        assertThat(updated.getFullName()).isEqualTo("Aarav K. Sharma");
        assertThat(updated.getPhone()).isEqualTo("+91-9123456789");
        assertThat(updated.getAddress()).isEqualTo("456 MG Road");
        assertThat(updated.getDistrict()).isEqualTo("Nagpur");
    }

    @Test
    @DisplayName("Update throws BusinessException if beneficiary profile is not ACTIVE")
    void testUpdateNonActiveThrows() {
        UUID id = sampleBeneficiary.getId();
        sampleBeneficiary.setProfileStatus(ProfileStatus.SUSPENDED);
        when(beneficiaryRepository.findById(id)).thenReturn(Optional.of(sampleBeneficiary));

        UpdateBeneficiaryRequest updateReq = UpdateBeneficiaryRequest.builder()
                .fullName("Aarav K. Sharma")
                .build();

        assertThatThrownBy(() -> beneficiaryService.update(id, updateReq))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot update profile for beneficiary with status: SUSPENDED");
    }

    @Test
    @DisplayName("Check beneficiary existence")
    void testExistsById() {
        UUID id = sampleBeneficiary.getId();
        when(beneficiaryRepository.existsById(id)).thenReturn(true);

        assertThat(beneficiaryService.existsById(id)).isTrue();
    }
}

