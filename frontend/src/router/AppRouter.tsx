import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { SchemeManagement } from '@/pages/admin/SchemeManagement'
import { BeneficiaryManagement } from '@/pages/admin/BeneficiaryManagement'
import { ApplicationManagement } from '@/pages/admin/ApplicationManagement'
import { EligibilityOverview } from '@/pages/admin/EligibilityOverview'
import { VerificationManagement } from '@/pages/admin/VerificationManagement'
import { DisbursementTracking } from '@/pages/admin/DisbursementTracking'
import { ReportsAnalytics } from '@/pages/admin/ReportsAnalytics'
import { Settings } from '@/pages/admin/Settings'

// Beneficiary Pages
import { BeneficiaryDashboard } from '@/pages/beneficiary/BeneficiaryDashboard'
import { BrowseSchemes } from '@/pages/beneficiary/BrowseSchemes'
import { SchemeDetails } from '@/pages/beneficiary/SchemeDetails'
import { ApplicationWizard } from '@/pages/beneficiary/ApplicationWizard'
import { MyApplications } from '@/pages/beneficiary/MyApplications'
import { ApplicationTracker } from '@/pages/beneficiary/ApplicationTracker'
import { BeneficiaryProfile } from '@/pages/beneficiary/BeneficiaryProfile'

// Officer Pages
import { OfficerDashboard } from '@/pages/officer/OfficerDashboard'
import { TaskQueue } from '@/pages/officer/TaskQueue'
import { VerificationHistory } from '@/pages/officer/VerificationHistory'

// Not Found
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Default Redirect to Admin Dashboard */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />

        {/* Admin Routes */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/schemes" element={<SchemeManagement />} />
        <Route path="admin/beneficiaries" element={<BeneficiaryManagement />} />
        <Route path="admin/applications" element={<ApplicationManagement />} />
        <Route path="admin/eligibility" element={<EligibilityOverview />} />
        <Route path="admin/verification" element={<VerificationManagement />} />
        <Route path="admin/disbursements" element={<DisbursementTracking />} />
        <Route path="admin/reports" element={<ReportsAnalytics />} />
        <Route path="admin/settings" element={<Settings />} />

        {/* Beneficiary Routes */}
        <Route path="beneficiary/dashboard" element={<BeneficiaryDashboard />} />
        <Route path="beneficiary/schemes" element={<BrowseSchemes />} />
        <Route path="beneficiary/schemes/:id" element={<SchemeDetails />} />
        <Route path="beneficiary/apply/:schemeId" element={<ApplicationWizard />} />
        <Route path="beneficiary/applications" element={<MyApplications />} />
        <Route path="beneficiary/applications/:id/track" element={<ApplicationTracker />} />
        <Route path="beneficiary/profile" element={<BeneficiaryProfile />} />

        {/* Officer Routes */}
        <Route path="officer/dashboard" element={<OfficerDashboard />} />
        <Route path="officer/tasks" element={<TaskQueue />} />
        <Route path="officer/history" element={<VerificationHistory />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

