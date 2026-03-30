# Terminology Conventions

## Purpose

Define consistent terminology for `.human` protection levels across product copy, action comments, docs, and code messages.

## Canonical Terms

| Concept                                | Canonical Term                                 | Notes                                                                                                                              |
| -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Files matched by plain patterns        | `confirm-protected files`                      | These files require explicit approval before AI edits (interactive confirmation or autonomous session consent, depending on mode). |
| Files matched by `!` patterns          | `readonly-protected files`                     | AI must not edit directly. Human can intentionally relax protection by removing `!`.                                               |
| Files matched by plain or `!` patterns | `human-maintained files`, or `protected files` | Optional umbrella phrase when referring to both groups together.                                                                   |
| Files with no matches                  | `free files`                                   | No `.human` restrictions.                                                                                                          |
