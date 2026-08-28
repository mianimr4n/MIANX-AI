'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { Users, Shield, UserPlus, Mail, Trash2, Loader2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────
type MemberData = {
  id: string
  userId: string
  organizationId: string
  status: string
  createdAt: string
  profile?: { displayName?: string; userId: string; avatarUrl?: string | null } | null
  roles?: { role: { name: string; slug: string } }[]
}

type RoleData = { id: string; name: string; slug: string; isSystem: boolean }
type TeamData = { id: string; name: string; description?: string | null; _count: { members: number }; createdAt: string }

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

// ── Invite Dialog ─────────────────────────────────────
function InviteDialog({ orgId, roles, onClose, onInvited }: {
  orgId: string; roles: RoleData[]; onClose: () => void; onInvited: () => void
}) {
  const [userId, setUserId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/invitations', {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim(), roleId: roleId || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to invite (${res.status})`)
      }
      onInvited()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Invite Member</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="invite-user-id">User ID</Label>
            <Input id="invite-user-id" value={userId} onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. user-abc-123" required />
            <p className="text-xs text-muted-foreground">The user&apos;s unique ID in the system.</p>
          </div>
          <div className="space-y-2">
            <Label>Role (optional)</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Default: Member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">Default (Member)</SelectItem>
                {roles.filter((r) => r.slug !== 'viewer').map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={sending || !userId.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              {sending ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Team Dialog ────────────────────────────────
function CreateTeamDialog({ orgId, onClose, onCreated }: {
  orgId: string; onClose: () => void; onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to create team (${res.status})`)
      }
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Create Team</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-desc">Description (optional)</Label>
            <Input id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this team do?" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────
export default function TeamPage() {
  const { activeOrganization } = useOrganization()
  const [members, setMembers] = useState<MemberData[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [teamCreateOpen, setTeamCreateOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    const orgId = activeOrganization.id
    try {
      const [memberRes, roleRes, teamRes] = await Promise.allSettled([
        orgFetch(orgId, `/api/organizations/${orgId}/members`).then((r) => r.ok ? r.json().then((j) => j?.data ?? j) : []),
        orgFetch(orgId, '/api/roles').then((r) => r.ok ? r.json().then((j) => j?.data ?? j) : []),
        orgFetch(orgId, '/api/teams').then((r) => r.ok ? r.json().then((j) => j?.data ?? j) : []),
      ])
      if (memberRes.status === 'fulfilled') setMembers(Array.isArray(memberRes.value) ? memberRes.value : [])
      if (roleRes.status === 'fulfilled') setRoles(Array.isArray(roleRes.value) ? roleRes.value : [])
      if (teamRes.status === 'fulfilled') setTeams(Array.isArray(teamRes.value) ? teamRes.value : [])
    } catch (err) {
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRemove = async (membershipId: string) => {
    if (!activeOrganization) return
    setRemoving(membershipId)
    try {
      await orgFetch(activeOrganization.id, `/api/memberships/${membershipId}`, { method: 'DELETE' })
      setMembers((prev) => prev.filter((m) => m.id !== membershipId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemoving(null)
    }
  }

  const activeMembers = members.filter((m) => m.status === 'active')
  const invitedMembers = members.filter((m) => m.status === 'invited')

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); fetchAll() }} />
  if (!activeOrganization) {
    return <EmptyState icon={Users} title="No Organization Selected" description="Select an organization to manage your team." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`Manage team members, roles, and invitations for ${activeOrganization.name}.`}
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Invite
          </Button>
        }
      />

      {inviteOpen && <InviteDialog orgId={activeOrganization.id} roles={roles} onClose={() => setInviteOpen(false)} onInvited={() => { setInviteOpen(false); fetchAll() }} />}
      {teamCreateOpen && <CreateTeamDialog orgId={activeOrganization.id} onClose={() => setTeamCreateOpen(false)} onCreated={() => { setTeamCreateOpen(false); fetchAll() }} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Active Members</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{activeMembers.length}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Pending Invitations</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{invitedMembers.length}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Teams</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{teams.length}</p>}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({activeMembers.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitedMembers.length})</TabsTrigger>
          <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Active Members</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
              ) : activeMembers.length === 0 ? (
                <EmptyState icon={Users} title="No Members" description="Invite team members to get started." />
              ) : (
                <div className="space-y-2">
                  {activeMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{member.profile?.displayName || member.userId}</span>
                          <p className="text-xs text-muted-foreground">Joined {new Date(member.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.roles?.map((r) => (
                          <Badge key={r.role.slug} variant={r.role.slug === 'owner' ? 'default' : 'outline'} className="text-xs">{r.role.name}</Badge>
                        ))}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={removing === member.id || member.roles?.some((r) => r.role.slug === 'owner')}
                          onClick={() => handleRemove(member.id)} title="Remove member">
                          {removing === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pending Invitations</CardTitle></CardHeader>
            <CardContent>
              {invitedMembers.length === 0 ? (
                <EmptyState icon={Mail} title="No Pending Invitations" description="All invitations have been accepted." />
              ) : (
                <div className="space-y-2">
                  {invitedMembers.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{inv.userId}</span>
                          <p className="text-xs text-muted-foreground">Invited {new Date(inv.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Teams</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setTeamCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Team</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : teams.length === 0 ? (
                <EmptyState icon={Shield} title="No Teams" description="Create teams to organize your members." />
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <span className="text-sm font-medium">{team.name}</span>
                        {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{team._count.members} member{team._count.members !== 1 ? 's' : ''}</span>
                        <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}