package com.sgdts.sgdts.compliance;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ComplianceReminderService {

    private final ComplianceRequirementRepository requirementRepository;
    private final ComplianceReminderLogRepository reminderLogRepository;
    private final Clock clock;

    private static final List<ComplianceStatus> TERMINAL_STATUSES = List.of(
            ComplianceStatus.VERIFIED,
            ComplianceStatus.WAIVED,
            ComplianceStatus.REJECTED
    );

    public int processReminders() {
        LocalDate today = LocalDate.now(clock);
        List<ComplianceRequirement> allRequirements = requirementRepository.findAll();
        int reminderCount = 0;

        for (ComplianceRequirement req : allRequirements) {
            if (TERMINAL_STATUSES.contains(req.getStatus())) {
                continue;
            }

            LocalDate dueDate = req.getDueDate();
            if (dueDate == null) {
                continue;
            }

            long daysUntilDue = ChronoUnit.DAYS.between(today, dueDate);
            String reminderType = null;
            String message = null;

            if (daysUntilDue == 7) {
                reminderType = "7_DAYS_BEFORE";
                message = "Compliance requirement '" + req.getDescription() + "' is due in 7 days (" + dueDate + ")";
            } else if (daysUntilDue == 3) {
                reminderType = "3_DAYS_BEFORE";
                message = "Compliance requirement '" + req.getDescription() + "' is due in 3 days (" + dueDate + ")";
            } else if (daysUntilDue == 1) {
                reminderType = "1_DAY_BEFORE";
                message = "Compliance requirement '" + req.getDescription() + "' is due tomorrow (" + dueDate + ")";
            } else if (daysUntilDue == 0) {
                reminderType = "DUE_TODAY";
                message = "Compliance requirement '" + req.getDescription() + "' is due today (" + dueDate + ")";
            } else if (daysUntilDue < 0) {
                reminderType = "OVERDUE";
                long daysOverdue = Math.abs(daysUntilDue);
                message = "Compliance requirement '" + req.getDescription() + "' is OVERDUE by " + daysOverdue + " day(s)";
            }

            if (reminderType != null) {
                if (!reminderLogRepository.existsByRequirementIdAndReminderType(req.getId(), reminderType)) {
                    ComplianceReminderLog logEntry = ComplianceReminderLog.builder()
                            .requirementId(req.getId())
                            .reminderType(reminderType)
                            .sentAt(LocalDateTime.now(clock))
                            .message(message)
                            .build();
                    reminderLogRepository.save(logEntry);
                    reminderCount++;
                    log.info("Sent reminder type={} for requirement id={}", reminderType, req.getId());
                }
            }
        }

        return reminderCount;
    }
}
