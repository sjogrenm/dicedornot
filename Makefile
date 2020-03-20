site/%.html: src/%.html
	mkdir -p $(dir $@)
	node_modules/.bin/html-minifier \
		--collapse-whitespace \
		--remove-comments \
		--remove-optional-tags \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-tag-whitespace \
		--use-short-doctype \
		--minify-css true \
		--minify-js true \
		$< -o $@

site/%.js: src/%.js
	mkdir -p $(dir $@)
	node_modules/.bin/babel $< | node_modules/.bin/terser -o $@

site/js/lib/%.js: src/js/lib/%.js
	mkdir -p $(dir $@)
	cp $< $@

site/%: src/%
	mkdir -p $(dir $@)
	cp $< $@

FILES = \
	site/index.html \
	site/js/dice.js \
	site/js/io.js \
	site/js/replay.js \
	site/js/rolls.js \
	site/js/site.js \
	site/js/stats.js \
	site/js/lib/JSONC.min.js \
	site/js/lib/lz-string.min.js \
	site/js/lib/xml2json.min.js \
	site/js/lib/zipjs/deflate.js \
	site/js/lib/zipjs/inflate.js \
	site/js/lib/zipjs/z-worker.js \
	site/js/lib/zipjs/zip.js \
	site/css/app.css \
	site/error.html \
	site/sitemap.xml \
	site/blockdice.png \
	site/favicon.ico

all: $(FILES)
clean:
	rm -rf site

requirements:
	npm ci

dev:
	cd src && python3 -m http.server 8099
prod: $(FILES)
	cd site && python3 -m http.server 8099

.PHONY: all clean dev prod requirements
.DEFAULT_GOAL := all
