env:
	pip install --upgrade pip && pip install uv && uv venv

add:
	uv add -r requirements.txt

sync:
ifeq ($(OS),Windows_NT)
	uv sync && cls
else
	uv sync && clear
endif

git:
	git add .
	git status
	git commit -m "recent edits"
	git push
ifeq ($(OS),Windows_NT)
	cls
else
	clear
endif


format:
	uv run black . --include '\.py'

lint:
	uv run pylint **/*.py

run:
	uvicorn fast_api_front_end.main:app --reload