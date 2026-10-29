package com.sgdts.sgdts.application;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<GrantApplication, UUID> {

    Optional<GrantApplication> findByReferenceNumber(String referenceNumber);

    Page<GrantApplication> findByBeneficiaryId(UUID beneficiaryId, Pageable pageable);

    Page<GrantApplication> findBySchemeId(UUID schemeId, Pageable pageable);

    Page<GrantApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    boolean existsByBeneficiaryIdAndSchemeIdAndStatusIn(
            UUID beneficiaryId, UUID schemeId, List<ApplicationStatus> statuses);
}
