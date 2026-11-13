package com.sgdts.sgdts.compliance;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplianceReminderServiceTest {

    @Mock
    private ComplianceRequirementRepository requirementRepository;

    @Mock
    private ComplianceReminderLogRepository reminderLogRepository;

    private Clock clock;
    private ComplianceReminderService reminderService;

    private UUID req7DaysId;
    private UUID reqDueTodayId;
    private UUID reqOverdueId;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-11-10T10:00:00Z"), ZoneId.of("UTC")); // Today is 2026-11-10
        reminderService = new ComplianceReminderService(requirementRepository, reminderLogRepository, clock);

        req7DaysId = UUID.randomUUID();
        reqDueTodayId = UUID.randomUUID();
        reqOverdueId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Process reminders sends 7_DAYS_BEFORE, DUE_TODAY, and OVERDUE reminders")
    void testProcessReminders_GeneratesExpectedReminders() {
        ComplianceRequirement req7Days = ComplianceRequirement.builder()
                .id(req7DaysId)
                .description("Inspection Report")
                .dueDate(LocalDate.of(2026, 11, 17)) // exactly 7 days
                .status(ComplianceStatus.PENDING)
                .build();

        ComplianceRequirement reqDueToday = ComplianceRequirement.builder()
                .id(reqDueTodayId)
                .description("Proof of Purchase")
                .dueDate(LocalDate.of(2026, 11, 10)) // today
                .status(ComplianceStatus.SUBMITTED)
                .build();

        ComplianceRequirement reqOverdue = ComplianceRequirement.builder()
                .id(reqOverdueId)
                .description("Audit Certificate")
                .dueDate(LocalDate.of(2026, 11, 5)) // 5 days overdue
                .status(ComplianceStatus.OVERDUE)
                .build();

        when(requirementRepository.findAll()).thenReturn(List.of(req7Days, reqDueToday, reqOverdue));
        when(reminderLogRepository.existsByRequirementIdAndReminderType(any(), any())).thenReturn(false);

        int sent = reminderService.processReminders();

        assertThat(sent).isEqualTo(3);
        verify(reminderLogRepository).save(argThat(log -> log.getReminderType().equals("7_DAYS_BEFORE")));
        verify(reminderLogRepository).save(argThat(log -> log.getReminderType().equals("DUE_TODAY")));
        verify(reminderLogRepository).save(argThat(log -> log.getReminderType().equals("OVERDUE")));
    }

    @Test
    @DisplayName("Process reminders skips duplicate reminders if already logged")
    void testProcessReminders_SkipsDuplicates() {
        ComplianceRequirement req7Days = ComplianceRequirement.builder()
                .id(req7DaysId)
                .description("Inspection Report")
                .dueDate(LocalDate.of(2026, 11, 17))
                .status(ComplianceStatus.PENDING)
                .build();

        when(requirementRepository.findAll()).thenReturn(List.of(req7Days));
        when(reminderLogRepository.existsByRequirementIdAndReminderType(req7DaysId, "7_DAYS_BEFORE")).thenReturn(true);

        int sent = reminderService.processReminders();

        assertThat(sent).isEqualTo(0);
        verify(reminderLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Process reminders skips requirements in terminal status VERIFIED or WAIVED")
    void testProcessReminders_SkipsTerminalStatus() {
        ComplianceRequirement verifiedReq = ComplianceRequirement.builder()
                .id(UUID.randomUUID())
                .description("Tax Clearance")
                .dueDate(LocalDate.of(2026, 11, 10))
                .status(ComplianceStatus.VERIFIED)
                .build();

        when(requirementRepository.findAll()).thenReturn(List.of(verifiedReq));

        int sent = reminderService.processReminders();

        assertThat(sent).isEqualTo(0);
        verify(reminderLogRepository, never()).save(any());
    }
}
