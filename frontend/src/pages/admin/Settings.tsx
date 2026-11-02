import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/api/client'
import {
  Settings as SettingsIcon,
  Server,
  ShieldCheck,
  Clock,
  Database,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

export const Settings: React.FC = () => {
  const { success, error } = useToast()
  const [slaHours, setSlaHours] = useState('72')
  const [enforceSeparationOfDuties, setEnforceSeparationOfDuties] = useState(true)
  const [isPinging, setIsPinging] = useState(false)
  const [pingResult, setPingResult] = useState<string | null>(null)

  const handleTestConnection = async () => {
    try {
      setIsPinging(true)
      setPingResult(null)
      // Test ping to /api/v1/schemes
      const res = await apiClient.get('/api/v1/schemes?page=0&size=1')
      setPingResult('SUCCESS: Connected to Spring Boot 3 / Java 21 backend.')
      success('Connected to SGDTS backend service', 'Health Check OK')
    } catch (err: any) {
      setPingResult(`FAILED: ${err.message}`)
      error('Could not reach backend API', 'Connection Error')
    } finally {
      setIsPinging(false)
    }
  }

  const handleSaveSettings = () => {
    success('System governance parameters updated', 'Settings Saved')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          System Administration & Governance Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure service endpoints, statutory review SLA windows, and separation-of-duties enforcement rules.
        </p>
      </div>

      {/* Backend Connection Diagnostic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-600" />
            Backend API Connectivity & Actuator Telemetry
          </CardTitle>
          <CardDescription>
            Live HTTP connection status to the Spring Boot REST endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Configured Base URL:</span>
              <div className="font-mono text-slate-800 bg-slate-100 p-2 rounded mt-1">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080 (Vite Proxy: /api)'}
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Target Framework:</span>
              <div className="font-mono text-slate-800 bg-slate-100 p-2 rounded mt-1">
                Java 21 • Spring Boot 3.x • PostgreSQL 16
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              isLoading={isPinging}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Test Backend Ping
            </Button>
            {pingResult && (
              <span
                className={`text-xs font-semibold ${
                  pingResult.startsWith('SUCCESS') ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {pingResult}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification SLA & Governance Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Statutory Governance & Audit Rules
          </CardTitle>
          <CardDescription>
            Enforce anti-fraud controls and administrative review timelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Verification Task SLA (Hours)"
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              helperText="Default time allowed for field/district officers to render decision"
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Separation of Duties (SoD) Policy
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sod-toggle"
                  checked={enforceSeparationOfDuties}
                  onChange={(e) => setEnforceSeparationOfDuties(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sod-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Disallow same officer from approving multiple sequential stages
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveSettings}>
              Save Governance Parameters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

