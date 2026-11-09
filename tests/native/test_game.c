#include "game.h"

#include <assert.h>
#include <stdio.h>

static const int LINES[8][3] = {
    {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
    {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
    {0, 4, 8}, {2, 4, 6}
};

static const int O_WIN_FILLERS[8][3] = {
    {3, 4, 6}, {0, 1, 6}, {0, 1, 3}, {1, 2, 5},
    {0, 2, 3}, {0, 1, 3}, {1, 2, 3}, {0, 1, 3}
};

static void assert_clean_round(void) {
    for (int i = 0; i < 9; i++) {
        assert(game_get_cell(i) == 0);
        assert(game_get_winning_cell(i) == 0);
    }
    assert(game_get_current_player() == 1);
    assert(game_get_result() == 0);
}

static void test_initialization_and_bounds(void) {
    game_init();
    assert_clean_round();
    assert(game_get_score_x() == 0);
    assert(game_get_score_o() == 0);
    assert(game_get_score_draws() == 0);
    assert(game_is_valid_move(-1) == 0);
    assert(game_is_valid_move(9) == 0);
    assert(game_get_cell(-1) == -1);
    assert(game_get_cell(9) == -1);
    assert(game_get_winning_cell(-1) == -1);
    assert(game_get_winning_cell(9) == -1);
}

static void test_occupied_and_switching(void) {
    game_init();
    assert(game_make_move(0) == 1);
    assert(game_get_cell(0) == 1);
    assert(game_get_current_player() == 2);
    assert(game_is_valid_move(0) == 0);
    assert(game_make_move(0) == 0);
    assert(game_get_current_player() == 2);
}

static void test_x_wins_all_lines(void) {
    for (int line = 0; line < 8; line++) {
        game_init();
        int filler = 0;
        while (filler == LINES[line][0] || filler == LINES[line][1] || filler == LINES[line][2]) {
            filler++;
        }

        assert(game_make_move(LINES[line][0]) == 1);
        assert(game_make_move(filler) == 1);
        assert(game_make_move(LINES[line][1]) == 1);
        assert(game_make_move(filler + 1 + (filler + 1 == LINES[line][0] || filler + 1 == LINES[line][1] || filler + 1 == LINES[line][2])) == 1);
        assert(game_make_move(LINES[line][2]) == 1);

        assert(game_get_result() == 1);
        assert(game_get_score_x() == 1);
        assert(game_get_score_o() == 0);
        assert(game_get_score_draws() == 0);
        for (int i = 0; i < 9; i++) {
            int expected = (i == LINES[line][0] || i == LINES[line][1] || i == LINES[line][2]) ? 1 : 0;
            assert(game_get_winning_cell(i) == expected);
        }

        assert(game_make_move(8) == 0);
        assert(game_get_score_x() == 1);
    }
}

static void test_o_wins_all_lines(void) {
    for (int line = 0; line < 8; line++) {
        game_init();
        assert(game_make_move(O_WIN_FILLERS[line][0]) == 1);
        assert(game_make_move(LINES[line][0]) == 1);
        assert(game_make_move(O_WIN_FILLERS[line][1]) == 1);
        assert(game_make_move(LINES[line][1]) == 1);
        assert(game_make_move(O_WIN_FILLERS[line][2]) == 1);
        assert(game_make_move(LINES[line][2]) == 1);

        assert(game_get_result() == 2);
        assert(game_get_score_x() == 0);
        assert(game_get_score_o() == 1);
        for (int i = 0; i < 9; i++) {
            int expected = (i == LINES[line][0] || i == LINES[line][1] || i == LINES[line][2]) ? 1 : 0;
            assert(game_get_winning_cell(i) == expected);
        }
        assert(game_make_move(8) == 0);
        assert(game_get_score_o() == 1);
    }
}

static void test_draw_and_terminal_rejection(void) {
    game_init();
    const int draw_moves[] = {0, 1, 2, 4, 3, 5, 7, 6, 8};
    for (int i = 0; i < 9; i++) {
        assert(game_make_move(draw_moves[i]) == 1);
    }
    assert(game_get_result() == 3);
    assert(game_get_score_draws() == 1);
    assert(game_make_move(0) == 0);
    assert(game_make_move(4) == 0);
    assert(game_get_score_draws() == 1);
}

static void test_round_reset_and_new_match(void) {
    game_init();
    const int x_win[] = {0, 3, 1, 4, 2};
    for (int i = 0; i < 5; i++) {
        assert(game_make_move(x_win[i]) == 1);
    }
    assert(game_get_score_x() == 1);

    game_restart_round();
    assert_clean_round();
    assert(game_get_score_x() == 1);

    game_new_match();
    assert_clean_round();
    assert(game_get_score_x() == 0);
    assert(game_get_score_o() == 0);
    assert(game_get_score_draws() == 0);
}

int main(void) {
    test_initialization_and_bounds();
    test_occupied_and_switching();
    test_x_wins_all_lines();
    test_o_wins_all_lines();
    test_draw_and_terminal_rejection();
    test_round_reset_and_new_match();

    puts("native tests passed");
    return 0;
}
