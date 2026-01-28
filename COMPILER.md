# Miniscript Analyzer Internals

This document is for contributors who want to understand or extend the
JavaScript Miniscript analyzer. It focuses on the static type system and how it
produces `issane` and `issanesublevel`, while keeping the satisfier-based
enumeration intact.

## High-level flow

1. Parse the Miniscript expression into a lightweight AST.
2. Run static analysis on the AST (correctness + malleability + timelocks).
3. Derive `issane` and `issanesublevel`.
4. If sane, the satisfier enumerates witnesses and classifies them as
   non-malleable or malleable.

Key modules:

- `src/compiler/parse.ts`: parses expressions into an AST.
- `src/compiler/compile.ts`: compiles the AST into ASM.
- `src/compiler/correctness.ts`: correctness type rules.
- `src/compiler/malleability.ts`: malleability type rules.
- `src/compiler/analyze.ts`: analysis pass that computes sanity flags.
- `src/compiler/index.ts`: entry point that wires parse + compile + analysis.

## AST model

AST stands for **Abstract Syntax Tree**. It is the tree representation of a
Miniscript expression where each node corresponds to one fragment or wrapper.

The parser builds a minimal AST that matches Miniscript fragments and wrappers.
A **node** is a plain object that always contains:

- `type`: the Miniscript fragment identifier (string)

Depending on the fragment, a node may also contain:

- `key`: a key identifier (for `pk_k`, `pk_h`)
- `value`: a scalar value (for `after`, `older`, hashes)
- `k`: a numeric threshold (for `thresh`, `multi`, `multi_a`)
- `keys`: array of keys (for `multi`, `multi_a`)
- `arg`: a single child node (for unary wrappers `a/s/c/d/v/j/n`)
- `args`: array of child nodes (for binary/ternary operators like `and_v`,
  `or_b`, `andor`)
- `subs`: array of child nodes (for `thresh`)

Values are kept as strings during parsing; numeric validation happens in the
analyzer and compiler.

Example input and shape:

```
and_v(v:pk(A),after(10))

{
  type: 'and_v',
  args: [
    { type: 'v', arg: { type: 'pk_k', key: 'A' } },
    { type: 'after', value: '10' }
  ]
}
```

Other examples:

- AST shape (summary):

```
Node :=
  { type, ... }

type in:
  - "0" | "1"
  - pk_k | pk_h (key)
  - after | older (value)
  - sha256 | hash160 | ... (value)
  - multi | multi_a (k, keys[])
  - thresh (k, subs[])
  - and_v/or_b/... (args[2])
  - andor (args[3])
  - a/s/c/d/v/j/n (arg)
```

- Base nodes: `0`, `1`, `pk_k`, `pk_h`, `multi`, `multi_a`, `sha256`, `after`,
  `older`, `thresh`, `and_v`, `or_b`, `andor`, etc.
- Wrapper nodes: `a`, `s`, `c`, `d`, `v`, `j`, `n` as unary nodes with `arg`.
- Syntactic sugar is expanded during parsing:
  - `pk(x)` -> `c:pk_k(x)`
  - `pkh(x)` -> `c:pk_h(x)`
  - `and_n(x,y)` -> `andor(x,y,0)`
  - `t:`/`l:`/`u:` wrappers expand to `and_v`/`or_i` forms

The AST is intentionally simple so it can be shared by the compiler and the
static analyzer.

## Type system overview

The static type system mirrors the Miniscript specification:

- **Correctness**: basic type (B/V/K/W), z/o/n input modifiers, dissatisfiable
  flag and unit output.
- **Malleability**: signed (`s`), forced (`f`), expressive (`e`), plus derived
  `nonMalleable`.

These rules are encoded in `src/compiler/correctness.ts` and
`src/compiler/malleability.ts` and are pure functions that take child types and
return a parent type (or an error).

### Correctness fields

Correctness is tracked as a small record with these fields:

- `basicType`: one of `B`, `V`, `K`, `W` (boolean, verify, key or wrapped output).
- `zeroArg`: `z` modifier (consumes exactly 0 stack elements).
- `oneArg`: `o` modifier (consumes exactly 1 stack element).
- `nonZero`: `n` modifier (top input is never required to be zero).
- `dissatisfiable`: whether the fragment has a valid dissatisfaction (dsat).
- `unit`: whether the fragment leaves exactly one stack element (`u`).

These fields are combined by the correctness rules (for example, `or_b` requires
both children to be dissatisfiable and produces a `B` output).

Context differences: in Tapscript, `d:X` gains the `unit` (`u`) property because
`SCRIPT_VERIFY_MINIMALIF` enforces exact 0/1 encoding for IF.

### Malleability fields

Malleability uses the Miniscript `s/f/e` properties from the
"Guaranteeing non-malleability" section of the spec:

- `signed`: every satisfaction requires a signature.
- `forced`: every dissatisfaction requires a signature (or none exist).
- `expressive`: a unique unconditional dissatisfaction exists and any
  conditional dissatisfactions require signatures.
- `nonMalleable`: derived from the spec's "Requires" column to guarantee a
  non-malleable satisfaction exists.

## Correctness vs malleability

Correctness properties answer "is this miniscript well-typed and semantically
valid?" They ensure fragments are used in the right context (B/V/K/W rules),
require the right kind of stack input and preserve intended meaning. Without
correctness, a miniscript may compile to ASM but no longer represent the policy
it claims (for example, an `or_b` that behaves like `and`).

Malleability properties answer "if it is valid, can it be spent without
malleable witnesses?" They are only meaningful after correctness passes.

In code, correctness and malleability rules live side-by-side in
`src/compiler/correctness.ts` and `src/compiler/malleability.ts`. Correctness
helpers return `{ ok, correctness, error? }` and malleability helpers return
`signed/forced/expressive` plus `nonMalleable`. Both are applied in
`src/compiler/analyze.ts` during `analyzeNode`.

## Analysis pass

`src/compiler/analyze.ts` walks the AST and computes:

- **Type information** via the type rules.
- **Timelock mixing** via `TimelockInfo` and the combine functions.
- **Duplicate keys** by merging key sets from child nodes.

`analyzeParsedNode` converts those results into:

- `issanesublevel`: requires signature, non-malleable, no timelock mixing,
  and no duplicate keys.
- `issane`: `issanesublevel` plus top-level `B` type requirement.

The analysis returns a short error code (e.g., `Malleable`,
`HeightTimelockCombination`, `RepeatedPubkeys`) to help with debugging.

## Timelock mixing

Timelocks are tracked by `TimelockInfo`:

- `after()` sets CLTV height/time flags.
- `older()` sets CSV height/time flags (via `bip68`).

The combine rules follow the spec:

- For disjunctions (`k=1`), timelock info is unioned.
- For conjunctions (`k>1`), incompatible height/time combinations set
  `contains_combination` to mark timelock mixing.

## Satisfier integration

The satisfier still enumerates all satisfactions, but it now runs the static
analysis first. If `issane` is false, it throws:

```
Miniscript <expr> is not sane.
```

Raw analysis errors are attached to `err.cause` for debugging.

## Extending the analyzer

When adding a new fragment, update all four layers:

1. **Parser**: add a case in `parse.js`.
2. **Compiler**: add ASM generation in `compile.js`.
3. **Type system**: add correctness and malleability rules in
   `src/compiler/correctness.ts` and `src/compiler/malleability.ts`.
4. **Analyzer**: add a case in `analyze.js` and merge keys/timelocks.

This keeps compile, analyze and satisfy behavior consistent.
