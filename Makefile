PYTHON ?= python3

.PHONY: build check serve
build:
	$(PYTHON) scripts/build_site.py
check: build
	$(PYTHON) scripts/check_site.py
	@for file in src/scripts/*.js; do node --check "$$file"; done
serve: build
	$(PYTHON) -m http.server 4173 --bind 127.0.0.1 --directory dist
