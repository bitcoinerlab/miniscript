# Bitcoin Miniscript

Miniscript is a structured, analyzable language for Bitcoin spending conditions
that compiles to Bitcoin Script. This package provides a TypeScript
implementation for compiling and analyzing miniscript and for deriving witnesses
(the data a spending transaction must provide to unlock an output created by the
miniscript-derived script).

## Installation

To install the package, use npm:

```
npm install @bitcoinerlab/miniscript
```

## Usage

You can test the examples in this section using the online playground demo available at <https://bitcoinerlab.com/modules/miniscript>.

### Compiling Policies into Miniscript and Bitcoin script

Policies are a higher-level, human-readable language for describing spending
conditions (for example: and/or clauses, timelocks and key checks). Policy
compilation is provided by the companion package
[`@bitcoinerlab/miniscript-policies`](https://github.com/bitcoinerlab/miniscript-policies).

```javascript
const { compilePolicy } = require('@bitcoinerlab/miniscript-policies');

const policy = 'or(and(pk(A),older(8640)),pk(B))';
const { miniscript } = compilePolicy(policy);
```

### Compiling Miniscript into Bitcoin script

To compile a Miniscript into Bitcoin ASM you can use the `compileMiniscript` function:

```javascript
const { compileMiniscript } = require('@bitcoinerlab/miniscript');

const miniscript = 'and_v(v:pk(key),or_b(l:after(100),al:after(200)))';

const { asm } = compileMiniscript(miniscript);
```

### Generating script witnesses

To generate script witnesses from a Miniscript, you can use the `satisfier` function:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';

const { nonMalleableSats, malleableSats } = satisfier(miniscript);
```

SegWit eliminated classic txid malleability, but witness malleability still
exists: a spend can have multiple valid witness stacks that keep the txid
unchanged while changing the transaction weight and fee rate. An attacker could
swap a valid witness for another and make the transaction larger or smaller,
which can affect fee policies or mempool acceptance. The satisfier therefore
separates non-malleable solutions (stable, unique witnesses) from malleable
ones (alternate valid witnesses that can change weight) and you should only
use the non-malleable set when constructing spends.

`satisfier` returns an object with the following keys:

- `nonMalleableSats`: an array of objects representing good, non-malleable witnesses.
- `malleableSats`: an array of objects representing malleable witnesses that should not be used.

In the example above `nonMalleableSats` is:

```javascript
nonMalleableSats: [
  {asm: "<sig(key4)> 0"}
  {asm: "<sig(key3)> <key3> 0 <key1> 1"}
  {asm: "<sig(key2)> <key2> <sig(key1)> <key1> 1"}
]
```

Where satisfactions are ordered in ascending Weight Unit size, so you can
choose the smallest witness and pay less in fees.

**Managing Satisfactions Growth**

Some scripts can generate many satisfactions, which can make computation
expensive or even infeasible. To keep this manageable, the satisfier enforces a
default cap of `1000` solutions. The cap counts all derived solutions, including
intermediate combinations and throws once exceeded. You can raise it
or disable it with `satisfier(miniscript, { maxSolutions: null});`.

However, the recommended way to avoid exponential blow-ups is to prune using
`unknowns`. Pass `unknowns` with the pieces of information that are not
available, e.g., `<sig(key)>` or `<ripemd160_preimage(H)>`.

For example:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';
const unknowns = ['<sig(key1)>', '<sig(key2)>'];

const { nonMalleableSats, malleableSats } = satisfier(miniscript, { unknowns });
```

produces:

```text
nonMalleableSats: [
  {asm: "<sig(key4)> 0"}
  {asm: "<sig(key3)> <key3> 0 <key1> 1"}
]
```

Instead of `unknowns`, the user has the option to provide the complementary
argument `knowns`: `satisfier(miniscript, { knowns })`. This argument
corresponds to the only pieces of information that are known. For instance, in
the example above, `knowns` would be `['<sig(key3)>', '<sig(key4)>']`. It's
important to note that either `knowns` or `unknowns` must be provided, but not
both. If neither argument is provided, it's assumed that all signatures and
preimages are known.

When modeling adversaries, include in `knowns` everything an attacker might
also possess, not only your own secrets. If you leave attacker material out of
`knowns`, you can mistakenly classify a malleable path as safe. A safe pattern
is to include all attacker-accessible material in `knowns`, then pick a
non-malleable satisfaction that uses only your own material.

For debugging or educational purposes, you can compute the discarded unknown
satisfactions by setting `computeUnknowns: true`. This populates `unknownSats`
with the solutions that contain unknown data:

```javascript
const { nonMalleableSats, unknownSats } = satisfier(miniscript, {
  unknowns,
  computeUnknowns: true
});

nonMalleableSats: [
  {asm: "<sig(key4)> 0"}
  {asm: "<sig(key3)> <key3> 0 <key1> 1"}
]
unknownSats: [ {asm: "<sig(key2)> <key2> <sig(key1)> <key1> 1"} ]
```

By default `computeUnknowns` is disabled to keep the number of solutions manageable, so
unknown satisfactions are pruned and `unknownSats` is not returned.

### Tapscript context

Miniscript validity depends on the script context. In tapscript, `MINIMALIF` is
consensus, which changes the `d:X` wrapper (it becomes unit) and multisig uses
`multi_a` (CHECKSIGADD) instead of `multi` (CHECKMULTISIG). The satisfier runs
the static analyzer first, so you must pass the tapscript context when
deriving satisfactions for tapscript miniscripts:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript = 'multi_a(2,key1,key2,key3)';
const { nonMalleableSats } = satisfier(miniscript, { tapscript: true });
```

The objects returned in the `nonMalleableSats`, `malleableSats` and (when
`computeUnknowns` is enabled) `unknownSats` arrays consist of the following
properties:

- `asm`: a string with the script witness.
- `nSequence`: an integer representing the nSequence value, if needed.
- `nLockTime`: an integer representing the nLockTime value, if needed.

### Deriving satisfactions

The `satisfier` runs the Miniscript [static type system](https://bitcoin.sipa.be/miniscript/)
analysis and throws when a miniscript is not sane. A sane miniscript follows
consensus and standardness rules: it avoids malleable-only paths, does not mix
timelock units on a single branch and does not contain duplicate keys. For sane
scripts it **derives satisfactions** and classifies them as
**non-malleable** or **malleable**. Even for sane scripts, there can be
malleable satisfactions. They should never be used to spend funds.

Example (safe vs malleable satisfactions):

```javascript
const miniscript = 'and_v(v:pk(key1),or_b(pk(key2),a:pk(key3)))';
const result = satisfier(miniscript);
```

```json
{
  "nonMalleableSats": [
    { "asm": "0 <sig(key2)> <sig(key1)>" },
    { "asm": "<sig(key3)> 0 <sig(key1)>" }
  ],
  "malleableSats": [{ "asm": "<sig(key3)> <sig(key2)> <sig(key1)>" }]
}
```

In this example, the satisfier exposes both safe and malleable witnesses. Use
only `nonMalleableSats` when constructing a spend; `malleableSats` (and
`unknownSats` when enabled) are diagnostics only.

Remember that solutions can grow exponentially with Miniscript structure (e.g.,
large `thresh` trees). As a reference point, `multi(2,key1,...,key20)` produces
190 satisfactions and completes in about 200ms on a laptop, while
`multi(4,key1,...,key20)` yields 4,845 satisfactions and takes around 6 seconds.

#### Recommended usage

- Call `analyzeMiniscript` (or inspect `issane` from `compileMiniscript`) to
  ensure the miniscript is sane before deriving witnesses.
- When spending, construct witnesses **only** from `nonMalleableSats`.
- Treat `malleableSats` (and `unknownSats` when enabled) as diagnostics and never use them for production spends.

When you pass `knowns` or `unknowns`, pruning is applied. With
`multi(4,key1,...,key20)`, if you pass `knowns` for only four keys, pruning
yields 1 satisfaction instead of 4,845. If six signatures are known, pruning
yields 15 satisfactions (`C(6,4) = 15`). Enable `computeUnknowns` only when you
want to inspect the discarded solutions.

## Authors and Contributors

The project was initially developed and is currently maintained by [Jose-Luis Landabaso](https://github.com/landabaso). Contributions and help from other developers are welcome.

Here are some resources to help you get started with contributing:

### Building from source

To download the source code and build the project, follow these steps:

1. Clone the repository:

```
git clone https://github.com/bitcoinerlab/miniscript.git
```

2. Install the dependencies:

```
npm install
```

3. Build the project:

```
npm run build
```

4. Run the test suite:

```
npm test
```

This will build the project and generate the necessary files in the `dist` directory.

### Documentation

To generate the programmers's documentation, which describes the library's programming interface, use the following command:

```
npm run docs
```

This will generate the documentation in the `docs` directory.

### Testing

Before committing any code, make sure it passes all tests by running:

```
npm run tests
```

## License

This project is licensed under the MIT License.
