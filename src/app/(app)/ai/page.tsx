'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Bot, MessageSquare, Cpu, Zap, Plus, Send, ArrowLeft,
  AlertTriangle, CheckCircle2, X,
} from 'lucide-react'

interface Conversation {
  id: string
  title?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

interface ModelInfo {
  id: string
  provider: string
  displayName: string
  tier: string
  capabilities: string[]
}

interface ToolInfo {
  name: string
  description: string
  requiredPermission: string | null
  accessible: boolean
}

export default function AIPage() {
  const { activeOrganization } = useOrganization()
  const [agents, setAgents] = useState<any[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [toolSummary, setToolSummary] = useState<{ total: number; accessible: number; restricted: number } | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chat state
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [providerUnavailable, setProviderUnavailable] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const orgFetch = useCallback((url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      headers: { 'X-Organization-Id': activeOrganization!.id, ...options?.headers },
    })
  }, [activeOrganization])

  const unwrap = useCallback((res: any) => {
    if (res?.data !== undefined) return res.data
    if (Array.isArray(res)) return res
    return res ?? []
  }, [])

  useEffect(() => {
    if (!activeOrganization) { setLoading(false); return }
    const orgId = activeOrganization.id
    const controller = new AbortController()
    async function fetchData() {
      try {
        const headers = { 'X-Organization-Id': orgId }
        const [agentRes, convRes, toolRes, modelRes] = await Promise.allSettled([
          fetch('/api/ai/agents', { headers, signal: controller.signal }).then(r => r.json()),
          fetch('/api/ai/conversations', { headers, signal: controller.signal }).then(r => r.json()),
          fetch('/api/ai/tools', { headers, signal: controller.signal }).then(r => r.json()),
          fetch('/api/ai/models', { headers, signal: controller.signal }).then(r => r.json()),
        ])
        if (agentRes.status === 'fulfilled' && agentRes.value)
          setAgents(Array.isArray(agentRes.value) ? agentRes.value : (agentRes.value.data ?? []))
        if (convRes.status === 'fulfilled' && convRes.value)
          setConversations(Array.isArray(convRes.value) ? convRes.value : (convRes.value.data ?? []))
        if (toolRes.status === 'fulfilled' && toolRes.value?.data) {
          setTools(toolRes.value.data.tools ?? [])
          setToolSummary(toolRes.value.data.summary ?? null)
        }
        if (modelRes.status === 'fulfilled' && modelRes.value?.data) {
          setModels(modelRes.value.data.models ?? [])
          setConfiguredProviders(modelRes.value.data.configuredProviders ?? [])
          if ((modelRes.value.data.configuredProviders ?? []).length === 0) {
            setProviderUnavailable(true)
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('Failed to load AI data')
      } finally { setLoading(false) }
    }
    fetchData()
    return () => controller.abort()
  }, [activeOrganization])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const createConversation = async () => {
    if (!activeOrganization) return
    try {
      const res = await orgFetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      }).then(r => r.json())
      const conv = res?.data ?? res
      if (conv?.id) {
        setConversations(prev => [conv, ...prev])
        setActiveConv(conv)
        setMessages([])
      } else {
        toast.error(res?.error || 'Failed to create conversation')
      }
    } catch {
      toast.error('Failed to create conversation')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !activeOrganization) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setSending(true)

    try {
      const res = await orgFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          conversationId: activeConv?.id,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 503) {
          setProviderUnavailable(true)
          setMessages(prev => [...prev, { role: 'assistant', content: 'AI is currently unavailable. No providers are configured. Please contact your administrator to set up an AI provider (OpenAI, Anthropic, or Google).' }])
        } else if (res.status === 429) {
          setMessages(prev => [...prev, { role: 'assistant', content: errData?.error || 'Monthly token budget exceeded. Contact your organization admin.' }])
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: errData?.error || 'Failed to get response. Please try again.' }])
        }
        return
      }

      // Streaming response
      const convId = res.headers.get('X-Conversation-Id')
      if (convId && !activeConv) {
        const newConv: Conversation = { id: convId, title: userMsg.slice(0, 60), status: 'active' }
        setConversations(prev => [newConv, ...prev])
        setActiveConv(newConv)
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to read response stream.' }])
        return
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please check your connection and try again.' }])
    } finally {
      setSending(false)
    }
  }

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv)
    setMessages([])
    // We don't load historical messages since there's no GET /api/ai/conversations/:id/messages endpoint
  }

  const deleteConversation = async (convId: string) => {
    if (!activeOrganization) return
    try {
      const res = await orgFetch('/api/ai/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId }),
      }).then(r => r.json())
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (activeConv?.id === convId) {
        setActiveConv(null)
        setMessages([])
      }
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  if (!activeOrganization) {
    return (
      <EmptyState icon={Bot} title="No Organization Selected" description="Select an organization to access AI features." />
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI" description="Conversations, agents, and AI-powered tools." />
        <EmptyState icon={AlertTriangle} title="Error Loading AI Data" description={error} />
      </div>
    )
  }

  // Chat view
  if (activeConv) {
    return (
      <div className="space-y-4 h-[calc(100vh-12rem)] flex flex-col">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveConv(null); setMessages([]) }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium truncate">{activeConv.title || 'Conversation'}</h2>
            <p className="text-xs text-muted-foreground">{activeConv.id}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteConversation(activeConv.id)}>
            Delete
          </Button>
        </div>

        {providerUnavailable && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No AI provider configured. Contact your admin to set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.</span>
          </div>
        )}

        <ScrollArea className="flex-1 rounded-lg border p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Start a conversation by typing a message below.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content || '...'}
                    </pre>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); sendMessage() }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || providerUnavailable}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !input.trim() || providerUnavailable}>
            {sending ? <span className="animate-pulse">Thinking...</span> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        description="Conversations, agents, and AI-powered tools for your organization."
        actions={
          <Button size="sm" onClick={createConversation} disabled={loading}>
            <Plus className="h-4 w-4 mr-1" /> New Conversation
          </Button>
        }
      />

      {providerUnavailable && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>No AI providers configured. Chat is unavailable until an admin sets up an API key for OpenAI, Anthropic, or Google.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{conversations.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{agents.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="space-y-1">
                <p className="text-2xl font-bold">{toolSummary?.accessible ?? 0}<span className="text-sm font-normal text-muted-foreground">/{toolSummary?.total ?? 0}</span></p>
                {toolSummary && toolSummary.restricted > 0 && (
                  <p className="text-xs text-muted-foreground">{toolSummary.restricted} restricted</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : configuredProviders.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {configuredProviders.map((p: any) => (
                  <Badge key={p.provider} variant="secondary" className="text-xs">{p.provider} ({p.modelCount})</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-destructive">None configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No Conversations Yet"
          description={providerUnavailable
            ? 'Configure an AI provider to start chatting.'
            : 'Start a new conversation to interact with AI.'}
          action={!providerUnavailable ? {
            label: 'New Conversation',
            onClick: createConversation,
          } : undefined}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversations.slice(0, 20).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openConversation(conv)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{conv.title || conv.id}</span>
                      {conv.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{conv.status || 'active'}</Badge>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
