package com.sgdts.sgdts.beneficiary.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBeneficiaryRequest {

    private String fullName;
    private String phone;
    private String address;
    private String district;
    private String state;
}
