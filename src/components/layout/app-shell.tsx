'use client'

import { useState, useCallback } from 'react'
import { DomainProvider } from '@/providers/domain-provider'
import { AppSidebar } from './app-sidebar'
import { GlobalHeader } from './global-header'
import { AIWorkspace } from './ai-workspace'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAIOpen] = useState(false)
  const handleAIOpen = useCallback(() => setAIOpen(true), [])
  const handleAIClose = useCallback(() => setAIOpen(false), [])

  return (
    <SidebarProvider>
      <DomainProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <GlobalHeader onAIWorkspaceOpen={handleAIOpen} />
            <Separator />
            <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
        <AIWorkspace open={aiOpen} onOpenChange={setAIOpen} />
      </DomainProvider>
    </SidebarProvider>
  )
}
