/*
 * Floor 6 Lift Gateway — "Synthesizer Binary"
 * Hardcoded comparison values (23, 7, 91, 4) are recoverable via static
 * analysis (strings / objdump -d / Ghidra) without ever running the binary.
 *
 * Flag is XOR-encoded with key 0x42 so a plain `strings` dump doesn't
 * trivially leak it -- solvers still need to find the 4 magic values
 * (by reversing the comparison) and either run the program with them
 * or decode the byte array themselves.
 *
 * Compile: gcc -no-pie -o synth_v2 synth_v2.c
 */
#include <stdio.h>

static const unsigned char enc_flag[] = {
    0x11, 0x17, 0x01, 0x01, 0x07, 0x11, 0x11, 0x63, 0x62, 0x12, 0x17, 0x01,
    0x16, 0x04, 0x39, 0x30, 0x71, 0x34, 0x71, 0x30, 0x31, 0x71, 0x26, 0x1d,
    0x31, 0x3b, 0x2c, 0x36, 0x2a, 0x71, 0x31, 0x73, 0x38, 0x71, 0x30, 0x1d,
    0x71, 0x2e, 0x71, 0x34, 0x76, 0x36, 0x72, 0x30, 0x1d, 0x37, 0x2c, 0x2e,
    0x72, 0x21, 0x29, 0x3f, 0x48
};

static void print_decoded(const unsigned char *buf, int len, unsigned char key) {
    for (int i = 0; i < len; i++) {
        putchar(buf[i] ^ key);
    }
}

int main() {
    int a, b, c, d;
    printf("Enter mixing ratios (4 integers): ");
    if (scanf("%d %d %d %d", &a, &b, &c, &d) != 4) {
        printf("Invalid input.\n");
        return 1;
    }
    if (a == 23 && b == 7 && c == 91 && d == 4) {
        print_decoded(enc_flag, sizeof(enc_flag), 0x42);
    } else {
        printf("Mixture unstable.\n");
    }
    return 0;
}
