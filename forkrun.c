#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>

#define BUFSIZE 256

char* envvar_cmd = "FORKRUN_CMD";
char* envvar_arg = "FORKRUN_ARG";
char cmd[BUFSIZE];
char arg[BUFSIZE];

int main (void) {
    pid_t pid;    
    
    if ((pid = fork()) == 0) {
        snprintf(cmd, BUFSIZE, "%s", getenv(envvar_cmd));
        snprintf(arg, BUFSIZE, "%s", getenv(envvar_arg));
        char* const argv[] = { cmd, arg, NULL };

        if (execv(cmd, argv) < 0) {
            perror("execv error");
        }
    } else if (pid < 0) {
        perror("fork error");
    } else {
        return EXIT_SUCCESS;
    }

    return EXIT_FAILURE;
}
