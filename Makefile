PYTHON ?= python3

.PHONY: build check serve
build:
	$(PYTHON) scripts/build_site.py
check: build
	$(PYTHON) scripts/check_site.py
	$(PYTHON) scripts/test_experiment_scores.py
	@for file in src/scripts/*.js; do node --check "$$file"; done
	node --test scripts/globe-quality.test.mjs scripts/portal-loading.test.mjs
serve: export AISLE_COUNTER_ENDPOINT ?= http://127.0.0.1:8787/count
serve: build
	$(PYTHON) -m http.server 4173 --bind 127.0.0.1 --directory dist
