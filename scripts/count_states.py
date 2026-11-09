"""Enumerate legal boards and ordered histories, stopping at terminal states."""
from functools import lru_cache
LINES = ((0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6))
def result(board):
    for a,b,c in LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return 3 if all(board) else 0
def canonical(board):
    variants = []
    for flip in (False, True):
        for turns in range(4):
            out = [0] * 9
            for i, value in enumerate(board):
                r,c = divmod(i,3)
                if flip: c = 2-c
                for _ in range(turns): r,c = c,2-r
                out[r*3+c] = value
            variants.append(tuple(out))
    return min(variants)
@lru_cache(None)
def histories(board=(0,)*9, player=1):
    if result(board): return 1
    return sum(histories(board[:i]+(player,)+board[i+1:],3-player)
               for i,v in enumerate(board) if not v)
@lru_cache(None)
def reduced_histories(board=(0,)*9, player=1):
    if result(board): return 1
    children = {canonical(board[:i]+(player,)+board[i+1:])
                for i,v in enumerate(board) if not v}
    return sum(reduced_histories(child,3-player) for child in children)
def main():
    seen = set()
    def visit(board=(0,)*9, player=1):
        if board in seen: return
        seen.add(board)
        if not result(board):
            for i,v in enumerate(board):
                if not v: visit(board[:i]+(player,)+board[i+1:],3-player)
    visit()
    classes = {canonical(b) for b in seen}
    terminal = {b for b in classes if result(b)}
    totals = (len(seen), len(classes), len(terminal), histories())
    split = tuple(sum(result(b)==r for b in terminal) for r in (1,2,3))
    assert totals == (5478,765,138,255168), totals
    assert split == (91,44,3), split
    assert reduced_histories() == 26830
    print({'per_node_symmetry_reduced_games': reduced_histories()})
    print(dict(zip(('boards','symmetry_classes','terminal_classes','ordered_games'),totals)))
    print(dict(zip(('X_terminal_classes','O_terminal_classes','draw_terminal_classes'),split)))
if __name__ == '__main__': main()
