'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity, Bot, Workflow, Globe, Shield, BarChart3, Users, CreditCard,
  Building2, ArrowRight, CheckCircle2, ChevronDown, Zap, Lock, Blocks,
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
]

const FEATURES = [
  {
    icon: Bot,
    title: 'AI-Powered Operations',
    description: 'Integrate AI assistants, agents, and tools directly into your business workflows. Multi-provider support with streaming responses and conversation history.',
  },
  {
    icon: Workflow,
    title: 'Workflow Automation',
    description: 'Build, schedule, and monitor automated workflows. Event-driven triggers with real-time job execution, retry logic, and comprehensive logging.',
  },
  {
    icon: Globe,
    title: 'Seamless Integrations',
    description: 'Connect your tools with secure API keys, webhooks, and OAuth connections. Real-time event delivery with full audit trails.',
  },
  {
    icon: Building2,
    title: 'Multi-Tenant Architecture',
    description: 'Isolated workspaces for every organization. Role-based access control, team management, and enterprise-grade security.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Observability',
    description: 'Track every action with comprehensive audit logs. Monitor system health, SLOs, and AI usage with real-time dashboards.',
  },
  {
    icon: CreditCard,
    title: 'Billing & Usage Metering',
    description: 'Built-in subscription management with plan-based feature gating, usage tracking, and invoice generation.',
  },
]

const SOLUTIONS = [
  {
    title: 'Business Operations',
    description: 'Manage your entire business from a single dashboard. Track operations, manage teams, and monitor performance.',
    icon: Building2,
  },
  {
    title: 'AI & Automation',
    description: 'Deploy AI agents and automate repetitive tasks. From customer support to data processing, let AI handle the heavy lifting.',
    icon: Zap,
  },
  {
    title: 'SaaS Platform Building',
    description: 'Use Mianx.ai as your foundation to build domain-specific SaaS products. Multi-tenant, multi-domain by design.',
    icon: Blocks,
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For individuals and small teams getting started.',
    features: ['1 Organization', 'Up to 3 team members', 'Basic AI conversations', '5 Automations', 'Community support'],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing businesses that need more power.',
    features: ['5 Organizations', 'Unlimited team members', 'Advanced AI with agents', 'Unlimited automations', 'Full integrations suite', 'Priority support', 'Custom webhooks'],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with advanced needs.',
    features: ['Unlimited organizations', 'Dedicated infrastructure', 'Custom AI models', 'SLA guarantees', 'SSO & advanced security', 'Dedicated account manager', 'Custom integrations'],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const FAQ_ITEMS = [
  {
    question: 'What is Mianx.ai?',
    answer: 'Mianx.ai is an AI-native business operating system that helps businesses build, automate, and operate intelligent digital systems. It combines AI capabilities, workflow automation, integrations, and scalable SaaS infrastructure into a single platform.',
  },
  {
    question: 'How does the multi-tenant architecture work?',
    answer: 'Each organization gets a fully isolated workspace with its own data, team members, and configuration. Role-based access control ensures that users only see and access what they are authorized to, with full audit logging of all actions.',
  },
  {
    question: 'Can I use my own AI providers?',
    answer: 'Yes. Mianx.ai supports a provider-agnostic AI architecture. You can configure OpenAI, Anthropic, or other compatible AI providers through your organization settings. The platform handles routing, streaming, and conversation management.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use PostgreSQL with row-level security, encrypted connections, and strict tenant isolation. All API requests require authentication and organization-scoped authorization. We maintain comprehensive audit logs and support enterprise security features like SSO.',
  },
  {
    question: 'Can I build my own SaaS product on top of Mianx.ai?',
    answer: 'Yes. Mianx.ai is designed as a platform for building domain-specific business operating systems. The multi-domain architecture lets you create and manage different business domains, each with their own modules, workflows, and configurations.',
  },
  {
    question: 'What happens when I exceed my plan limits?',
    answer: 'You will receive notifications as you approach your limits. If you exceed them, existing functionality continues to work, but you will be prompted to upgrade. You can upgrade or downgrade your plan at any time from your billing settings.',
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg">
      <button
        className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">Mianx.ai</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Zap className="h-3.5 w-3.5" />
              AI-Native Business Operating System
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Build, Automate & Operate
              <span className="block text-primary mt-2">Intelligent Business Systems</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Mianx.ai helps businesses build, automate and operate intelligent digital systems using AI, workflows, integrations and scalable SaaS infrastructure.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <a href="#features">
                  See How It Works
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Free plan available.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything You Need to Operate</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              A complete platform that combines AI, automation, integrations, and enterprise-grade infrastructure.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ── */}
      <section id="solutions" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Built for How You Work</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Whether you are running operations, automating processes, or building SaaS products.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SOLUTIONS.map((solution) => (
              <div key={solution.title} className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
                  <solution.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-3">{solution.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security / Reliability ── */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Enterprise-Grade Security</h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Your data is protected by industry-standard security measures, from encrypted connections to strict tenant isolation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Lock, title: 'Encrypted Data', desc: 'All data encrypted at rest and in transit' },
                { icon: Shield, title: 'RBAC', desc: 'Role-based access control with granular permissions' },
                { icon: Users, title: 'Tenant Isolation', desc: 'Complete data isolation per organization' },
                { icon: BarChart3, title: 'Audit Logging', desc: 'Full audit trail of every action' },
              ].map((item) => (
                <Card key={item.title} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <item.icon className="h-5 w-5 text-primary mb-2" />
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Modules ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Complete Module Suite</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Every module you need, already integrated and working together.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'AI Assistant', icon: Bot },
              { name: 'Automations', icon: Workflow },
              { name: 'Integrations', icon: Globe },
              { name: 'Team Management', icon: Users },
              { name: 'Billing', icon: CreditCard },
              { name: 'Analytics', icon: BarChart3 },
              { name: 'Domains', icon: Blocks },
              { name: 'Settings', icon: Shield },
            ].map((mod) => (
              <div
                key={mod.name}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <mod.icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{mod.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-8"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={plan.name === 'Enterprise' ? '/login' : '/signup'}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Get Started?</h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
            Join businesses already using Mianx.ai to automate operations and build intelligent systems.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <span className="font-semibold">Mianx.ai</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-Native Business Operating System.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground transition-colors">Log in</Link></li>
                <li><Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">Privacy Policy</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
            Mianx.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
