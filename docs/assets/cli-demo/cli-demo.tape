Output cli-demo.gif
Output cli-demo.mp4

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

# --- hidden setup: temp repo; init writes .human (not shown in classification demo) ---
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

# --- Scene 1: see effective levels (tree) ---
Type "humanfile check"
Enter
Wait+Screen /4 files/
Sleep 2500ms

# --- Scene 2: rule inventory ---
Type "humanfile ls"
Enter
Wait+Screen /1 confirm/
Sleep 2500ms

# --- Scene 3: single-path check ---
Type "humanfile check src/index.ts"
Enter
Wait+Screen /free  src/
Sleep 2500ms

# --- Scene 4: explain confirm ---
Type "clear"
Enter
Sleep 200ms
Type "humanfile explain docs/specs/guide.md"
Enter
Wait+Screen /level: confirm/
Sleep 2500ms

# --- Scene 5: explain readonly ---
Type "clear"
Enter
Sleep 200ms
Type "humanfile explain LICENSE"
Enter
Wait+Screen /level: readonly/
Sleep 2500ms

# --- Scene 6: explain free (--non-matching) ---
Type "clear"
Enter
Sleep 200ms
Type "humanfile explain -n src/index.ts"
Enter
Wait+Screen /level: free/
Sleep 2500ms
