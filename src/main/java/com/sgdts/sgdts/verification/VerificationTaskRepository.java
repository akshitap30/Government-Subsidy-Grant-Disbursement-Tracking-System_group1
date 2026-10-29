package com.sgdts.sgdts.verification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationTaskRepository extends JpaRepository<VerificationTask, UUID> {

    List<VerificationTask> findByWorkflowIdOrderByCreatedAtAsc(UUID workflowId);

    Optional<VerificationTask> findByWorkflowIdAndStage(UUID workflowId, VerificationStage stage);

    /** Used by the escalation service to find overdue pending tasks. */
    List<VerificationTask> findByStatusAndDueAtBefore(TaskStatus status, LocalDateTime cutoff);

    Page<VerificationTask> findByAssignedOfficerIdAndStatus(String officerId, TaskStatus status, Pageable pageable);

    List<VerificationTask> findByWorkflowId(UUID workflowId);
}
