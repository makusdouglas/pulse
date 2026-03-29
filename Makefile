.PHONY: up down dev dev-infra test lint migrate seed logs

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

# Dev frontend
dev-front:
	cd frontend && npm run dev

# Testes backend
test:
	cd backend && python -m pytest

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
