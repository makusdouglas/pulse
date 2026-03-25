You are the workflow orchestrator for Pulse. Your job is to execute a task from TODO.md by routing it through the correct agents in sequence.

## Task
$ARGUMENTS

## Instructions

### Step 1 — Identify the task
Locate the task in TODO.md. If there is no exact match, ask the user which task they want to execute.

### Step 2 — Classify and build the pipeline
Based on the task content, classify it into one or more categories and build the agent pipeline in the correct order:

| Category | Keywords in task | Agent pipeline |
|---|---|---|
| Database | schema.sql, migrations, hypertable, seed | `/db` → `/test` → `/arch` |
| API endpoint | routes/, endpoint, GET, POST, config.py, auth.py, main.py, database.py | `/api` → `/test` → `/security` → `/arch` |
| Scoring engine | scoring/, rules.py, features.py, calcular_score | `/score` → `/test` → `/arch` |
| Celery jobs | tasks/, celery, job, beat, worker | `/tasks` → `/test` → `/arch` |
| CSV import | importacao/, parser, loader, CSV, upload | `/import` → `/test` → `/security` → `/arch` |
| Frontend | frontend/, screen, component, layout, sidebar | `/frontend` → `/test` → `/arch` |
| Infra/DevOps | docker, Dockerfile, .env, Makefile, .gitignore, requirements, pyproject | `/devops` → `/arch` |
| ML | ml/, dataset, train, SHAP, retrain | `/ml` → `/test` → `/arch` |
| Security audit | security, audit, rate limit, IDOR | `/security` → `/test` |

If the task spans multiple categories, combine pipelines and remove duplicates. The `/arch` agent always runs last as reviewer.

### Step 3 — Execute the pipeline
For each agent in the pipeline:

1. **Before calling the agent**, inform the user which agent will run and what it will do:
   ```
   [1/3] /db — Create schema.sql with the project's 7 tables
   ```

2. **Call the corresponding skill** passing the task description as argument.

3. **After the agent finishes**, provide a short summary of what was done:
   ```
   ✓ /db — Created schema.sql with 7 tables, indexes, and hypertable on checkins
   ```

4. **If the agent reports an error or blocker**, inform the user and ask how to proceed before continuing.

5. **Move to the next agent** in the pipeline.

### Step 4 — Update TODO.md
After all agents in the pipeline complete successfully:
1. Mark the task as done in TODO.md (change `- [ ]` to `- [x]`)
2. Move the task from its current section to the DONE section

### Step 5 — Final summary
Present a summary of the executed workflow:
```
## Workflow complete

Task: [task description]
Pipeline: /db → /test → /arch

| Agent | Status | Summary |
|-------|--------|---------|
| /db | ✓ | Created schema.sql |
| /test | ✓ | 12 tests passing |
| /arch | ✓ | No issues found |
```

## Rules
- NEVER skip the `/test` agent when it's in the pipeline — tests are mandatory
- NEVER skip the `/arch` agent — architecture review is mandatory
- If the task depends on another task that hasn't been done yet (e.g., API needs the schema), inform the user and suggest executing the dependency first
- If the user passes more than one task, execute each as a separate workflow in sequence
- Read CLAUDE.md and TODO.md at the start for full context
