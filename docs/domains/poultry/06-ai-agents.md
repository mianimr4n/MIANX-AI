# Poultry OS - AI Agents

4 domain-specific AI agents registered in the Poultry OS agent registry.

---

## 1. Flock Manager

| Property | Value |
|----------|-------|
| **Slug** | `poultry-flock-manager` |
| **Icon** | Bird |
| **Model** | gpt-4o-mini (OpenAI) |
| **Temperature** | 0.4 |
| **Max Tokens** | 4096 |

### System Prompt Summary

Monitors flock health, tracks mortality, and provides recommendations for flock management. Rules:
- Always use tools to get real data before making recommendations
- Alert on mortality rates above 5% for any flock
- Suggest veterinary consultation when mortality causes are unknown
- Be specific with numbers and dates from the data
- Respond in the same language the user writes in

### Tools

| Tool | Permission |
|------|-----------|
| `list_poultry_flocks` | poultry.flock.view |
| `get_flock_metrics` | poultry.flock.view |
| `get_mortality_trends` | poultry.health.view |
| `get_health_records` | poultry.health.view |

### Primary Use Cases
- "How is my Cobb 500 flock doing?"
- "Which flocks have high mortality?"
- "Show me the latest health records for flock X"

---

## 2. Feed Optimizer

| Property | Value |
|----------|-------|
| **Slug** | `poultry-feed-optimizer` |
| **Icon** | Wheat |
| **Model** | gpt-4o-mini (OpenAI) |
| **Temperature** | 0.3 |
| **Max Tokens** | 4096 |

### System Prompt Summary

Analyzes feed consumption patterns, conversion ratios, and costs. Recommends feed optimization strategies. Rules:
- Compare FCR against industry benchmarks (broiler target: 1.6-1.8, layer target: 2.0-2.5)
- Flag when feed cost per kg is significantly above average
- Consider flock age and breed when making recommendations
- Provide actionable, cost-saving suggestions

### Tools

| Tool | Permission |
|------|-----------|
| `list_poultry_flocks` | poultry.flock.view |
| `get_flock_metrics` | poultry.flock.view |
| `get_feed_usage` | poultry.feed.view |
| `get_production_data` | poultry.production.view |

### Primary Use Cases
- "How can I reduce feed costs for my broiler flocks?"
- "What is the FCR for flock X?"
- "Which flock has the best feed efficiency?"

---

## 3. Health Monitor

| Property | Value |
|----------|-------|
| **Slug** | `poultry-health-monitor` |
| **Icon** | HeartPulse |
| **Model** | claude-sonnet-4-20250514 (Anthropic) |
| **Temperature** | 0.3 |
| **Max Tokens** | 4096 |

### System Prompt Summary

Tracks vaccinations, treatments, and mortality patterns. Provides health alerts and veterinary scheduling recommendations. Rules:
- Flag any mortality spike (>2% in a single day) as urgent
- Check vaccination schedule compliance
- Recommend isolation procedures when contagious diseases are detected
- Track treatment costs and outcomes

### Tools

| Tool | Permission |
|------|-----------|
| `list_poultry_flocks` | poultry.flock.view |
| `get_flock_metrics` | poultry.flock.view |
| `get_mortality_trends` | poultry.health.view |
| `get_health_records` | poultry.health.view |
| `list_poultry_farms` | poultry.farm.view |

### Primary Use Cases
- "Are any flocks showing health alerts?"
- "What vaccinations are overdue?"
- "Analyze the mortality pattern for flock X"

---

## 4. Sales Analyst

| Property | Value |
|----------|-------|
| **Slug** | `poultry-sales-analyst` |
| **Icon** | TrendingUp |
| **Model** | gpt-4o-mini (OpenAI) |
| **Temperature** | 0.5 |
| **Max Tokens** | 4096 |

### System Prompt Summary

Analyzes sales data, revenue trends, and customer patterns. Provides demand forecasting and pricing insights. Rules:
- Compare current period revenue against previous periods
- Calculate average selling price per kg/egg
- Identify seasonal patterns in sales data
- Recommend pricing strategies based on market conditions

### Tools

| Tool | Permission |
|------|-----------|
| `get_sales_data` | poultry.sale.view |
| `get_production_data` | poultry.production.view |
| `list_poultry_flocks` | poultry.flock.view |

### Primary Use Cases
- "What were our sales last month?"
- "Who are our top customers?"
- "How much revenue can we expect this quarter?"

---

## Agent-Tool Matrix

| Tool | Flock Manager | Feed Optimizer | Health Monitor | Sales Analyst |
|------|:---:|:---:|:---:|:---:|
| `list_poultry_farms` | | | X | |
| `list_poultry_flocks` | X | X | X | X |
| `get_flock_metrics` | X | X | X | |
| `get_mortality_trends` | X | | X | |
| `get_health_records` | X | | X | |
| `get_feed_usage` | | X | | |
| `get_production_data` | | X | | X |
| `get_sales_data` | | | | X |