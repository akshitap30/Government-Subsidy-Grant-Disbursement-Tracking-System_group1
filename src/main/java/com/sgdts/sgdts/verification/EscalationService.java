package com.sgdts.sgdts.verification;

import com.sgdts.sgdts.common.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Escalation service for overdue verification tasks.
 *
 * <p>Design notes:
 * <ul>
 *   <li>The escalation decision logic is in {@code escalateOverdueTasks()} so it can be
 *       unit-tested without waiting for the scheduler.</li>
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

    /**
     * Finds all PENDING tasks whose due date has passed and escalates them
     * by one level. Completed and already-max-escalated tasks are skipped.
     *
     * @return number of tasks escalated in this run
     */
    @Transactional
    public int escalateOverdueTasks() {
        LocalDateTime now = LocalDateTime.now();
        List<VerificationTask> overdueTasks =
                taskRepository.findByStatusAndDueAtBefore(TaskStatus.PENDING, now);

        int escalated = 0;
        for (VerificationTask task : overdueTasks) {
            if (canEscalate(task)) {
                escalate(task, now);
                escalated++;
            }
        }

        if (escalated > 0) {
            log.info("Escalation run at {}: escalated {} task(s)", now, escalated);
        }
        return escalated;
    }

    private boolean canEscalate(VerificationTask task) {
        return ESCALATABLE_LEVELS.contains(task.getEscalationLevel());
    }

    private void escalate(VerificationTask task, LocalDateTime now) {
        EscalationLevel previous = task.getEscalationLevel();
        EscalationLevel next = nextLevel(previous);

        task.setEscalationLevel(next);
        task.setStatus(TaskStatus.ESCALATED);

        String entry = next.name() + ":" + now + ":Overdue — escalated from " + previous.name();
        task.getEscalationHistory().add(entry);

        taskRepository.save(task);
        log.debug("Task {} escalated {} → {}", task.getId(), previous, next);
    }

    private EscalationLevel nextLevel(EscalationLevel current) {
        return switch (current) {
            case NONE    -> EscalationLevel.LEVEL_1;
            case LEVEL_1 -> EscalationLevel.LEVEL_2;
            case LEVEL_2 -> EscalationLevel.LEVEL_3;
            default      -> EscalationLevel.LEVEL_3; // already at max, should not reach here
        };
    }
}
