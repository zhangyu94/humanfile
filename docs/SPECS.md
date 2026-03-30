# Product Specifications

Specifications in this area define stable, implementation-facing contracts that should remain true across refactors.
Include file formats, CLI/API behavior, protocol-level semantics, and precedence rules.

Avoid roadmap plans, draft brainstorming, and one-off execution notes.

## Index

| Spec                                                                                         | Description                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [specs/human-file-format.md](./specs/human-file-format.md)                                   | `.human` file format specification                           |
| [specs/cli-spec.md](./specs/cli-spec.md)                                                     | CLI command surface and behavioral spec                      |
| [specs/action-spec.md](./specs/action-spec.md)                                               | GitHub Action input and runtime behavior spec                |
| [specs/core-library-api-spec.md](./specs/core-library-api-spec.md)                           | Public npm library API and semantics spec                    |
| [specs/editor-modes-and-expected-behavior.md](./specs/editor-modes-and-expected-behavior.md) | Cross-editor mode behavior and `.human` policy invariants    |
| [specs/bundled-agent-config-spec.md](./specs/bundled-agent-config-spec.md)                   | Bundled agent config generation pipeline and drift detection |
