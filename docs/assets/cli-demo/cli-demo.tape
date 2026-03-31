Output docs/assets/cli-demo/cli-demo.gif
Output docs/assets/cli-demo/cli-demo.mp4

Require npx

Set Shell zsh
Set FontSize 18
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 600
Set Framerate 12
Set Theme "Catppuccin Mocha"
Set Padding 16
Set WindowBar Colorful
Set TypingSpeed 35ms
Set CursorBlink false

# --- hidden setup: temp repo matching init heuristics (docs/, LICENSE) ---
Hide
Type `export DEMO_DIR=$(mktemp -d) && cd "$DEMO_DIR"`
Enter
Sleep 400ms
Type "git init -q my-app && cd my-app"
Enter
Sleep 400ms
Type `mkdir -p src docs/specs && echo 'export const x = 1' > src/index.ts && echo '# Guide' > docs/specs/guide.md && echo 'MIT License' > LICENSE && echo '{}' > package.json && git add -A && git commit -qm init`
Enter
Sleep 400ms
Type "clear"
Enter
Sleep 250ms
Show

# --- Scene 1: repo context ---
Type "ls"
Enter
Sleep 1500ms

# --- Scene 2: init ---
Type "npx humanfile init"
Enter
Wait+Screen /Run `humanfile check`/
Sleep 2200ms

# --- Scene 3: classify tree ---
Type "npx humanfile check"
Enter
Wait+Screen /2 free/
Sleep 2800ms

# --- Scene 4: rule inventory ---
Type "npx humanfile ls"
Enter
Wait+Screen /.human/
Sleep 1800ms

# --- Scene 5: single-path check ---
Type "npx humanfile check src/index.ts"
Enter
Wait+Screen /src\/index.ts/
Sleep 1800ms

# --- Scene 6: explain confirm (time-based wait — explain output can be slow under npx/ttyd) ---
Type "npx humanfile explain docs/specs/guide.md"
Enter
Sleep 5s

# --- Scene 7: explain readonly ---
Type "npx humanfile explain LICENSE"
Enter
Sleep 5s

# --- Scene 8: explain free (--non-matching) ---
Type "npx humanfile explain -n src/index.ts"
Enter
Sleep 4s

