.DEFAULT_GOAL := help

# Un projet (backend, frontend, e2e) n'existe qu'à partir de sa phase : tant qu'il n'a pas de
# package.json, la cible l'ignore au lieu d'échouer. $(1) = dossier, $(2) = script npm.
define run_script
@if [ -f $(1)/package.json ]; then npm --prefix $(1) run $(2); \
else echo "$(1): pas encore de projet, rien à faire"; fi
endef

# Même principe pour les cibles qui dépendent d'un fichier. $(1) = fichier requis, $(2) = commande.
define run_if_exists
@if [ -f $(1) ]; then $(2); else echo "$(1) absent: rien à faire pour l'instant"; fi
endef

.PHONY: help up down seed seed-reset lint typecheck test test-back test-front test-e2e test-matrix

help: ## Liste les commandes disponibles
	@awk -F ':.*## ' '/^[a-z0-9-]+:.*## / { printf "  %-12s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Construit et démarre la stack Docker (db, api, web)
	$(call run_if_exists,docker-compose.yml,docker compose up --build)

down: ## Arrête la stack Docker
	$(call run_if_exists,docker-compose.yml,docker compose down)

seed: ## Insère 1000 contacts fictifs (idempotent)
	$(call run_if_exists,docker-compose.yml,docker compose exec api npm run seed)

seed-reset: ## Vide les contacts puis réinsère le jeu de données
	$(call run_if_exists,docker-compose.yml,docker compose exec api npm run seed -- --reset)

lint: ## ESLint et vérification du format (Prettier) sur tout le dépôt
	npm run lint
	npm run format:check

typecheck: ## tsc sans émission, dans chaque projet
	$(call run_script,backend,typecheck)
	$(call run_script,frontend,typecheck)
	$(call run_script,e2e,typecheck)

test: test-back test-front test-e2e ## Tous les tests

test-back: ## Tests du backend (unitaires et intégration)
	$(call run_script,backend,test)

test-front: ## Tests du frontend
	$(call run_script,frontend,test)

test-e2e: ## Tests de bout en bout (Playwright)
	$(call run_script,e2e,test)

test-matrix: ## Génère docs/TESTING.md (exigence -> tests)
	$(call run_if_exists,scripts/test-matrix.mjs,node scripts/test-matrix.mjs)
