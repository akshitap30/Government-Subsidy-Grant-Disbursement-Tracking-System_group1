package com.sgdts.sgdts.verification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Escalation service for overdue verification tasks.
 *
 * <p>Design notes:
 * <ul>
 *   <li>The escalation decision logic is in {@code escalateOverdueTasks(LocalDateTime)} so it can be
 *       unit-tested without waiting for real time.</li>
 *   <li>Each task is escalated at most once per scheduler run to prevent duplicates.</li>
 *   <li>Terminal tasks (COMPLETED, CANCELLED) are never escalated.</li>
 *   <li>Maximum escalation level is {@link EscalationLevel#LEVEL_3}; tasks already at
 *       that level are not escalated again.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EscalationService {

    private static final List<EscalationLevel> ESCALATABLE_LEVELS =
            List.of(EscalationLevel.NONE, EscalationLevel.LEVEL_1, EscalationLevel.LEVEL_2);

    private final VerificationTaskRepository taskRepository;
    private final Clock clock;

    /**
     * Finds all PENDING tasks whose due date has passed as of now and escalates them.
     */
    @Transactional
    public int escalateOverdueTasks() {
        return escalateOverdueTasks(LocalDateTime.now(clock));
    }

    /**
     * Finds all PENDING tasks whose due date has passed as of the specified cutoff time
     * and escalates them by one level. Completed and already-max-escalated tasks are skipped.
     *
     * @param asOf cutoff timestamp to test for overdue status
     * @return number of tasks escalated in this run
     */
    @Transactional
    public int escalateOverdueTasks(LocalDateTime asOf) {
        List<VerificationTask> overdueTasks =
                taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, asOf);

        int escalated = 0;
        for (VerificationTask task : overdueTasks) {
            if (canEscalate(task)) {
                escalate(task, asOf);
                escalated++;
            }
        }

        if (escalated > 0) {
            log.info("Escalation run at {}: escalated {} task(s)", asOf, escalated);
        }
        return escalated;
    }

    private boolean canEscalate(VerificationTask task) {
        return !task.isTerminal() && ESCALATABLE_LEVELS.contains(task.getEscalationLevel());
    }

    private void escalate(VerificationTask task, LocalDateTime asOf) {
        EscalationLevel previous = task.getEscalationLevel();
        EscalationLevel next = nextLevel(previous);

        task.setEscalationLevel(next);
        task.setStatus(TaskStatus.ESCALATED);

        String entry = next.name() + ":" + asOf + ":Overdue — escalated from " + previous.name();
        task.getEscalationHistory().add(entry);

        taskRepository.save(task);
        log.debug("Task {} escalated {} → {}", task.getId(), previous, next);
    }

    private EscalationLevel nextLevel(EscalationLevel current) {
        return switch (current) {
            case NONE    -> EscalationLevel.LEVEL_1;
            case LEVEL_1 -> EscalationLevel.LEVEL_2;
            case LEVEL_2 -> EscalationLevel.LEVEL_3;
            default      -> EscalationLevel.LEVEL_3;
        };
    }
}
