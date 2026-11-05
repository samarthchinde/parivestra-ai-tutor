.PHONY: help install dev-backend dev-frontend test eval ingest docker-build docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  install       - Install python and frontend dependencies"
	@echo "  dev-backend   - Start FastAPI backend server on port 8001"
	@echo "  dev-frontend  - Start Vite React frontend on port 5173"
	@echo "  test          - Run pytest test suite"
	@echo "  eval          - Run tutor benchmark evaluation"
	@echo "  ingest        - Rebuild BM25 RAG index from knowledge base"
	@echo "  docker-up     - Launch Docker containers"
	@echo "  docker-down   - Stop Docker containers"

install:
	pip install -r requirements.txt
	npm install

dev-backend:
	uvicorn api:app --reload --port 8001

dev-frontend:
	npm run dev

test:
	pytest tests -v

eval:
	python eval/run_eval.py

ingest:
	python scripts/ingest.py

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

