SHELL := /bin/bash
CC ?= cc
CFLAGS := -std=c11 -Wall -Wextra -Wpedantic -O2
EMCC ?= emcc
DIST_DIR := dist
PUBLIC_DIR := public

EM_FLAGS := -std=c11 -Wall -Wextra -Wpedantic -O2 --no-entry \
	-s WASM=1 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME='createGameModule' \
	-s EXPORTED_FUNCTIONS='["_game_init","_game_is_valid_move","_game_make_move","_game_get_cell","_game_get_current_player","_game_get_result","_game_get_score_x","_game_get_score_o","_game_get_score_draws","_game_get_winning_cell","_game_restart_round","_game_new_match"]' \
	-s EXPORTED_RUNTIME_METHODS='[]' \
	-s NO_EXIT_RUNTIME=1 \
	-s ENVIRONMENT='web'

.PHONY: all build clean test test-native test-web

all: build

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

build: $(DIST_DIR)
	$(EMCC) src/game.c $(EM_FLAGS) -o $(DIST_DIR)/game.js
	cp $(PUBLIC_DIR)/index.html $(DIST_DIR)/index.html
	cp $(PUBLIC_DIR)/styles.css $(DIST_DIR)/styles.css
	cp $(PUBLIC_DIR)/app.js $(DIST_DIR)/app.js

test-native:
	$(CC) $(CFLAGS) src/game.c tests/native/test_game.c -Isrc -o tests/native/test_game
	./tests/native/test_game

test-web: build
	node tests/web/integration.test.mjs

test: test-native test-web

clean:
	rm -rf $(DIST_DIR) tests/native/test_game
