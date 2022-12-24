//To run it: "node ./example.js"

const {
  compilePolicy,
  compileMiniscript,
  satisfier
} = require('./dist/index.js');

const policy = 'or(and(pk(A),older(8640)),pk(B))';

const {
  miniscript,
  asm: asmFromPolicy,
  issane: issaneFromPolicy
} = compilePolicy(policy);

const { asm: asmFromMiniscript, issane: issaneFromMiniscript } =
  compileMiniscript(miniscript);

const satisfactions = satisfier(miniscript);

console.assert(asmFromPolicy === asmFromMiniscript, 'ERROR: Asm mismatch.');
console.assert(
  issaneFromPolicy === issaneFromMiniscript,
  'ERROR: issane mismatch.'
);

console.log({
  miniscript,
  asm: asmFromMiniscript,
  issane: issaneFromMiniscript,
  satisfactions
});

console.log(
  compileMiniscript('and_v(v:pk(key),or_b(l:after(100),al:after(200)))')
);
