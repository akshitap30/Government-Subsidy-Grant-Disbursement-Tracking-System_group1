package com.sgdts.sgdts.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "verification_workflows")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationWorkflow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID applicationId;

    @Column(nullable = false)
    private UUID schemeId;

    /**
     * Ordered list of stage names derived from the matching routing rule.
     * The stage at index {@code currentStageIndex} is the active stage.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "workflow_stages",
            joinColumns = @JoinColumn(name = "workflow_id"))
    @Column(name = "stage_name")
    @Builder.Default
    private List<String> stages = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private int currentStageIndex = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private Decision finalDecision;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /** Returns the name of the currently active stage, or null when all stages are done. */
    public String currentStageName() {
        if (currentStageIndex < stages.size()) {
            return stages.get(currentStageIndex);
        }
        return null;
    }

    public boolean hasNextStage() {
        return currentStageIndex + 1 < stages.size();
    }

    public void advanceStage() {
        this.currentStageIndex++;
    }
}
