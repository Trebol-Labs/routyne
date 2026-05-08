# Routyne Documentation

This folder holds the canonical project documentation. Keep root docs small and link back here.

## Start Here

- [`status.md`](/Users/sierra/Code/routyne/docs/status.md): shipped state, roadmap health, and recent commit notes.
- [`development.md`](/Users/sierra/Code/routyne/docs/development.md): setup, environment variables, commands, and verification.
- [`architecture.md`](/Users/sierra/Code/routyne/docs/architecture.md): app structure, state, persistence, sync, coach, push, workers, parser, media, and design system.
- [`mobile.md`](/Users/sierra/Code/routyne/docs/mobile.md): Capacitor shell, Android install/test steps, native notifications, and deep-link setup.
- [`nutrition.md`](/Users/sierra/Code/routyne/docs/nutrition.md): nutrition onboarding, calculations, planner, adaptive adjustments, persistence, sync, and known boundaries.
- [`operations.md`](/Users/sierra/Code/routyne/docs/operations.md): deployment, Supabase, cron, push, sync debugging, media import, and cleanup.
- [`../AGENTS.md`](/Users/sierra/Code/routyne/AGENTS.md): shared Claude/Codex operating context.

## Documentation Rules

- Put durable project knowledge in this folder.
- Keep transient handoffs, scratch notes, screenshots, and generated reports out of version control.
- Do not duplicate the agent handbook across `AGENTS.md` and `CLAUDE.md`; `CLAUDE.md` points to `AGENTS.md`.
- When recent commits change behavior, update `status.md` and the relevant topic doc in the same change.
