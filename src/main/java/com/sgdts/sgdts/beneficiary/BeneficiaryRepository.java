package com.sgdts.sgdts.beneficiary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, UUID> {

    Optional<Beneficiary> findByEmail(String email);

    Page<Beneficiary> findByProfileStatus(ProfileStatus status, Pageable pageable);
}
