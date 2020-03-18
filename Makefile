%.html: %.unmin.html
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

%.min.js: %.js
	node_modules/.bin/terser $< --compress --mangle -o $@

FILES = \
	index.html \
	js/dice.min.js \
	js/io.min.js \
	js/replay.min.js \
	js/rolls.min.js \
	js/site.min.js \
	js/stats.min.js \
	js/lib/JSONC.min.js \
	js/lib/lz-string.min.js \
	js/lib/xml2json.min.js

all: $(FILES)
clean:
	rm $(FILES)

.PHONY: all clean
.DEFAULT_GOAL := all
