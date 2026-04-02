Output guard-demo.gif
Output guard-demo.mp4

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

# --- hidden setup: git repo + .human ---
Hide
Type `export NO_COLOR=1 && export DEMO_DIR="$HOME/humanfile-guard-demo" && rm -rf "$DEMO_DIR" && mkdir -p "$DEMO_DIR" && cd "$DEMO_DIR"`
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

# --- install pre-commit guard (staged mode) ---
Type "humanfile guard install --hook pre-commit --mode staged"
Enter
Wait+Screen /Installed pre-commit/
Sleep 2500ms

# --- status ---
Type "humanfile guard status"
Enter
Wait+Screen /pre-commit - installed/
Sleep 2500ms
