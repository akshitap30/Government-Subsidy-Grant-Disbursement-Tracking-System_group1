package com.sgdts.sgdts.verification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled trigger for the escalation service.
 * Runs every hour. The core escalation logic lives in {@link EscalationService}
 * so it can be tested independently of this scheduler.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EscalationScheduler {

    private final EscalationService escalationService;

    /** Runs every hour (3 600 000 ms). Adjust via application properties if needed. */
    @Scheduled(fixedDelayString = "${sgdts.escalation.interval-ms:3600000}")
    public void runEscalation() {
        log.debug("Escalation scheduler triggered");
        int count = escalationService.escalateOverdueTasks();
        log.info("Escalation scheduler completed: {} task(s) escalated", count);
    }
}
