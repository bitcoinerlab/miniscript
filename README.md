# Bitcoin Miniscript

This project is a JavaScript implementation of Bitcoin Miniscript, a high-level language for describing Bitcoin spending policies.

It includes a transpilation of [Peter Wuille's C++ code](https://github.com/sipa/miniscript) for compiling Miniscript policies into Miniscript and into Bitcoin scripts, as well as a Miniscript satisfier for generating expressive witness scripts from the input Miniscript.

## Features

- Compile Miniscript policies into Miniscript and Bitcoin scripts.
- A Miniscript satisfyer that discards malleable solutions.
- Generate expressive witness scripts from Miniscript.
F.ex., Miniscript `and_v(v:pk(key),after(10))` is satisfied with: `[{ witness: '<sig(key)>', nLockTime: 10 }]`.
- Generate different satisfactions depending on `unknowns`.
F.ex., Miniscript `c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))` is satisfied with: `[{ witness: '<sig(key2)> <ripemd160_preimage(H)> 0' }]`.
However, when setting `unknowns: ['<ripemd160_preimage(H)>']`, the satisfaction is: `[{ witness: '<sig(key2)> <sig(key1)>' }]` as it cannot be considered malleable (pre-image is unknown).
- Thoroughly tested.

## Installation

### Using npm

To install the package, use npm:

```
npm install @bitcoinerlab/miniscript
```

### From source

To download the source code and build the project, you can use the following steps:

1. Clone the repository:

```
git clone https://github.com/<your-username>/bitcoin-miniscript.git
```

2. Install the dependencies:

```
npm install
```

3. Make sure you have [`em++` compiler](https://emscripten.org/) and available in your PATH.

4. Run the Makefile:

```
make
```

This will build Wuille's sources and generate the necessary Javascript files.

5. Build it:

```
npm run build
```

This will build the project and generate the necessary files in the dist directory.

## Usage

### Compiling Miniscript policies into Miniscript and Bitcoin script

To compile a Miniscript policy into a Miniscript and ASM, you can use the `compilePolicy` function:

```javascript
const { compilePolicy } = require('@bitcoinerlab/miniscript');

const policy = 'or(and(pk(A),older(8640)),pk(B))';
const { miniscript, asm, issane } = compilePolicy(policy);
```

### Compiling Miniscript into Bitcoin script

To compile a Miniscript into Bitcoin ASM you can use the `compileMiniscript` function:

```javascript
const { compileMiniscript } = require('@bitcoinerlab/miniscript');

const miniscript = 'and_v(v:pk(key),or_b(l:after(100),al:after(200)))';
const { asm, issane } = compileMiniscript(miniscript);
```

### Generating expressive witness scripts

To generate an expressive witness script from a Miniscript, you can use the satisfyer function:

```javascript
const { satisfyer } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';
const satisfactions = satisfyer(miniscript);
```

You can also set `unknowns`:

```javascript
const { satisfyer } = require('@bitcoinerlab/miniscript');

const miniscript =
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))';

const unknowns = ['<sig(key1)>', '<sig(key2)>'];
const satisfactions = satisfyer(miniscript, unknowns);
```

## Documentation

To generate the documentation for this project, you can use the following command:

```
npm run docs
```

This will generate the documentation in the `docs` directory.

## License

This project is licensed under the MIT License.
