import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ShieldAlert } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 bg-slate-100 rounded-full text-slate-500">
        <ShieldAlert className="h-12 w-12 text-slate-700" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h1>
      <p className="text-slate-500 max-w-md">
        The requested administrative route or citizen portal page does not exist or has been relocated.
      </p>
      <Link to="/admin/dashboard">
        <Button variant="primary">Return to Administration Portal</Button>
      </Link>
    </div>
  )
}

