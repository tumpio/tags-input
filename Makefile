PROJECT=tags-input
SRC=src/tags-input.js

all: check compile

check: lint

lint:
	jshint $(SRC)

compile: build/build.js

build/build.js: node_modules $(SRC) | build
	browserify --require ./$(SRC):$(PROJECT) --outfile $@

.DELETE_ON_ERROR: build/build.js

node_modules: package.json
	npm install && touch $@

build:
	mkdir -p $@

clean:
	rm -fr build

distclean: clean
	rm -fr node_modules

.PHONY: clean lint compile all
