import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { DemoRoleBar } from './DemoRoleBar'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Demo Context Bar */}
      <DemoRoleBar />

      {/* Main Top Header */}
      <Topbar />

      {/* Mobile Menu Toggle Bar */}
      <div className="md:hidden bg-slate-800 text-white px-4 py-2 flex items-center justify-between border-b border-slate-700">
        <span className="text-xs font-medium text-slate-300">Navigation Menu</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[100vw] overflow-x-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-64 bg-slate-900">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

