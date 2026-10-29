package com.sgdts.sgdts.beneficiary;

import com.sgdts.sgdts.beneficiary.dto.BeneficiaryResponse;
import com.sgdts.sgdts.beneficiary.dto.RegisterBeneficiaryRequest;
import com.sgdts.sgdts.beneficiary.dto.UpdateBeneficiaryRequest;
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
        if (beneficiaryRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("A beneficiary with email '" + request.getEmail() + "' already exists");
        }

        Beneficiary beneficiary = Beneficiary.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .district(request.getDistrict())
                .state(request.getState())
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

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            beneficiary.setFullName(request.getFullName());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            beneficiary.setPhone(request.getPhone());
        }
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            beneficiary.setAddress(request.getAddress());
        }
        if (request.getDistrict() != null && !request.getDistrict().isBlank()) {
            beneficiary.setDistrict(request.getDistrict());
        }
        if (request.getState() != null && !request.getState().isBlank()) {
            beneficiary.setState(request.getState());
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
