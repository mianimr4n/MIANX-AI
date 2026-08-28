'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Workflow, Play, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, Trash2, RotateCcw
} from 'lucide-react'

interface WorkflowItem {
  id: string
  name: string
  slug: string
  description?: string
  status: string
  triggerType?: string
  createdAt: string
  updatedAt: string
  steps?: any[]
}

interface JobItem {
  id: string
  type: string
  status: string
  priority?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export default function AutomationsPage() {
  const { activeOrganization } = useOrganization()
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState<string | null>(null)

  // Create workflow dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '', triggerType: 'event' })
  const [creating, setCreating] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkflowItem | null>(null)

  const orgFetch = useCallback((url: string, options?: RequestInit) => {
    if (!activeOrganization) throw new Error('No organization selected')
    return fetch(url, {
      ...options,
      headers: { 'X-Organization-Id': activeOrganization.id, ...options?.headers },
    })
  }, [activeOrganization])

  const fetchWorkflows = useCallback(async () => {
    if (!activeOrganization) return
    try {
      const [wfRes, jobRes] = await Promise.allSettled([
        orgFetch('/api/workflows').then(r => r.json()),
        orgFetch('/api/jobs?limit=20').then(r => r.json()),
      ])
      if (wfRes.status === 'fulfilled' && wfRes.value) {
        const d = wfRes.value.data ?? wfRes.value
        setWorkflows(Array.isArray(d) ? d : [])
      }
      if (jobRes.status === 'fulfilled' && jobRes.value) {
        const d = jobRes.value.data ?? jobRes.value
        setJobs(Array.isArray(d) ? d : [])
      }
      setError(null)
    } catch (err) {
      setError('Failed to load automations data')
    }
  }, [activeOrganization, orgFetch])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate early-exit: no org selected, nothing to load
    if (!activeOrganization) { setLoading(false); return }
    fetchWorkflows().finally(() => setLoading(false))
  }, [activeOrganization, fetchWorkflows])

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'running': return <Play className="h-4 w-4 text-blue-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }
    setCreating(true)
    try {
      const slug = createForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const res = await orgFetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug,
          description: createForm.description.trim() || undefined,
          triggerType: createForm.triggerType,
          triggerConfig: { type: createForm.triggerType },
          steps: [{ id: 'step-1', name: 'First Step', type: 'action', config: {} }],
        }),
      }).then(r => r.json())
      if (res.data) {
        toast.success('Workflow created')
        setCreateOpen(false)
        setCreateForm({ name: '', slug: '', description: '', triggerType: 'event' })
        fetchWorkflows()
      } else {
        toast.error(res.error || 'Failed to create workflow')
      }
    } catch {
      toast.error('Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (wf: WorkflowItem) => {
    const newStatus = wf.status === 'active' ? 'disabled' : 'active'
    setMutating(wf.id)
    try {
      const res = await orgFetch(`/api/workflows/${wf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => r.json())
      if (res.data) {
        toast.success(`Workflow ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
        setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, status: newStatus } : w))
      } else {
        toast.error(res.error || 'Failed to update workflow')
      }
    } catch {
      toast.error('Failed to update workflow')
    } finally {
      setMutating(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setMutating(deleteTarget.id)
    try {
      const res = await orgFetch(`/api/workflows/${deleteTarget.id}`, { method: 'DELETE' }).then(r => r.json())
      toast.success('Workflow archived')
      setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to archive workflow')
    } finally {
      setMutating(null)
    }
  }

  const handleRun = async (wf: WorkflowItem) => {
    setMutating(wf.id)
    try {
      const res = await orgFetch(`/api/workflows/${wf.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(r => r.json())
      if (res.data) {
        toast.success('Workflow triggered')
        fetchWorkflows()
      } else {
        toast.error(res.error || 'Failed to run workflow')
      }
    } catch {
      toast.error('Failed to run workflow')
    } finally {
      setMutating(null)
    }
  }

  const handleRetryJob = async (jobId: string) => {
    setMutating(jobId)
    try {
      const res = await orgFetch(`/api/jobs/${jobId}/retry`, { method: 'POST' }).then(r => r.json())
      if (res.data) {
        toast.success('Job retried')
        fetchWorkflows()
      } else {
        toast.error(res.error || 'Failed to retry job')
      }
    } catch {
      toast.error('Failed to retry job')
    } finally {
      setMutating(null)
    }
  }

  if (!activeOrganization) {
    return <EmptyState icon={Workflow} title="No Organization Selected" description="Select an organization to manage automations." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Automations" description="Workflows, jobs, and event-driven automation." />
        <ErrorState message={error} onRetry={fetchWorkflows} />
      </div>
    )
  }

  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending').length
  const completedJobs = jobs.filter(j => j.status === 'completed').length
  const failedJobs = jobs.filter(j => j.status === 'failed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Workflows, jobs, and event-driven automation for your organization."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={loading}><Plus className="h-4 w-4 mr-1" /> New Workflow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workflow</DialogTitle>
                <DialogDescription>Define a new automation workflow for your organization.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="e.g. Onboard New Customer"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug *</label>
                  <Input
                    placeholder="e.g. onboard-customer"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm(f => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="What does this workflow do?"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trigger Type</label>
                  <Select value={createForm.triggerType} onValueChange={(v) => setCreateForm(f => ({ ...f, triggerType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !createForm.name.trim() || !createForm.slug.trim()}>
                  {creating ? 'Creating...' : 'Create Workflow'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" /> Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{workflows.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4" /> Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{activeJobs}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{completedJobs}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{failedJobs}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : workflows.length === 0 && jobs.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No Automations Yet"
          description="Create workflows to automate business processes."
          action={{
            label: 'New Workflow',
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (
        <>
          {workflows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflows.slice(0, 20).map((wf) => (
                    <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{wf.name || wf.id}</span>
                          <div className="flex items-center gap-2">
                            {wf.description && <span className="text-xs text-muted-foreground truncate max-w-xs">{wf.description}</span>}
                            {wf.triggerType && <Badge variant="outline" className="text-xs">{wf.triggerType}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={wf.status === 'active' ? 'default' : 'outline'} className="text-xs">{wf.status}</Badge>
                        <Switch
                          checked={wf.status === 'active'}
                          disabled={mutating === wf.id}
                          onCheckedChange={() => handleToggleStatus(wf)}
                        />
                        <Button
                          variant="ghost" size="sm"
                          disabled={mutating === wf.id || wf.status !== 'active'}
                          onClick={() => handleRun(wf)}
                          title="Run now"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={mutating === wf.id}
                          onClick={() => setDeleteTarget(wf)}
                          title="Archive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {jobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobs.slice(0, 10).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        {statusIcon(job.status)}
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{job.type}</span>
                          <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{job.status}</Badge>
                        {job.status === 'failed' && (
                          <Button
                            variant="ghost" size="sm"
                            disabled={mutating === job.id}
                            onClick={() => handleRetryJob(job.id)}
                            title="Retry"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Workflow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive &quot;{deleteTarget?.name}&quot;? This will disable the workflow. You can re-enable it later by changing its status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={mutating !== null} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}
