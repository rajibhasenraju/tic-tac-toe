#ifndef GAME_H
#define GAME_H
#ifdef __cplusplus
extern "C" {
#endif
/* Players: X=1, O=2. Results: ongoing=0, X=1, O=2, draw=3.
 * Modes: local=0, computer=1. Configuration starts a fresh match. */
void game_init(void);
int game_configure(int mode, int human_player);
int game_get_mode(void);
int game_get_human_player(void);
int game_is_computer_turn(void);
int game_computer_move(void);
int game_is_valid_move(int index);
int game_make_move(int index);
int game_get_cell(int index);
int game_get_current_player(void);
int game_get_result(void);
int game_get_score_x(void);
int game_get_score_o(void);
int game_get_score_draws(void);
int game_get_winning_cell(int index);
void game_restart_round(void);
void game_new_match(void);
#ifdef __cplusplus
}
#endif
#endif
