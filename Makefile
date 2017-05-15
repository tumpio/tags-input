PROJECT=tags-input
SRC=src/tags-input.js
SRC_ES5=src.es5/tags-input.js
NODE_BIN=./node_modules/.bin

all: check compile

check: lint

lint: | node_modules
	$(NODE_BIN)/jshint $(SRC)

compile: build/build.js

transpile: $(SRC_ES5)

build/build.js: $(SRC_ES5) | node_modules
	mkdir -p $(@D)
	$(NODE_BIN)/browserify --require ./$(SRC_ES5):$(PROJECT) --outfile $@

.DELETE_ON_ERROR: build/build.js

node_modules: package.json
	npm install && touch $@

clean:
	rm -fr build src.es5

distclean: clean
	rm -fr node_modules

src.es5/%.js: src/%.js | node_modules
	mkdir -p $(@D)
	$(NODE_BIN)/buble $< -o $@

.PHONY: clean lint compile all transpile
