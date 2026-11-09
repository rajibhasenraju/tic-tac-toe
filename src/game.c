#include "game.h"
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

typedef struct {
    int board[9], winning[9], player, result;
    int scores[3], mode, human;
} Game;
static Game state;
static const int lines[8][3] = {
    {0,1,2},{3,4,5},{6,7,8},{0,3,6},
    {1,4,7},{2,5,8},{0,4,8},{2,4,6}
};
/* Deterministic tie-breaking: center, corners, then sides. */
static const int order[9] = {4,0,2,6,8,1,3,5,7};
static int in_bounds(int i) { return i >= 0 && i < 9; }
static int result_for(const int board[9]) {
    for (int l = 0; l < 8; ++l) {
        int a = lines[l][0], b = lines[l][1], c = lines[l][2];
        if (board[a] && board[a] == board[b] && board[a] == board[c])
            return board[a];
    }
    for (int i = 0; i < 9; ++i) if (!board[i]) return 0;
    return 3;
}
static void clear_round(void) {
    for (int i = 0; i < 9; ++i) state.board[i] = state.winning[i] = 0;
    state.player = 1;
    state.result = 0;
}
EMSCRIPTEN_KEEPALIVE
void game_new_match(void) {
    for (int i = 0; i < 3; ++i) state.scores[i] = 0;
    clear_round();
}
EMSCRIPTEN_KEEPALIVE
void game_init(void) {
    state.mode = 0;
    state.human = 1;
    game_new_match();
}
EMSCRIPTEN_KEEPALIVE
int game_configure(int mode, int human_player) {
    if ((mode != 0 && mode != 1) || (human_player != 1 && human_player != 2))
        return 0;
    state.mode = mode;
    state.human = human_player;
    game_new_match();
    return 1;
}
EMSCRIPTEN_KEEPALIVE
int game_get_mode(void) { return state.mode; }
EMSCRIPTEN_KEEPALIVE
int game_get_human_player(void) { return state.human; }
EMSCRIPTEN_KEEPALIVE
int game_is_computer_turn(void) {
    return state.mode == 1 && !state.result && state.player != state.human;
}
/* This query describes board legality; input ownership is enforced separately. */
EMSCRIPTEN_KEEPALIVE
int game_is_valid_move(int index) {
    return in_bounds(index) && !state.result && !state.board[index];
}
static int apply_move(int index) {
    if (!game_is_valid_move(index)) return 0;
    state.board[index] = state.player;
    state.result = result_for(state.board);
    if (state.result) {
        /* Terminal states reject further moves, so each score increments once. */
        ++state.scores[state.result - 1];
        for (int l = 0; l < 8; ++l) {
            int a = lines[l][0], b = lines[l][1], c = lines[l][2];
            if (state.board[a] && state.board[a] == state.board[b] &&
                state.board[a] == state.board[c]) {
                state.winning[a] = state.winning[b] = state.winning[c] = 1;
            }
        }
    } else state.player = 3 - state.player;
    return 1;
}
EMSCRIPTEN_KEEPALIVE
int game_make_move(int index) {
    if (game_is_computer_turn()) return 0;
    return apply_move(index);
}
/* Negamax evaluates a private board. It cannot mutate live state or scores.
 * Prefer faster wins and postpone unavoidable losses. */
static int search(int board[9], int player, int depth) {
    int result = result_for(board);
    if (result == 3) return 0;
    if (result) return result == player ? 10 - depth : depth - 10;
    int best = -100;
    for (int n = 0; n < 9; ++n) {
        int i = order[n];
        if (board[i]) continue;
        board[i] = player;
        int score = -search(board, 3 - player, depth + 1);
        board[i] = 0;
        if (score > best) best = score;
    }
    return best;
}
EMSCRIPTEN_KEEPALIVE
int game_computer_move(void) {
    if (!game_is_computer_turn()) return 0;
    int board[9], best = -100, move = -1;
    for (int i = 0; i < 9; ++i) board[i] = state.board[i];
    for (int n = 0; n < 9; ++n) {
        int i = order[n];
        if (board[i]) continue;
        board[i] = state.player;
        int score = -search(board, 3 - state.player, 1);
        board[i] = 0;
        if (score > best) { best = score; move = i; }
    }
    return move >= 0 ? apply_move(move) : 0;
}
EMSCRIPTEN_KEEPALIVE
int game_get_cell(int index) { return in_bounds(index) ? state.board[index] : -1; }
EMSCRIPTEN_KEEPALIVE
int game_get_winning_cell(int index) { return in_bounds(index) ? state.winning[index] : -1; }
EMSCRIPTEN_KEEPALIVE
int game_get_current_player(void) { return state.player; }
EMSCRIPTEN_KEEPALIVE
int game_get_result(void) { return state.result; }
EMSCRIPTEN_KEEPALIVE
int game_get_score_x(void) { return state.scores[0]; }
EMSCRIPTEN_KEEPALIVE
int game_get_score_o(void) { return state.scores[1]; }
EMSCRIPTEN_KEEPALIVE
int game_get_score_draws(void) { return state.scores[2]; }
EMSCRIPTEN_KEEPALIVE
void game_restart_round(void) { clear_round(); }
