#include "game.h"
#include <assert.h>
#include <stdio.h>
static unsigned long leaves;
static int moves[9];
/* Reconstruct every prefix through the public API; no test-only state setter. */
static void replay(int human, int length) {
    assert(game_configure(1, human));
    for (int n = 0; n < length; ++n) {
        if (game_is_computer_turn()) assert(game_computer_move());
        else assert(game_make_move(moves[n]));
    }
}
static void explore(int human, int length) {
    replay(human, length);
    int result = game_get_result();
    if (result) {
        assert(result != human);
        assert(game_get_score_x() + game_get_score_o() + game_get_score_draws() == 1);
        assert(!game_computer_move());
        assert(!game_make_move(0));
        ++leaves;
        return;
    }
    assert(!game_get_score_x() && !game_get_score_o() && !game_get_score_draws());
    if (game_is_computer_turn()) {
        int before[9];
        for (int i = 0; i < 9; ++i) before[i] = game_get_cell(i);
        assert(!game_make_move(0));
        assert(game_computer_move());
        int changes = 0;
        for (int i = 0; i < 9; ++i) if (before[i] != game_get_cell(i)) {
            assert(before[i] == 0 && game_get_cell(i) == 3 - human);
            ++changes;
        }
        assert(changes == 1);
        moves[length] = -1;
        explore(human, length + 1);
    } else {
        int empty[9], count = 0;
        for (int i = 0; i < 9; ++i) if (game_is_valid_move(i)) empty[count++] = i;
        for (int n = 0; n < count; ++n) {
            moves[length] = empty[n];
            explore(human, length + 1);
        }
    }
}
int main(void) {
    game_init();
    assert(!game_computer_move());
    assert(!game_configure(2, 1));
    assert(!game_configure(1, 0));
    assert(game_get_mode() == 0);
    assert(game_configure(1, 2));
    assert(game_is_computer_turn());
    assert(!game_make_move(-1) && !game_make_move(9));
    game_restart_round();
    assert(game_get_mode() == 1 && game_get_human_player() == 2);
    assert(game_is_computer_turn());
    explore(1, 0);
    unsigned long as_o = leaves;
    explore(2, 0);
    printf("AI cannot lose: %lu human-X games, %lu human-O games checked\n", as_o, leaves - as_o);
    game_new_match();
    assert(!game_get_score_x() && !game_get_score_o() && !game_get_score_draws());
    assert(game_get_mode() == 1);
    assert(game_configure(0, 1));
    assert(!game_is_computer_turn());
    assert(game_make_move(0) && game_make_move(1));
    return 0;
}
