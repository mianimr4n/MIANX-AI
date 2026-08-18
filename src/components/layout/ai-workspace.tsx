'use client'

import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Sparkles, Loader2, CheckCircle2, AlertCircle, Clock, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolCalls?: { name: string; status: 'running' | 'completed' | 'failed' }[]
  isAction?: boolean
  actionStatus?: 'proposed' | 'approved' | 'executing' | 'completed' | 'failed'
}

type ToolStatus = 'thinking' | 'retrieving' | 'running' | 'waiting_approval' | 'executing' | 'completed' | 'failed'

interface AIWorkspaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const toolStatusConfig: Record<ToolStatus, { icon: React.ElementType; label: string; color: string }> = {
  thinking: { icon: Sparkles, label: 'Thinking', color: 'text-muted-foreground' },
  retrieving: { icon: Loader2, label: 'Retrieving data', color: 'text-info' },
  running: { icon: Play, label: 'Running analysis', color: 'text-info' },
  waiting_approval: { icon: Clock, label: 'Waiting for approval', color: 'text-warning' },
  executing: { icon: Loader2, label: 'Executing action', color: 'text-info' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-success' },
  failed: { icon: AlertCircle, label: 'Failed', color: 'text-destructive' },
}

export function AIWorkspace({ open, onOpenChange }: AIWorkspaceProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentToolStatus, setCurrentToolStatus] = useState<ToolStatus | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentToolStatus])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)
    setCurrentToolStatus('thinking')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      })
      setCurrentToolStatus('retrieving')
      const data = await res.json()
      setCurrentToolStatus('completed')

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.content || 'I processed your request successfully.',
        timestamp: new Date().toISOString(),
        toolCalls: data.toolCalls,
        isAction: data.isAction,
        actionStatus: data.actionStatus,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setCurrentToolStatus('failed')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsProcessing(false)
      setTimeout(() => setCurrentToolStatus(null), 1500)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" side="right">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Context bar */}
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" className="h-5 text-xs font-normal">Org: Active</Badge>
          <Badge variant="outline" className="h-5 text-xs font-normal">Domain: Active</Badge>
          {currentToolStatus && (() => {
            const cfg = toolStatusConfig[currentToolStatus]
            const StatusIcon = cfg.icon
            return (
              <Badge variant="outline" className={cn('h-5 text-xs font-normal gap-1', cfg.color)}>
                <StatusIcon className={cn('h-3 w-3', currentToolStatus === 'thinking' && 'animate-spin', (currentToolStatus === 'retrieving' || currentToolStatus === 'executing') && 'animate-pulse')} />
                {cfg.label}
              </Badge>
            )
          })()}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-h3 mb-2">AI Assistant</h3>
              <p className="text-body text-muted-foreground max-w-xs">
                Ask me anything about your organization, domains, or data. I can analyze, suggest, and take actions on your behalf.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn('text-xs', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {msg.role === 'user' ? 'U' : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={cn('flex flex-col gap-1 max-w-[85%]', msg.role === 'user' && 'items-end')}>
                <div className={cn('rounded-lg px-3 py-2 text-body', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {msg.content}
                </div>
                {/* Tool calls */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.toolCalls.map((tc, i) => (
                      <Badge key={i} variant="outline" className="h-5 text-xs font-normal">
                        {tc.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {tc.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1 text-success" />}
                        {tc.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1 text-destructive" />}
                        {tc.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Action approval UI */}
                {msg.isAction && msg.actionStatus && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={msg.actionStatus === 'completed' ? 'default' : 'outline'} className="h-5 text-xs">
                      {msg.actionStatus === 'proposed' && 'Action Proposed'}
                      {msg.actionStatus === 'approved' && 'Approved'}
                      {msg.actionStatus === 'executing' && 'Executing...'}
                      {msg.actionStatus === 'completed' && 'Executed'}
                      {msg.actionStatus === 'failed' && 'Failed'}
                    </Badge>
                    {msg.actionStatus === 'proposed' && (
                      <>
                        <Button size="sm" className="h-6 text-xs">Approve</Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs">Reject</Button>
                      </>
                    )}
                  </div>
                )}
                <span className="text-caption text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isProcessing && !currentToolStatus && (
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating response...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI assistant..."
              className="flex-1"
              disabled={isProcessing}
              aria-label="Message input"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isProcessing} aria-label="Send message">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
