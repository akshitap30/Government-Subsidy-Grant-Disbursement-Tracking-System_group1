package com.sgdts.sgdts.compliance;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "compliance_reminder_logs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"requirementId", "reminderType"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID requirementId;

    @Column(nullable = false)
    private String reminderType;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @Column(columnDefinition = "TEXT")
    private String message;

    @PrePersist
    protected void onCreate() {
        if (this.sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
    }
}
