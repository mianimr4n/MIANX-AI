'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { Users, Shield, UserPlus, Mail } from 'lucide-react'

type MemberData = {
  id: string
  userId: string
  organizationId: string
  status: string
  role?: string
  createdAt: string
}

type InvitationData = {
  id: string
  email: string
  status: string
  createdAt: string
}

export default function TeamPage() {
  const { activeOrganization } = useOrganization()
  const [members, setMembers] = useState<MemberData[]>([])
  const [invitations, setInvitations] = useState<InvitationData[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!activeOrganization) {
      setLoading(false)
      return
    }
    const orgId = activeOrganization.id
    async function fetchData() {
      try {
        const headers = { 'X-Organization-Id': orgId }
        const [memberRes, inviteRes, teamRes] = await Promise.allSettled([
          fetch('/api/organizations/' + orgId + '/members', { headers }).then((r) => r.json()),
          fetch('/api/invitations', { headers }).then((r) => r.json()),
          fetch('/api/teams', { headers }).then((r) => r.json()),
        ])
        if (memberRes.status === 'fulfilled' && memberRes.value) {
          setMembers(Array.isArray(memberRes.value) ? memberRes.value : (memberRes.value.data ?? []))
        }
        if (inviteRes.status === 'fulfilled' && inviteRes.value) {
          setInvitations(Array.isArray(inviteRes.value) ? inviteRes.value : (inviteRes.value.data ?? []))
        }
        if (teamRes.status === 'fulfilled' && teamRes.value) {
          setTeams(Array.isArray(teamRes.value) ? teamRes.value : (teamRes.value.data ?? []))
        }
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrganization || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': activeOrganization.id,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'member' }),
      })
      if (res.ok) {
        setInviteEmail('')
        setInviteOpen(false)
        window.location.reload()
      }
    } catch {
      // Silent
    } finally {
      setInviting(false)
    }
  }

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Users}
        title="No Organization Selected"
        description="Select an organization to manage your team."
      />
    )
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

      {inviteOpen && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <Button type="submit" disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{members.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{teams.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{invitations.filter((i) => i.status === 'pending').length}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Team Members"
          description="Invite team members to collaborate on this organization."
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{member.userId}</span>
                      <p className="text-xs text-muted-foreground">Joined {new Date(member.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{member.role || 'member'}</Badge>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">{member.status}</Badge>
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
