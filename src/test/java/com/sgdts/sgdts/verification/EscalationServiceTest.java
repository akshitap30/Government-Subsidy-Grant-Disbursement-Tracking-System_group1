package com.sgdts.sgdts.verification;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscalationServiceTest {

    @Mock
    private VerificationTaskRepository taskRepository;

    private EscalationService escalationService;
    private Clock fixedClock;
    private LocalDateTime fixedNow;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-30T10:00:00Z"), ZoneId.of("UTC"));
        fixedNow = LocalDateTime.now(fixedClock);
        escalationService = new EscalationService(taskRepository, fixedClock);
    }

    @Test
    @DisplayName("Overdue pending task is escalated to LEVEL_1 and status ESCALATED")
    void testOverduePendingTaskIsEscalated() {
        VerificationTask overdueTask = VerificationTask.builder()
                .id(UUID.randomUUID())
                .stage(VerificationStage.INITIAL_REVIEW)
                .status(TaskStatus.PENDING)
                .escalationLevel(EscalationLevel.NONE)
                .dueAt(fixedNow.minusHours(5))
                .escalationHistory(new ArrayList<>())
                .build();

        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of(overdueTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        int escalatedCount = escalationService.escalateOverdueTasks(fixedNow);

        assertThat(escalatedCount).isEqualTo(1);
        assertThat(overdueTask.getStatus()).isEqualTo(TaskStatus.ESCALATED);
        assertThat(overdueTask.getEscalationLevel()).isEqualTo(EscalationLevel.LEVEL_1);
        assertThat(overdueTask.getEscalationHistory()).hasSize(1);
        assertThat(overdueTask.getEscalationHistory().get(0)).contains("LEVEL_1");
        verify(taskRepository).save(overdueTask);
    }

    @Test
    @DisplayName("Non-overdue task is not returned by query and not escalated")
    void testNonOverdueTaskNotEscalated() {
        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of());

        int count = escalationService.escalateOverdueTasks(fixedNow);

        assertThat(count).isEqualTo(0);
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("Completed task is terminal and not escalated")
    void testCompletedTaskNotEscalated() {
        VerificationTask completedTask = VerificationTask.builder()
                .id(UUID.randomUUID())
                .status(TaskStatus.COMPLETED)
                .escalationLevel(EscalationLevel.NONE)
                .dueAt(fixedNow.minusHours(10))
                .build();

        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of(completedTask));

        int count = escalationService.escalateOverdueTasks(fixedNow);

        assertThat(count).isEqualTo(0);
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("Repeated invocation does not duplicate escalation on already escalated tasks")
    void testRepeatedInvocationNoDuplicateEscalation() {
        VerificationTask overdueTask = VerificationTask.builder()
                .id(UUID.randomUUID())
                .stage(VerificationStage.DISTRICT_REVIEW)
                .status(TaskStatus.PENDING)
                .escalationLevel(EscalationLevel.NONE)
                .dueAt(fixedNow.minusHours(5))
                .escalationHistory(new ArrayList<>())
                .build();

        // First run: task is PENDING
        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of(overdueTask));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        int run1 = escalationService.escalateOverdueTasks(fixedNow);
        assertThat(run1).isEqualTo(1);
        assertThat(overdueTask.getStatus()).isEqualTo(TaskStatus.ESCALATED);

        // Second run: task is now ESCALATED, so query for PENDING tasks returns empty
        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of());

        int run2 = escalationService.escalateOverdueTasks(fixedNow);
        assertThat(run2).isEqualTo(0);
        // History should still only have the 1 original entry
        assertThat(overdueTask.getEscalationHistory()).hasSize(1);
    }

    @Test
    @DisplayName("Task progresses through escalation levels up to LEVEL_3 and stops")
    void testProgressionToLevel3() {
        VerificationTask task = VerificationTask.builder()
                .id(UUID.randomUUID())
                .status(TaskStatus.PENDING)
                .escalationLevel(EscalationLevel.LEVEL_1)
                .dueAt(fixedNow.minusDays(2))
                .escalationHistory(new ArrayList<>(List.of("LEVEL_1:prior")))
                .build();

        when(taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, fixedNow))
                .thenReturn(List.of(task));
        when(taskRepository.save(any(VerificationTask.class))).thenAnswer(i -> i.getArgument(0));

        // Escalate from LEVEL_1 to LEVEL_2
        int count1 = escalationService.escalateOverdueTasks(fixedNow);
        assertThat(count1).isEqualTo(1);
        assertThat(task.getEscalationLevel()).isEqualTo(EscalationLevel.LEVEL_2);

        // Escalate from LEVEL_2 to LEVEL_3
        task.setStatus(TaskStatus.PENDING); // simulate another overdue cycle
        int count2 = escalationService.escalateOverdueTasks(fixedNow);
        assertThat(count2).isEqualTo(1);
        assertThat(task.getEscalationLevel()).isEqualTo(EscalationLevel.LEVEL_3);

        // When already at LEVEL_3, it cannot be escalated further
        task.setStatus(TaskStatus.PENDING);
        int count3 = escalationService.escalateOverdueTasks(fixedNow);
        assertThat(count3).isEqualTo(0);
        assertThat(task.getEscalationLevel()).isEqualTo(EscalationLevel.LEVEL_3);
    }
}

