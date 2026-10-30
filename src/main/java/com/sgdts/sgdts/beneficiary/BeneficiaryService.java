package com.sgdts.sgdts.beneficiary;

import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.beneficiary.dto.UpdateBeneficiaryRequest;
import com.sgdts.sgdts.common.BusinessException;
import com.sgdts.sgdts.common.ConflictException;
import com.sgdts.sgdts.common.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;

    public BeneficiaryResponse register(RegisterBeneficiaryRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (beneficiaryRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ConflictException("A beneficiary with email '" + normalizedEmail + "' already exists");
        }

        Beneficiary beneficiary = Beneficiary.builder()
                .fullName(request.getFullName().trim())
                .email(normalizedEmail)
                .phone(request.getPhone().trim())
                .address(request.getAddress().trim())
                .district(request.getDistrict().trim())
                .state(request.getState().trim())
                .dateOfBirth(request.getDateOfBirth())
                .profileStatus(ProfileStatus.ACTIVE)
                .build();

        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        log.info("Registered beneficiary id={} email={}", saved.getId(), saved.getEmail());
        return BeneficiaryResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public BeneficiaryResponse findById(UUID id) {
        return BeneficiaryResponse.from(getBeneficiary(id));
    }

    @Transactional(readOnly = true)
    public Page<BeneficiaryResponse> listAll(Pageable pageable) {
        return beneficiaryRepository.findAll(pageable).map(BeneficiaryResponse::from);
    }

    public BeneficiaryResponse update(UUID id, UpdateBeneficiaryRequest request) {
        Beneficiary beneficiary = getBeneficiary(id);

        if (beneficiary.getProfileStatus() != ProfileStatus.ACTIVE) {
            throw new BusinessException("Cannot update profile for beneficiary with status: " + beneficiary.getProfileStatus());
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            beneficiary.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            beneficiary.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            beneficiary.setAddress(request.getAddress().trim());
        }
        if (request.getDistrict() != null && !request.getDistrict().isBlank()) {
            beneficiary.setDistrict(request.getDistrict().trim());
        }
        if (request.getState() != null && !request.getState().isBlank()) {
            beneficiary.setState(request.getState().trim());
        }

        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        return BeneficiaryResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return beneficiaryRepository.existsById(id);
    }

    @Transactional(readOnly = true)
    public Beneficiary getBeneficiary(UUID id) {
        return beneficiaryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Beneficiary", id));
    }
}
