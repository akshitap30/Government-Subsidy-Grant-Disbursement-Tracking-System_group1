package com.sgdts.sgdts.beneficiary.dto;

import com.sgdts.sgdts.beneficiary.Beneficiary;
import com.sgdts.sgdts.beneficiary.ProfileStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaryResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String district;
    private String state;
    private LocalDate dateOfBirth;
    private ProfileStatus profileStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BeneficiaryResponse from(Beneficiary b) {
        return BeneficiaryResponse.builder()
                .id(b.getId())
                .fullName(b.getFullName())
                .email(b.getEmail())
                .phone(b.getPhone())
                .address(b.getAddress())
                .district(b.getDistrict())
                .state(b.getState())
                .dateOfBirth(b.getDateOfBirth())
                .profileStatus(b.getProfileStatus())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
