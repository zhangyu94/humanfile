Output install-demo.gif
Output install-demo.mp4

Require humanfile

Set Shell zsh
Set FontSize 18
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 400
Set Framerate 12
Set Theme "Catppuccin Mocha"
Set Padding 16
Set WindowBar Colorful
Set TypingSpeed 35ms
Set CursorBlink false

# --- hidden setup: temp repo with .human (same shape as init heuristic) ---
Hide
Type `export NO_COLOR=1 && export DEMO_DIR=$(mktemp -d) && cd "$DEMO_DIR"`
Enter
Sleep 400ms
Type "git init -q my-app && cd my-app"
Enter
Sleep 400ms
Type `mkdir -p src docs/specs && echo 'export const x = 1' > src/index.ts && echo '# Guide' > docs/specs/guide.md && echo 'MIT License' > LICENSE && echo '{}' > package.json && git add -A && git commit -qm init`
Enter
Sleep 400ms
Type "humanfile init"
Enter
Wait+Screen /humanfile init/
Sleep 1200ms
Type "clear"
Enter
Sleep 250ms
Show

# --- install Cursor agent guidance (non-interactive) ---
Type "humanfile install --env cursor"
Enter
Wait+Screen /Installed config for Cursor/
Sleep 2500ms

# --- show generated rule file exists ---
Type "ls .cursor/rules"
Enter
Wait+Screen /humanfile.mdc/
Sleep 2500ms
