Output docs/assets/action-demo/action-demo.gif
Output docs/assets/action-demo/action-demo.mp4

Require gh

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

# This cassette assumes:
# - `gh` is authenticated (`gh auth status`)
# - Repo: <REPO_NAME>
# - PR: <PR_NUMBER>

# --- Scene A: Checks tab (terminal view of failing check) ---
Hide
Type "clear"
Enter
Sleep 300ms
Show

Type "gh pr checks <PR_NUMBER> --repo <REPO_NAME>"
Enter
Sleep 5000ms

# --- Scene B: PR comment body (readonly + confirm sections) ---
Type "gh api repos/<REPO_NAME>/issues/<PR_NUMBER>/comments --jq '.[].body'"
Enter
Sleep 7000ms

