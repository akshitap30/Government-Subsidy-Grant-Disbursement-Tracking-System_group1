package com.sgdts.sgdts.scheme;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, UUID> {

    Page<Scheme> findByStatus(SchemeStatus status, Pageable pageable);
}
