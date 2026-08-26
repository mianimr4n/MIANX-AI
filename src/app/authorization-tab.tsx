'use client'

import { motion } from 'framer-motion'
import {
  Shield, Globe, ShieldCheck, Loader2, XCircle, CheckCircle2, Play,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

type IsolationResult = {
  results: { name: string; passed: boolean; detail: string }[]
  summary: { total: number; passed: number; failed: number }
}

export default function AuthorizationTab({
  authTestResult,
  authTestLoading,
  onRunTest,
}: {
  authTestResult: IsolationResult | null
  authTestLoading: boolean
  onRunTest: () => void
}) {
  const endpoints = [
    { method: 'GET', path: '/api/me', desc: 'Current user context + orgs' },
    { method: 'GET', path: '/api/teams', desc: 'List teams (requires team.view)' },
    { method: 'POST', path: '/api/teams', desc: 'Create team (requires team.create)' },
    { method: 'GET', path: '/api/roles', desc: 'List roles + permissions' },
    { method: 'POST', path: '/api/roles', desc: 'Create custom role (admin only)' },
    { method: 'GET', path: '/api/permissions', desc: 'All permissions grouped by domain' },
    { method: 'GET', path: '/api/memberships/:id/roles', desc: "Member's role assignments" },
    { method: 'POST', path: '/api/memberships/:id/roles', desc: 'Assign role to member' },
    { method: 'GET', path: '/api/invitations', desc: 'Pending invitations' },
    { method: 'POST', path: '/api/invitations', desc: 'Invite user to org' },
    { method: 'PATCH', path: '/api/invitations/:id', desc: 'Accept/reject invitation' },
    { method: 'POST', path: '/api/test/authorization', desc: 'Run 8 security tests' },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            RBAC Authorization Engine
          </CardTitle>
          <CardDescription>Fail-closed: any missing auth = automatic denial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Auth Chain', desc: 'Auth \u2192 Membership \u2192 Role \u2192 Permission \u2192 Action', color: 'from-blue-500/10 to-indigo-500/10' },
              { title: 'Permission Format', desc: 'domain.resource.action (3-part) or resource.action (2-part)', color: 'from-purple-500/10 to-pink-500/10' },
              { title: 'System Roles', desc: 'Owner (wildcard) \u2192 Admin \u2192 Member \u2192 Viewer', color: 'from-emerald-500/10 to-teal-500/10' },
              { title: 'Dev Mode', desc: 'X-Dev-Org-Id header for local development', color: 'from-amber-500/10 to-orange-500/10' },
            ].map(item => (
              <div key={item.title} className={`p-3 rounded-lg border border-border/50 bg-gradient-to-br ${item.color}`}>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Phase 2 API Endpoints
          </CardTitle>
          <CardDescription>All 18 routes protected with withAuth() middleware</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {endpoints.map(ep => (
              <div key={ep.method + ep.path} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <Badge variant="outline" className="text-[10px] font-mono w-12 justify-center shrink-0">
                  {ep.method}
                </Badge>
                <code className="text-xs font-mono text-foreground/80 flex-1 truncate">{ep.path}</code>
                <span className="text-[11px] text-muted-foreground hidden sm:inline truncate max-w-[200px]">{ep.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Authorization Test Suite
              </CardTitle>
              <CardDescription>8 automated security tests</CardDescription>
            </div>
            <Button size="sm" onClick={onRunTest} disabled={authTestLoading} className="gap-1.5">
              {authTestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {authTestLoading ? 'Running...' : 'Run Tests'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!authTestResult ? (
            <p className="text-sm text-muted-foreground text-center py-6">Click \"Run Tests\" to execute the authorization test suite</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className={authTestResult.summary.failed === 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {authTestResult.summary.passed}/{authTestResult.summary.total} passed
                </span>
                <Progress value={(authTestResult.summary.passed / authTestResult.summary.total) * 100} className="h-1.5 flex-1" />
              </div>
              {authTestResult.results.map((test, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50"
                >
                  {test.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{test.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{test.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
