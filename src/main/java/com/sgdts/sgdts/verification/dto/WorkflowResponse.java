package com.sgdts.sgdts.verification.dto;

import com.sgdts.sgdts.verification.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class WorkflowResponse {

    private UUID id;
    private UUID applicationId;
    private UUID schemeId;
    private List<String> stages;
    private int currentStageIndex;
    private String currentStageName;
    private TaskStatus status;
    private Decision finalDecision;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private List<TaskResponse> tasks;

    public static WorkflowResponse from(VerificationWorkflow wf, List<VerificationTask> tasks) {
        return WorkflowResponse.builder()
                .id(wf.getId())
                .applicationId(wf.getApplicationId())
                .schemeId(wf.getSchemeId())
                .stages(wf.getStages())
                .currentStageIndex(wf.getCurrentStageIndex())
                .currentStageName(wf.currentStageName())
                .status(wf.getStatus())
                .finalDecision(wf.getFinalDecision())
                .createdAt(wf.getCreatedAt())
                .completedAt(wf.getCompletedAt())
                .tasks(tasks.stream().map(TaskResponse::from).toList())
                .build();
    }
}
