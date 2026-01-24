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

To compile a Policy into a Miniscript and Bitcoin ASM, you can use the `compilePolicy` function:

```javascript
const { compilePolicy } = require('@bitcoinerlab/miniscript');

const policy = 'or(and(pk(A),older(8640)),pk(B))';

const { miniscript, asm, issane } = compilePolicy(policy);
```

`issane` is a boolean that indicates whether the Miniscript is valid and follows the consensus and standardness rules for Bitcoin scripts. A sane Miniscript should have non-malleable solutions, not mix different timelock units on a single branch of the script, and not contain duplicate keys. In other words, it should be a well-formed and standards-compliant script that can be safely used in transactions.

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

The objects returned in the `nonMalleableSats`, `malleableSats` and `unknownSats` arrays consist of the following properties:

- `asm`: a string with the script witness.
- `nSequence`: an integer representing the nSequence value, if needed.
- `nLockTime`: an integer representing the nLockTime value, if needed.

### Satisfier-based malleability analysis

This library **enumerates satisfactions** for a Miniscript and classifies each
as **non-malleable** or **malleable**.

This approach is **dynamic**: it evaluates malleability on a per-satisfaction
basis by exploring the space of possible witnesses. In contrast, the [Miniscript
specification](https://bitcoin.sipa.be/miniscript/) and the reference [C++
implementation](https://github.com/sipa/miniscript) rely on **static typing plus
a non-malleable satisfier construction**. Under the reference rules, a
Miniscript is rejected if it admits a **spending context** (e.g., a particular
locktime/sequence regime) in which the output is spendable but **every valid
satisfaction is malleable**.

This library may still accept such Miniscripts and will surface:

- `nonMalleableSats`: satisfactions that are safe to use and
- `malleableSats`: satisfactions that should not be used because a third party
can transform them into a different valid satisfaction (without additional
secrets).

Example (malleable vs non-malleable spending contexts):

```javascript
const miniscript = 'and_v(v:pk(key),or_b(l:after(100),al:after(200)))';
const result = satisfier(miniscript);
```

```json
{
  "nonMalleableSats": [
    { "nLockTime": 100, "asm": "1 0 <sig(key)>" }
  ],
  "malleableSats": [
    { "nLockTime": 200, "asm": "0 1 <sig(key)>" },
    { "nLockTime": 200, "asm": "0 0 <sig(key)>" }
  ],
  "unknownSats": []
}
```

In this example, the Miniscript has a **non-malleable satisfaction** when using
`nLockTime = 100`. However, when `nLockTime = 200`, the output is still
spendable but only **malleable satisfactions** exist (the witness differs only
in selector values while the signature remains the same). Under the reference
Miniscript rules, this makes the Miniscript **insane**, because there exists a
satisfiable spending context with **no** non-malleable satisfaction.

If your intended spend requires a context that only admits malleable
satisfactions, you should reject the Miniscript for that use case.

#### Recommended usage

- Before adopting a Miniscript, verify that `nonMalleableSats` contains at least
one satisfaction matching the spending context you intend to use (e.g., required
`nLockTime` / `nSequence` constraints).
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
