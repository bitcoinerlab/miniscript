# Bitcoin Miniscript

This project is a JavaScript implementation of [Bitcoin Miniscript](https://bitcoin.sipa.be/miniscript/), a high-level language for describing Bitcoin spending conditions.

It includes a novel Miniscript Satisfier for generating explicit script witnesses that are decoupled from the tx signer, as well as a transpilation of [Peter Wuille's C++ code](https://github.com/sipa/miniscript) for compiling spending policies into Miniscript and Bitcoin scripts.

## Features

- Compile Policies into Miniscript and Bitcoin scripts.
- A Miniscript satisfier that enumerates satisfactions and classifies them as non-malleable vs malleable.
- The Miniscript Satisfier is able to generate explicit script witnesses from Miniscript expressions using variables, such as `pk(key)`.

  For example, Miniscript `and_v(v:pk(key),after(10))` can be satisfied with `[{ asm: '<sig(key)>', nLockTime: 10 }]`.

- The ability to generate different satisfactions depending on the presence of `unknowns` (or complimentary `knowns`).

  For example, Miniscript `c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))` can be satisfied with: `[{ asm: '<sig(key2)> <ripemd160_preimage(H)> 0' }]`.

  However, if `unknowns: ['<ripemd160_preimage(H)>']` is set, then the Miniscript can be satisfied with: `[{ asm: '<sig(key2)> <sig(key1)>' }]` because this solution can no longer be considered malleable, given then assumption that an attacker does not have access to the preimage.

- Thoroughly tested.

## Installation

To install the package, use npm:

```
npm install @bitcoinerlab/miniscript
```

## Usage

You can test the examples in this section using the online playground demo available at https://bitcoinerlab.com/modules/miniscript.

### Compiling Policies into Miniscript and Bitcoin script

Policy compilation is provided by the companion package
[`@bitcoinerlab/miniscript-policies`](https://github.com/bitcoinerlab/miniscript-policies),
which bundles the reference C++ compiler via Emscripten.

```javascript
const { compilePolicy } = require('@bitcoinerlab/miniscript-policies');

const policy = 'or(and(pk(A),older(8640)),pk(B))';
const { miniscript, asm, issane } = compilePolicy(policy);
```

`issane` is a boolean that indicates whether the Miniscript is valid and follows the consensus and standardness rules for Bitcoin scripts. A sane Miniscript should have non-malleable solutions, not mix different timelock units on a single branch of the script and not contain duplicate keys. In other words, it should be a well-formed and standards-compliant script that can be safely used in transactions.

### Compiling Miniscript into Bitcoin script

To compile a Miniscript into Bitcoin ASM you can use the `compileMiniscript` function:

```javascript
const { compileMiniscript } = require('@bitcoinerlab/miniscript');

const miniscript = 'and_v(v:pk(key),or_b(l:after(100),al:after(200)))';

const { asm, issane } = compileMiniscript(miniscript);
```

### Generating explicit script witnesses

To generate explicit script witnesses from a Miniscript, you can use the `satisfier` function:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';

const { nonMalleableSats, malleableSats } = satisfier(miniscript);
```

`satisfier` makes sure that output `satisfactions` are non-malleable and that the `miniscript` is sane by itself and it returns an object with keys:

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

Where satisfactions are ordered in ascending Weight Unit size.

In addition, `unknowns` can be set with the pieces of information the user does not have, f.ex., `<sig(key)>` or `<ripemd160_preimage(H)>`:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';
const unknowns = ['<sig(key1)>', '<sig(key2)>'];

const { nonMalleableSats, malleableSats, unknownSats } = satisfier(
  miniscript,
  { unknowns }
);
```

When passing `unknowns`, `satisfier` returns an additional object: `{ unknownSats }` with an array of objects representing satisfactions that containt some of the `unknown` pieces of information:

```javascript
nonMalleableSats: [
  {asm: "<sig(key4)> 0"}
  {asm: "<sig(key3)> <key3> 0 <key1> 1"}
]
unknownSats: [ {asm: "<sig(key2)> <key2> <sig(key1)> <key1> 1"} ]
```

Instead of `unknowns`, the user has the option to provide the complementary argument `knowns`: `satisfier( miniscript, { knowns })`. This argument corresponds to the only pieces of information that are known. For instance, in the example above, `knowns` would be `['<sig(key3)>', '<sig(key4)>']`. It's important to note that either `knowns` or `unknowns` must be provided, but not both. If neither argument is provided, it's assumed that all signatures and preimages are known.

### Tapscript context

Miniscript validity depends on the script context. In tapscript, `MINIMALIF` is
consensus, which changes the `d:X` wrapper (it becomes unit) and multisig uses
`multi_a` (CHECKSIGADD) instead of `multi` (CHECKMULTISIG). The satisfier runs
the static analyzer first, so you must pass the tapscript context when
enumerating tapscript miniscripts:

```javascript
const { satisfier } = require('@bitcoinerlab/miniscript');

const miniscript = 'multi_a(2,key1,key2,key3)';
const { nonMalleableSats } = satisfier(miniscript, { tapscript: true });
```

The objects returned in the `nonMalleableSats`, `malleableSats` and `unknownSats` arrays consist of the following properties:

- `asm`: a string with the script witness.
- `nSequence`: an integer representing the nSequence value, if needed.
- `nLockTime`: an integer representing the nLockTime value, if needed.

### Satisfier-based malleability analysis

This library implements the Miniscript [static type system](https://bitcoin.sipa.be/miniscript/)
in JavaScript and exposes `issane`/`issanesublevel` via `analyzeMiniscript`. The
`satisfier` uses that analysis and will throw if a miniscript is not sane.

When a miniscript is sane, the satisfier **enumerates satisfactions** and
classifies each as **non-malleable** or **malleable**. Even for sane scripts,
there can be malleable satisfactions; they should never be used to spend funds.

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
  "malleableSats": [
    { "asm": "<sig(key3)> <sig(key2)> <sig(key1)>" }
  ],
  "unknownSats": []
}
```

In this example, the satisfier exposes both safe and malleable witnesses. Use
only `nonMalleableSats` when constructing a spend.

#### Recommended usage

- Call `analyzeMiniscript` (or inspect `issane` from `compileMiniscript`) to
ensure the miniscript is sane before enumeration.
- When spending, construct witnesses **only** from `nonMalleableSats`.
- Treat `malleableSats` as diagnostics and never use them for production spends.

### Tradeoffs and limitations

The number of satisfactions can grow exponentially with Miniscript structure
(e.g., large `thresh` trees). Most practical scripts remain small, but complex
scripts can become expensive to analyze or infeasible to enumerate. As a
reference point, `multi(2,key1,...,key20)` produces 190 satisfactions and
completes in about 200ms on a laptop, while `multi(4,key1,...,key20)` yields
4,845 satisfactions and takes around 6 seconds. This is a known tradeoff of the
satisfier-based approach.

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

3. Make sure you have the [`em++` compiler](https://emscripten.org/) in your PATH.

4. Run the Makefile:

```
make
```

This will download and build Wuille's sources and generate the necessary Javascript files for the compilers.

5. Build the project:

```
npm run build
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
