.PHONY: help db-from-dump

DUMP ?=

help:
	@echo "db-from-dump   Replace the local Docker database with a SQL dump"
	@echo "               make db-from-dump DUMP=/path/to/dump.sql"

db-from-dump:
	@if [ -z "$(DUMP)" ]; then echo "Usage: make db-from-dump DUMP=/path/to/dump.sql" >&2; exit 1; fi
	@bash scripts/restore-dev-db.sh "$(DUMP)"
