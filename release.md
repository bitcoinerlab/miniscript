# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 2.0.0 - 2026-01-29

### Breaking changes

- `computeUnknowns` is a new opt-in option. Previously, unknown satisfactions
  were always computed; now `unknownSats` is omitted unless enabled.
- `maxSolutions` is a new cap with a default of 1000. Previously, enumeration
  was unbounded; now it throws once the cap is exceeded. Set `maxSolutions:
  null` to disable the limit. Passing 0 or a negative value throws.

### Added

- Support for deriving satisfactions in tapscript context.

### Changed

- Satisfier prunes unknown satisfactions by default.
- Witness weight sorting is tapscript-aware (Schnorr/x-only sizing heuristic).
- Satisfier result shape now omits `unknownSats` unless enabled.

### Docs

- README updated with a TypeScript-focused intro, malleability explanation,
  pruning/limits guidance, and refreshed examples and build steps.
- COMPILER.md updated for TypeScript references and new satisfier behavior.

### Tests

- Satisfier tests now exercise both computeUnknowns modes; fixtures include
  explicit `unknownSats` arrays and throw cases include empty sats arrays.
