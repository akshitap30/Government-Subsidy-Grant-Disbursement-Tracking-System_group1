package com.sgdts.sgdts.scheme.dto;

import com.sgdts.sgdts.scheme.CriterionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CriterionDto {

    private String criterionId;
    private CriterionType type;
    private String expectedValue;
    private BigDecimal weight;
    private boolean mandatory;
    private String description;
}
