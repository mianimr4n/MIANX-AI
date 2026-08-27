'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

interface PlanData {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  currency: string
  billingCycle: string
  isSystem: boolean
  versions: {
    id: string
    features: string
    limits: string
    seatAllowance: number
    aiTokenAllowance: number
  }[]
}

// Display configuration for each plan (marketing-friendly feature labels)
const PLAN_DISPLAY: Record<string, {
  highlighted: boolean
  cta: string
  ctaHref: string
  featureLabels: Record<string, string>
}> = {
  free: {
    highlighted: false,
    cta: 'Get Started Free',
    ctaHref: '/login',
    featureLabels: {
      'domain.poultry': 'Business OS Domain',
      'module.flock-management': 'Core Modules',
      'ai.assistant': 'Basic AI Conversations',
    },
  },
  pro: {
    highlighted: true,
    cta: 'Start Pro Trial',
    ctaHref: '/login',
    featureLabels: {
      'domain.poultry': 'Business OS Domains',
      'domain.restaurant': 'Multi-Domain Support',
      'module.flock-management': 'All Modules',
      'module.feed-management': 'Feed Management',
      'module.menu-management': 'Menu Management',
      'ai.assistant': 'Advanced AI with Agents',
      'api.access': 'Full API Access',
      'automation.workflows': 'Unlimited Automations',
      'webhooks.custom': 'Custom Webhooks',
    },
  },
  enterprise: {
    highlighted: false,
    cta: 'Contact Sales',
    ctaHref: '/login',
    featureLabels: {
      'domain.poultry': 'Unlimited Domains',
      'domain.restaurant': 'All Business Domains',
      'module.flock-management': 'All Modules',
      'module.feed-management': 'Feed Management',
      'module.menu-management': 'Menu Management',
      'ai.assistant': 'Custom AI Models',
      'api.access': 'Full API Access',
      'automation.workflows': 'Unlimited Automations',
      'advanced.analytics': 'Advanced Analytics',
      'webhooks.custom': 'Custom Integrations',
    },
  },
}

// Fallback plans used when API is unavailable
const FALLBACK_PLANS: PlanData[] = [
  {
    id: 'fallback-free', name: 'Free', slug: 'free',
    description: 'For individuals and small teams getting started.',
    basePrice: 0, currency: 'USD', billingCycle: 'monthly', isSystem: true,
    versions: [{
      id: 'fv1', features: JSON.stringify([]),
      limits: JSON.stringify([]), seatAllowance: 3, aiTokenAllowance: 100000,
    }],
  },
  {
    id: 'fallback-pro', name: 'Pro', slug: 'pro',
    description: 'For growing businesses that need more power.',
    basePrice: 29, currency: 'USD', billingCycle: 'monthly', isSystem: true,
    versions: [{
      id: 'pv1', features: JSON.stringify([]),
      limits: JSON.stringify([]), seatAllowance: -1, aiTokenAllowance: 1000000,
    }],
  },
  {
    id: 'fallback-enterprise', name: 'Enterprise', slug: 'enterprise',
    description: 'For large organizations with advanced needs.',
    basePrice: 0, currency: 'USD', billingCycle: 'monthly', isSystem: true,
    versions: [{
      id: 'ev1', features: JSON.stringify([]),
      limits: JSON.stringify([]), seatAllowance: -1, aiTokenAllowance: 10000000,
    }],
  },
]

export function PricingSection() {
  const [plans, setPlans] = useState<PlanData[]>(FALLBACK_PLANS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/billing/plans?system=true')
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data) && json.data.length > 0) {
            setPlans(json.data)
          }
        }
      } catch {
        // Use fallback plans on error
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  function getFeatures(plan: PlanData): string[] {
    const config = PLAN_DISPLAY[plan.slug]
    if (config && plan.versions[0]) {
      try {
        const features: { key: string; name: string }[] = JSON.parse(plan.versions[0].features)
        // Use display labels if available, otherwise use raw names
        return features.map(f => config.featureLabels[f.key] || f.name)
      } catch {
        // Fall through to static labels
      }
    }

    // Static fallback per plan
    if (plan.slug === 'free') return ['1 Organization', 'Up to 3 team members', 'Basic AI conversations', '5 Automations', 'Community support']
    if (plan.slug === 'pro') return ['5 Organizations', 'Unlimited team members', 'Advanced AI with agents', 'Unlimited automations', 'Full integrations suite', 'Priority support', 'Custom webhooks']
    if (plan.slug === 'enterprise') return ['Unlimited organizations', 'Dedicated infrastructure', 'Custom AI models', 'SLA guarantees', 'SSO & advanced security', 'Dedicated account manager', 'Custom integrations']
    return []
  }

  function getPriceDisplay(plan: PlanData): { price: string; period: string } {
    const meta = plan.versions[0]?.limits ? (() => { try { return JSON.parse(plan.versions[0].limits) } catch { return {} } })() : {}
    const contactRequired = meta?.contactRequired || plan.slug === 'enterprise'

    if (contactRequired || (plan.basePrice === 0 && plan.slug === 'enterprise')) {
      return { price: 'Custom', period: '' }
    }
    if (plan.basePrice === 0) {
      return { price: 'Free', period: '' }
    }
    return {
      price: `$${plan.basePrice}`,
      period: `/${plan.billingCycle === 'yearly' ? 'year' : 'month'}`,
    }
  }

  if (loading) {
    return (
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground text-lg">Start free. Scale as you grow. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6 h-80" /></Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const config = PLAN_DISPLAY[plan.slug] || { highlighted: false, cta: 'Get Started', ctaHref: '/login', featureLabels: {} }
            const { price, period } = getPriceDisplay(plan)
            const features = getFeatures(plan)

            return (
              <Card
                key={plan.id}
                className={`relative ${config.highlighted ? 'border-primary shadow-lg' : ''}`}
              >
                {config.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{price}</span>
                    {period && <span className="text-muted-foreground text-sm">{period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-8"
                    variant={config.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={config.ctaHref}>
                      {config.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
