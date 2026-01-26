//To run it: "node ./example.js"

const {
  compileMiniscript,
  analyzeMiniscript,
  satisfier,
  ready
} = require('./dist/index.js');

(async () => {
  await ready;

  const miniscript = 'and_v(v:pk(key),and_v(v:after(10),after(20)))';
  const analysis = analyzeMiniscript(miniscript);
  const { asm, issane } = compileMiniscript(miniscript);
  const satisfactions = satisfier(miniscript);

  console.log({ miniscript, asm, issane, analysis, satisfactions });
})();
