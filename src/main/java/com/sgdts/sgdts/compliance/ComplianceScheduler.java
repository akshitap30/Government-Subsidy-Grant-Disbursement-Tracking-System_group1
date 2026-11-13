package com.sgdts.sgdts.compliance;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ComplianceScheduler {

    private final ComplianceService complianceService;
    private final ComplianceReminderService complianceReminderService;

    @Scheduled(fixedDelayString = "${sgdts.compliance.interval-ms:3600000}")
    public void runComplianceJobs() {
        log.debug("Compliance scheduler triggered");
        try {
            int overdueCount = complianceService.checkAndProcessOverdue();
            int reminderCount = complianceReminderService.processReminders();
            log.info("Compliance scheduler finished: {} overdue processed, {} reminders sent", overdueCount, reminderCount);
        } catch (Exception e) {
            log.error("Error during compliance scheduler execution: {}", e.getMessage(), e);
        }
    }
}
