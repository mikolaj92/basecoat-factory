.PHONY: install build watch clean size

install: ## Install build deps (only in this repo)
	npm install

build: ## Produce dist/basecoat-factory.min.css
	npm run build
	@ls -la dist/
	@echo "---"
	@wc -c dist/basecoat-factory.min.css
	@gzip -c dist/basecoat-factory.min.css | wc -c | awk '{printf "gzip ~%d bytes (%.1f KiB)\n", $$1, $$1/1024}'

watch: ## Rebuild on safelist/input changes
	npm run watch

clean:
	rm -rf node_modules dist/*.css

size: build
