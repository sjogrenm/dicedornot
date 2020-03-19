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
		$< | sed -E 's#"js/([^/]*)\.js"#"js/\1.min.js"#g' > index.html

%.min.js: %.js
	node_modules/.bin/babel $< | node_modules/.bin/terser -o $@

FILES = \
	index.html \
	js/dice.min.js \
	js/io.min.js \
	js/replay.min.js \
	js/rolls.min.js \
	js/site.min.js \
	js/stats.min.js

all: $(FILES)
clean:
	rm $(FILES)

server:
	python3 -m http.server 8099

.PHONY: all clean server
.DEFAULT_GOAL := all
