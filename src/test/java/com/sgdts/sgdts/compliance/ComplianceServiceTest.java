package com.sgdts.sgdts.compliance;

import com.sgdts.sgdts.application.ApplicationService;
import com.sgdts.sgdts.application.GrantApplication;
import com.sgdts.sgdts.compliance.dto.ComplianceRequirementResponse;
import com.sgdts.sgdts.compliance.dto.CreateComplianceRequirementRequest;
import com.sgdts.sgdts.compliance.dto.SubmitComplianceRequest;
import com.sgdts.sgdts.compliance.dto.VerifyComplianceRequest;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplianceServiceTest {

    @Mock
    private ComplianceRequirementRepository requirementRepository;

    @Mock
    private ApplicationService applicationService;

    @Mock
    private NonComplianceService nonComplianceService;

    private Clock clock;
    private ComplianceService complianceService;

    private UUID applicationId;
    private UUID stageId;
    private UUID requirementId;
    private ComplianceRequirement requirement;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-11-01T10:00:00Z"), ZoneId.of("UTC"));
        complianceService = new ComplianceService(requirementRepository, applicationService, nonComplianceService, clock);

        applicationId = UUID.randomUUID();
        stageId = UUID.randomUUID();
        requirementId = UUID.randomUUID();

        requirement = ComplianceRequirement.builder()
                .id(requirementId)
                .applicationId(applicationId)
                .stageId(stageId)
                .requirementType(ComplianceRequirementType.DOCUMENT_SUBMISSION)
                .description("Land title deed")
                .dueDate(LocalDate.of(2026, 11, 15))
                .mandatory(true)
                .status(ComplianceStatus.PENDING)
                .build();
    }

    @Test
    @DisplayName("Create compliance requirement succeeds")
    void testCreateRequirement_Success() {
        when(applicationService.findApplication(applicationId)).thenReturn(new GrantApplication());
        when(requirementRepository.save(any(ComplianceRequirement.class))).thenAnswer(i -> {
            ComplianceRequirement r = i.getArgument(0);
            r.setId(requirementId);
            return r;
        });

        CreateComplianceRequirementRequest req = CreateComplianceRequirementRequest.builder()
                .applicationId(applicationId)
                .stageId(stageId)
                .requirementType(ComplianceRequirementType.DOCUMENT_SUBMISSION)
                .description("Land title deed")
                .dueDate(LocalDate.of(2026, 11, 15))
                .mandatory(true)
                .build();

        ComplianceRequirementResponse resp = complianceService.createRequirement(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getStatus()).isEqualTo(ComplianceStatus.PENDING);
        assertThat(resp.isMandatory()).isTrue();
    }

    @Test
    @DisplayName("Submit compliance transitions status to SUBMITTED and records submitter")
    void testSubmitCompliance_Success() {
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(requirement));
        when(requirementRepository.save(any(ComplianceRequirement.class))).thenAnswer(i -> i.getArgument(0));

        SubmitComplianceRequest req = SubmitComplianceRequest.builder()
                .submittedBy("BENEFICIARY_01")
                .remarks("Uploaded deed document")
                .build();

        ComplianceRequirementResponse resp = complianceService.submitCompliance(requirementId, req);

        assertThat(resp.getStatus()).isEqualTo(ComplianceStatus.SUBMITTED);
        assertThat(resp.getSubmittedBy()).isEqualTo("BENEFICIARY_01");
        assertThat(resp.getSubmittedAt()).isNotNull();
    }

    @Test
    @DisplayName("Verify compliance sets status to VERIFIED when approved")
    void testVerifyCompliance_Approved() {
        requirement.setStatus(ComplianceStatus.SUBMITTED);
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(requirement));
        when(requirementRepository.save(any(ComplianceRequirement.class))).thenAnswer(i -> i.getArgument(0));

        VerifyComplianceRequest req = VerifyComplianceRequest.builder()
                .verifiedBy("OFFICER_01")
                .approved(true)
                .remarks("Deed is verified and genuine")
                .build();

        ComplianceRequirementResponse resp = complianceService.verifyCompliance(requirementId, req);

        assertThat(resp.getStatus()).isEqualTo(ComplianceStatus.VERIFIED);
        assertThat(resp.getVerifiedBy()).isEqualTo("OFFICER_01");
        assertThat(resp.getVerifiedAt()).isNotNull();
    }

    @Test
    @DisplayName("Verify compliance sets status to REJECTED when not approved")
    void testVerifyCompliance_Rejected() {
        requirement.setStatus(ComplianceStatus.SUBMITTED);
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(requirement));
        when(requirementRepository.save(any(ComplianceRequirement.class))).thenAnswer(i -> i.getArgument(0));

        VerifyComplianceRequest req = VerifyComplianceRequest.builder()
                .verifiedBy("OFFICER_01")
                .approved(false)
                .remarks("Deed is illegible")
                .build();

        ComplianceRequirementResponse resp = complianceService.verifyCompliance(requirementId, req);

        assertThat(resp.getStatus()).isEqualTo(ComplianceStatus.REJECTED);
        assertThat(resp.getVerifiedBy()).isEqualTo("OFFICER_01");
    }

    @Test
    @DisplayName("isStageComplianceMet returns true when all mandatory requirements are VERIFIED or WAIVED")
    void testIsStageComplianceMet_True() {
        requirement.setStatus(ComplianceStatus.VERIFIED);
        ComplianceRequirement waivedReq = ComplianceRequirement.builder()
                .id(UUID.randomUUID())
                .stageId(stageId)
                .mandatory(true)
                .status(ComplianceStatus.WAIVED)
                .build();

        when(requirementRepository.findByStageIdAndMandatoryTrue(stageId))
                .thenReturn(List.of(requirement, waivedReq));

        boolean met = complianceService.isStageComplianceMet(stageId);
        assertThat(met).isTrue();
    }

    @Test
    @DisplayName("isStageComplianceMet returns false when any mandatory requirement is PENDING or SUBMITTED")
    void testIsStageComplianceMet_False() {
        requirement.setStatus(ComplianceStatus.SUBMITTED);
        when(requirementRepository.findByStageIdAndMandatoryTrue(stageId))
                .thenReturn(List.of(requirement));

        boolean met = complianceService.isStageComplianceMet(stageId);
        assertThat(met).isFalse();
    }

    @Test
    @DisplayName("checkAndProcessOverdue flags overdue mandatory compliance and updates status")
    void testCheckAndProcessOverdue_Success() {
        requirement.setDueDate(LocalDate.of(2026, 10, 20)); // Past due date
        when(requirementRepository.findByDueDateLessThanAndStatusNotIn(any(LocalDate.class), any()))
                .thenReturn(List.of(requirement));
        when(requirementRepository.save(any(ComplianceRequirement.class))).thenAnswer(i -> i.getArgument(0));

        int processed = complianceService.checkAndProcessOverdue();

        assertThat(processed).isEqualTo(1);
        assertThat(requirement.getStatus()).isEqualTo(ComplianceStatus.OVERDUE);
        verify(nonComplianceService).createFlagForOverdue(eq(requirement), anyLong());
    }
}
