package com.sgdts.sgdts.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "verification_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID workflowId;

    @Column(nullable = false)
    private UUID applicationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VerificationStage stage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    /** ID of the officer currently assigned; null = unassigned. */
    private String assignedOfficerId;

    private LocalDateTime assignedAt;

    /** Configurable SLA deadline for this task. */
    private LocalDateTime dueAt;

    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    private Decision decision;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EscalationLevel escalationLevel = EscalationLevel.NONE;

    /**
     * Audit trail of escalation events: "LEVEL:ISO-timestamp:reason".
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_escalation_history",
            joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "escalation_entry")
    @Builder.Default
    private List<String> escalationHistory = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isTerminal() {
        return status == TaskStatus.COMPLETED || status == TaskStatus.CANCELLED;
    }
}
