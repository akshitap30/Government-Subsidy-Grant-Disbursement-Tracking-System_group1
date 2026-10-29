package com.sgdts.sgdts.verification.dto;

import com.sgdts.sgdts.verification.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TaskResponse {

    private UUID id;
    private UUID workflowId;
    private UUID applicationId;
    private VerificationStage stage;
    private TaskStatus status;
    private String assignedOfficerId;
    private LocalDateTime assignedAt;
    private LocalDateTime dueAt;
    private LocalDateTime completedAt;
    private Decision decision;
    private String comments;
    private EscalationLevel escalationLevel;
    private List<String> escalationHistory;
    private LocalDateTime createdAt;

    public static TaskResponse from(VerificationTask task) {
        return TaskResponse.builder()
                .id(task.getId())
                .workflowId(task.getWorkflowId())
                .applicationId(task.getApplicationId())
                .stage(task.getStage())
                .status(task.getStatus())
                .assignedOfficerId(task.getAssignedOfficerId())
                .assignedAt(task.getAssignedAt())
                .dueAt(task.getDueAt())
                .completedAt(task.getCompletedAt())
                .decision(task.getDecision())
                .comments(task.getComments())
                .escalationLevel(task.getEscalationLevel())
                .escalationHistory(task.getEscalationHistory())
                .createdAt(task.getCreatedAt())
                .build();
    }
}
