#include "game.h"

#include <stddef.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

enum { BOARD_SIZE = 9 };
enum { PLAYER_NONE = 0, PLAYER_X = 1, PLAYER_O = 2 };
enum { RESULT_ONGOING = 0, RESULT_X_WIN = 1, RESULT_O_WIN = 2, RESULT_DRAW = 3 };

typedef struct {
    int board[BOARD_SIZE];
    int winning_cells[BOARD_SIZE];
    int current_player;
    int result;
    int score_x;
    int score_o;
    int score_draws;
    int terminal_counted;
} game_state_t;

static game_state_t state;

static const int WIN_LINES[8][3] = {
    {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
    {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
    {0, 4, 8}, {2, 4, 6}
};

static int in_bounds(int index) {
    return index >= 0 && index < BOARD_SIZE;
}

static void clear_board_state(void) {
    for (int i = 0; i < BOARD_SIZE; i++) {
        state.board[i] = PLAYER_NONE;
        state.winning_cells[i] = 0;
    }
    state.current_player = PLAYER_X;
    state.result = RESULT_ONGOING;
    state.terminal_counted = 0;
}

static int board_is_full(void) {
    for (int i = 0; i < BOARD_SIZE; i++) {
        if (state.board[i] == PLAYER_NONE) {
            return 0;
        }
    }
    return 1;
}

static void apply_terminal_score_once(void) {
    if (state.terminal_counted || state.result == RESULT_ONGOING) {
        return;
    }

    if (state.result == RESULT_X_WIN) {
        state.score_x++;
    } else if (state.result == RESULT_O_WIN) {
        state.score_o++;
    } else if (state.result == RESULT_DRAW) {
        state.score_draws++;
    }

    state.terminal_counted = 1;
}

static void evaluate_result(void) {
    for (int i = 0; i < 8; i++) {
        const int a = WIN_LINES[i][0];
        const int b = WIN_LINES[i][1];
        const int c = WIN_LINES[i][2];
        const int marker = state.board[a];

        if (marker != PLAYER_NONE && marker == state.board[b] && marker == state.board[c]) {
            state.result = (marker == PLAYER_X) ? RESULT_X_WIN : RESULT_O_WIN;
            state.winning_cells[a] = 1;
            state.winning_cells[b] = 1;
            state.winning_cells[c] = 1;
            apply_terminal_score_once();
            return;
        }
    }

    if (board_is_full()) {
        state.result = RESULT_DRAW;
        apply_terminal_score_once();
    }
}

EMSCRIPTEN_KEEPALIVE
void game_init(void) {
    state.score_x = 0;
    state.score_o = 0;
    state.score_draws = 0;
    clear_board_state();
}

EMSCRIPTEN_KEEPALIVE
int game_is_valid_move(int index) {
    if (!in_bounds(index) || state.result != RESULT_ONGOING) {
        return 0;
    }
    return state.board[index] == PLAYER_NONE;
}

EMSCRIPTEN_KEEPALIVE
int game_make_move(int index) {
    if (!game_is_valid_move(index)) {
        return 0;
    }

    state.board[index] = state.current_player;
    evaluate_result();

    if (state.result == RESULT_ONGOING) {
        state.current_player = (state.current_player == PLAYER_X) ? PLAYER_O : PLAYER_X;
    }

    return 1;
}

EMSCRIPTEN_KEEPALIVE
int game_get_cell(int index) {
    if (!in_bounds(index)) {
        return -1;
    }
    return state.board[index];
}

EMSCRIPTEN_KEEPALIVE
int game_get_current_player(void) {
    return state.current_player;
}

EMSCRIPTEN_KEEPALIVE
int game_get_result(void) {
    return state.result;
}

EMSCRIPTEN_KEEPALIVE
int game_get_score_x(void) {
    return state.score_x;
}

EMSCRIPTEN_KEEPALIVE
int game_get_score_o(void) {
    return state.score_o;
}

EMSCRIPTEN_KEEPALIVE
int game_get_score_draws(void) {
    return state.score_draws;
}

EMSCRIPTEN_KEEPALIVE
int game_get_winning_cell(int index) {
    if (!in_bounds(index)) {
        return -1;
    }
    return state.winning_cells[index];
}

EMSCRIPTEN_KEEPALIVE
void game_restart_round(void) {
    clear_board_state();
}

EMSCRIPTEN_KEEPALIVE
void game_new_match(void) {
    state.score_x = 0;
    state.score_o = 0;
    state.score_draws = 0;
    clear_board_state();
}
