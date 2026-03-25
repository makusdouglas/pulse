# Pulse — Cost Log

> Tracking Claude Code token usage and costs per session.
> Pricing: Claude Opus 4 — Input: $15/1M tokens, Output: $75/1M tokens

| Date | Task | Input Tokens | Output Tokens | Cost (USD) |
|------|------|-------------|---------------|------------|
| 2025-03-23 | Project setup, CLAUDE.md, agents config | ~30K | ~15K | ~$1.57 |
| 2025-03-23 | Design UI (6 screens desktop + mobile) | ~50K | ~25K | ~$2.63 |
| 2025-03-24 | Docker, infra, Makefile, .env | ~40K | ~20K | ~$2.10 |
| 2025-03-24 | Database schema + migrations | ~45K | ~22K | ~$2.33 |
| 2025-03-24 | Backend core (config, auth, deps, middleware) | ~55K | ~30K | ~$3.08 |
| 2025-03-25 | CSV import (parser, loader, route, tests, security) | ~120K | ~60K | ~$6.30 |

**Running total: ~$17.99**

---

*Notes:*
- Token counts are estimates based on conversation length
- Previous sessions (before tracking) are rough estimates
- Cost = (input × $15/1M) + (output × $75/1M)
