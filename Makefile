.PHONY: up down dev-infra dev-api dev-front test build lint logs rebuild prune seed seed-clerk seed-db setup migrate migrate-gen

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
	docker compose up -d db

# Dev backend NestJS (rodar apos dev-infra)
dev-api:
	cd backend_v2 && npm run start:dev

# Dev frontend
dev-front:
	cd frontend && npm run dev

# Testes backend
test:
	cd backend_v2 && npm test

# Build backend
build:
	cd backend_v2 && npm run build

# Lint backend
lint:
	cd backend_v2 && npm run lint

# Rodar migrations (TypeORM)
migrate:
	cd backend_v2 && npm run migration:run

# Gerar migration a partir das entities
migrate-gen:
	cd backend_v2 && npm run migration:generate -- src/infra/database/migrations/$(name)

# Logs de um servico (ex: make logs s=api_v2)
logs:
	docker compose logs -f $(s)

# Rebuild containers
rebuild:
	docker compose up -d --build --remove-orphans && docker image prune -f

# Limpar imagens dangling
prune:
	docker image prune -f

# Rodar todos os seeds (Clerk + DB)
seed:
	cd backend_v2 && npm run seed

# Seed apenas Clerk orgs + users
seed-clerk:
	cd backend_v2 && npm run seed:clerk

# Sync Clerk orgs → banco local
seed-db:
	cd backend_v2 && npm run seed:db

# Setup completo: infra + migrations + seeds
setup:
	@echo "1/4  Subindo infra (DB)..."
	docker compose up -d db
	@echo "2/4  Aguardando DB ficar healthy..."
	@until docker compose exec db pg_isready -U churn -d churndb > /dev/null 2>&1; do sleep 1; done
	@echo "3/4  Rodando migrations..."
	cd backend_v2 && npm run migration:run
	@echo "4/4  Rodando seeds..."
	cd backend_v2 && npm run seed
	@echo "\n✅  Setup completo! Rode 'make dev-api' e 'make dev-front' para iniciar."
