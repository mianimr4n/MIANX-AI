'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { Bot, MessageSquare, Cpu, Zap, Plus } from 'lucide-react'

export default function AIPage() {
  const { activeOrganization } = useOrganization()
  const [agents, setAgents] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrganization) {
      setLoading(false)
      return
    }
    const orgId = activeOrganization.id
    async function fetchData() {
      try {
        const headers = { 'X-Organization-Id': orgId }
        const [agentRes, convRes] = await Promise.allSettled([
          fetch('/api/ai/agents', { headers }).then((r) => r.json()),
          fetch('/api/ai/conversations', { headers }).then((r) => r.json()),
        ])
        if (agentRes.status === 'fulfilled' && agentRes.value) {
          setAgents(Array.isArray(agentRes.value) ? agentRes.value : (agentRes.value.data ?? []))
        }
        if (convRes.status === 'fulfilled' && convRes.value) {
          setConversations(Array.isArray(convRes.value) ? convRes.value : (convRes.value.data ?? []))
        }
      } catch (err) {
        setError('Failed to load AI data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization])

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Bot}
        title="No Organization Selected"
        description="Select an organization to access AI features."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        description="Conversations, agents, and AI-powered tools for your organization."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
            <CardDescription>AI chat history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{conversations.length}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Agents
            </CardTitle>
            <CardDescription>Configured AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{agents.length}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tools
            </CardTitle>
            <CardDescription>Available AI tools</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Configure tools via API</p>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No Conversations Yet"
          description="Start a conversation with the AI assistant using the chat button in the header."
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversations.slice(0, 10).map((conv: any) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{conv.title || conv.id}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {conv.status || 'active'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
