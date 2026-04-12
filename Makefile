.PHONY: up down dev dev-infra test lint migrate seed logs dev-api-v2 test-v2 build-v2 lint-v2

# Subir tudo (Docker)
up:
	docker compose up

# Subir tudo (Docker) no mode detached
up-d:
	docker compose up -d

# Derrubar tudo
down:
	docker compose down

# Dev leve: so infra no Docker, apps locais
dev-infra:
	docker compose up -d db redis

# Dev backend (rodar apos dev-infra)
dev-api:
	cd backend && uvicorn api.main:app --reload

# Dev worker (rodar apos dev-infra)
dev-worker:
	cd backend && celery -A tasks.celery_app worker --beat --loglevel=info

# Dev backend_v2 NestJS (rodar apos dev-infra)
dev-api-v2:
	cd backend_v2 && npm run start:dev

# Testes backend_v2
test-v2:
	cd backend_v2 && npm test

# Build backend_v2
build-v2:
	cd backend_v2 && npm run build

# Lint backend_v2
lint-v2:
	cd backend_v2 && npm run lint

# Dev frontend
dev-front:
	cd frontend && npm run dev

# Testes unitarios backend (exclui integration)
test:
	cd backend && python3 -m pytest tests/ --ignore=tests/integration

# Testes de integracao (requer Docker DB rodando)
test-integration:
	cd backend && PULSE_INTEGRATION=1 python3 -m pytest tests/integration/ -v

# Todos os testes
test-all:
	cd backend && PULSE_INTEGRATION=1 python3 -m pytest tests/ -v

# Resetar banco de testes
test-db-reset:
	docker compose exec -T db psql -U churn -d postgres -c "DROP DATABASE IF EXISTS churndb_test;"
	docker compose exec -T db psql -U churn -d postgres -c "CREATE DATABASE churndb_test;"
	cat backend/migrations/001_initial.sql | docker compose exec -T db psql -U churn -d churndb_test
	cat backend/migrations/002_notifications.sql | docker compose exec -T db psql -U churn -d churndb_test

# Lint backend
lint:
	cd backend && ruff check .

# Lint fix
lint-fix:
	cd backend && ruff check --fix .

# Rodar migrations (Alembic)
migrate:
	docker compose exec api alembic upgrade head

# Logs de um servico (ex: make logs s=api)
logs:
	docker compose logs -f $(s)

# Rebuild containers (limpa imagens antigas automaticamente)
rebuild:
	docker compose up -d --build --remove-orphans && docker image prune -f

# Limpar imagens dangling manualmente
prune:
	docker image prune -f

# Seed Clerk orgs + users
seed-clerk:
	cd scripts && npx tsx seed-clerk.ts

# Sync Clerk orgs → banco local
seed-db:
	cd scripts && npx tsx seed-db.ts

# Setup completo: infra + migrations + seeds
setup:
	@echo "1/4  Subindo infra (DB + Redis)..."
	docker compose up -d db redis
	@echo "2/4  Aguardando DB ficar healthy..."
	@until docker compose exec db pg_isready -U churn -d churndb > /dev/null 2>&1; do sleep 1; done
	@echo "3/4  Rodando migrations..."
	docker compose exec db psql -U churn -d churndb -f /docker-entrypoint-initdb.d/001_initial.sql 2>/dev/null || \
		cat backend/migrations/001_initial.sql | docker compose exec -T db psql -U churn -d churndb
	cat backend/migrations/002_notifications.sql | docker compose exec -T db psql -U churn -d churndb
	@echo "4/4  Rodando seeds..."
	cd scripts && npx tsx seed-clerk.ts
	cd scripts && npx tsx seed-db.ts
	@echo "\n✅  Setup completo! Rode 'make dev-api' e 'make dev-front' para iniciar."
