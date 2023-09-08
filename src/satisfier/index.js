// Copyright (c) 2022 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { satisfactionsMaker } from './satisfactions.js';
import { compileMiniscript } from '../miniscript.js';

/**
 * @typedef {Object} Solution
 * @property {number} nSequence - the maximum nSequence time of all the sat() or dsat() expressions in the solution.
 * @property {number} nLockTime - the maximum nLockTime of all the sat() or dsat() expressions in the solution.
 * @property {string} asm - the resulting witness after combining all the sat() or dsat() expressions.
 */

/**
 * @typedef {Object} Satisfactions
 * @property {Solution[]} sats - An array of {@link Solution} objects representing the sat() expressions.
 * @property {Solution[]} dsats - An array of {@link Solution} objects representing the dsat() expressions.
 * @see {@link Solution}
 */

/**
 * @typedef {Object} SatisfierResult
 * @property {Solution[]} nonMalleableSats - An array of {@link Solution} objects representing the non-malleable sat() expressions.
 * @property {Solution[]} malleableSats - An array of {@link Solution} objects representing the malleable sat() expressions.
 * @property {Solution[]} unknownSats - An array of {@link Solution} objects representing the sat() expressions that contain some of the `unknown` pieces of information.
 * @see {@link Solution}
 */


/**
 * Computes the weight units (WU) of a witness.
 * @param {string} asm - the witness to compute the WU of.
 * @returns {number} the weight units (WU) of the witness.
 */
function witnessWU(asm) {
  // Split the witness string into an array of substrings
  // a miniscipt witness is either, <sig..., <sha256..., <hash256...,
  // <ripemd160..., <hash160...,  <... (for pubkeys) 0 or 1
  const substrings = asm.split(' ');

  // Initialize the sum to 0
  let wu = 0;

  // Iterate over the array of substrings
  for (const substring of substrings) {
    if (substring === '') {
    }
    // Check if the substring starts with "<sig"
    else if (substring.startsWith('<sig')) {
      //https://en.bitcoin.it/wiki/BIP_0137
      //Signatures are either 73, 72, or 71 bytes long
      //Also https://bitcoin.stackexchange.com/a/77192/89665
      wu += 74; //73 + push op code
    }
    //
    // preimages:
    else if (
      substring.startsWith('<sha256_preimage(') ||
      substring.startsWith('<hash256_preimage(') ||
      substring.startsWith('<ripemd160_preimage(') ||
      substring.startsWith('<hash160_preimage(') ||
      substring.startsWith('<random_preimage()>')
    ) {
      //any preimage is checked against <32> with SIZE <32> EQUALVERIFY:
      //See the miniscript Translation table:
      //https://bitcoin.sipa.be/miniscript/
      //SIZE <32> EQUALVERIFY {SHA256,RIPEMD,160,HASH160,HASH256} <h> EQUAL
      wu += 33; //32 + push op code
    }
    // Pub keys
    else if (substring.startsWith('<')) {
      //https://en.bitcoin.it/wiki/BIP_0137
      //Compressed public keys are 33 bytes
      wu += 34; //33 + push op code
    } else if (substring === '1' || substring === '0') {
      wu += 1;
    } else {
      throw new Error(`Invalid witness substring ${substring}`);
    }
  }

  // Return the final wu
  return wu;
}

/**
 * Performs a malleability analysis on an array of sat() solutions.
 * @param {Solution[]} sats - the array of sat() solutions to perform the analysis on.
 * @returns {Object} An object with two keys:
 *   - `nonMalleableSats`: an array of {@link Solution} objects representing the non-malleable sat() expressions.
 *   - `malleableSats`: an array of {@link Solution} objects representing the malleable sat() expressions.
 * @see {@link Solution}
 */
function malleabilityAnalysis(sats) {
  sats = sats
    .map(sat => {
      //Deep copy the objects so that this function is pure
      //(does not mutate sats)
      sat = { ...sat };
      //Extract the signatures used in this witness as an array
      sat.signatures = sat.asm.split(' ').filter(op => {
        return op.startsWith('<sig');
      });
      //A non-zero solution without a signature is malleable, and a solution
      //without signature is unacceptable anyway
      if (sat.signatures.length === 0) {
        sat.dontuse = true;
      }
      //<random_preimage()> is a dissatisfaction for a preimage. It is
      //interchangable for any 32 bytes random number and thus, it is malleable.
      if (sat.asm.includes('<random_preimage()>')) {
        sat.dontuse = true;
      }
      return sat;
    })
    // Sort sats by weight unit in ascending order
    .sort((a, b) => witnessWU(a.asm) - witnessWU(b.asm));

  for (const sat of sats) {
    //For the same nLockTime and nSequence, check if otherSat signatures are a
    //subset of sat. If this is the case then sat cannot be used.
    //"For the same nLockTime and nSequence" condition is set because signatures
    //change for each tuple of (nLockTime, nSequence):
    for (const otherSat of sats) {
      if (
        otherSat !== sat &&
        //for the same nLockTime and nSequence
        otherSat.nLockTime === sat.nLockTime &&
        otherSat.nSequence === sat.nSequence &&
        //is otherSat.signatures equal or a subset of sat.signatures?
        otherSat.signatures.every(sig => sat.signatures.includes(sig))
      ) {
        //sat is for example <sig(key1)> <sig(key2)> and otherSat is <sig(key1)>
        //otherSat cannot be used because an attacker could use it to create
        //<sig(key1)
        sat.dontuse = true;
      }
    }
  }

  const nonMalleableSats = sats.filter(sat => !sat.dontuse);
  const malleableSats = sats.filter(sat => sat.dontuse);

  //Clean the objects before returning them
  for (const sats of [nonMalleableSats, malleableSats]) {
    sats.forEach(sat => {
      delete sat.signatures;
      delete sat.dontuse;
    });
  }

  return { nonMalleableSats, malleableSats };
}

/**
 * Determines whether the specified argument of the given miniscript expression
 * is a scalar.
 * @param {string} functionName - the name of the function to check.
 * @param {number} argPosition - the position of the argument to check,
 * starting from 0.
 * @returns {boolean} `true` if the specified argument of the given function is
 * a scalar; `false` otherwise.
 */
function isScalarArg(functionName, argPosition) {
  switch (functionName) {
    case 'pk_k':
    case 'pk_h':
    case 'older':
    case 'after':
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160':
    case 'multi':
      return true;
    case 'thresh':
      if (argPosition === 0) return true;
  }
  return false;
}

/**
 * Evaluates a miniscript expression and returns its satisfactions.
 *
 * This function is called recursively to find subexpressions
 * within subexpressions until all the arguments of a subexpression are
 * scalars.
 *
 * @param {string} miniscript - A miniscript expression.
 *
 * @returns {Satisfactions} - The satisfactions.
 */
const evaluate = miniscript => {
  if (typeof miniscript !== 'string')
    throw new Error('Invalid expression: ' + miniscript);
  //convert wrappers like this "sln:" into "s:l:n:"
  while (miniscript.match(/^[a-z]{2,}:/)) {
    miniscript = miniscript.replace(/^[a-z]{2,}:/, match =>
      match.replace(match[0], match[0] + ':')
    );
  }
  //https://bitcoin.sipa.be/miniscript/
  //The pk, pkh, and and_n fragments and t:, l:, and u: wrappers are syntactic
  //sugar for other miniscripts:
  miniscript = miniscript
    .replace(/^pk\(/, 'c:pk_k(')
    .replace(/^pkh\(/, 'c:pk_h(')
    .replace(/^and_n\(.*\)/, match =>
      match.replace('and_n', 'andor').replace(/\)$/, ',0)')
    )
    .replace(/^t:(.*)/, match => match.replace('t:', 'and_v(') + ',1)')
    .replace(/^l:(.*)/, match => match.replace('l:', 'or_i(0,') + ')')
    .replace(/^u:(.*)/, match => match.replace('u:', 'or_i(') + ',0)');

  const reArguments = String.raw`[\(:](.*)`;
  const reFunctionName = String.raw`([^\(:]*)`;
  const matchFunctionName = miniscript.match(reFunctionName);
  if (!matchFunctionName) throw new Error('Invalid expression: ' + miniscript);
  const functionName = matchFunctionName[0];
  if (typeof satisfactionsMaker[functionName] !== 'function')
    throw new Error(functionName + ' not implemented');

  let args;
  if (miniscript[functionName.length] === '(')
    args = miniscript.substring(functionName.length + 1, miniscript.length - 1);
  else if (miniscript[functionName.length] === ':')
    args = miniscript.substring(functionName.length + 1);

  //the function arguments for satisfactionsMaker[functionName]:
  //They will be called like using ES6 spread operator:
  //satisfactionsMaker[functionName](...satisfactionMakerArgs)
  const satisfactionMakerArgs = [];
  if (args) {
    let lastCommaPosition = -1;
    let argLevel = 0; //argLevel tracks nested parenthesis
    let argPosition = 0; //argPosition tracks argument order within functionName
    for (let i = 0; i < args.length; i++) {
      args[i] === '(' && argLevel++;
      args[i] === ')' && argLevel--;
      if (argLevel === 0) {
        let arg;
        if (args[i] === ',') {
          arg = args.substring(lastCommaPosition + 1, i);
          lastCommaPosition = i;
        } else if (i === args.length - 1) {
          arg = args.substring(lastCommaPosition + 1);
        }
        if (arg) {
          if (isScalarArg(functionName, argPosition)) {
            //This is the case when arg is a scalar value that will be directly
            //passed to a satisfier maker function (arg is not a nested
            //miniscript expression).
            //That is, arg is one of these: a key or a hash or an nLockTime,
            //nSequence, or the k (number of keys) in thresh/multi.
            satisfactionMakerArgs.push(arg);
          } else {
            //arg is a miniscript expression that has to be further evaluated:
            satisfactionMakerArgs.push(evaluate(arg));
          }
          argPosition++;
        }
      }
    }
  }

  return satisfactionsMaker[functionName](...satisfactionMakerArgs);
};

/**
 * Obtains the satisfactions of a miniscript.
 * @Function
 *
 * @param {string} miniscript - A miniscript expression.
 * @param {object} [options]
 * @param {string[]} [options.unknowns] - An array with the pieces of information that
 * cannot be used to construct solutions because they are unknown.
 *
 * For example, if a honest user cannot sign with `key`, doesn't know the
 * preimage of `H` and the preimage of `e946029032eae1752e181bebab65de15cf0b93aaac4ee0ffdcfccb683c874d43` then `unknown` must be:
 * ```
 * [
 *   '<sig(key)>',
 *   '<ripemd160_preimage(H)>',
 *   '<sha256_preimage(e946029032eae1752e181bebab65de15cf0b93aaac4ee0ffdcfccb683c874d43)>'
 * ]
 * ```
 *
 * Note that an expression will allways be NOT sane if it is NOT sane at the the
 * miniscript top level as per {@link https://bitcoin.sipa.be/miniscript/
 * Wuille's algorithm}.
 *
 * For example; if a miniscript is NOT sane at the top level because it can be
 * satisfyed using only preimages, then setting preimages as unknowns will not
 * change this behaviour.
 *
 * The reason for this limitation is that the satisfier uses an unmodified
 * version of Wuille's algorithm as an initial precondition before finding
 * solutions. If the miniscript is sane, then unknowns can be set to produce
 * more possible solutions, including preimages, as described above.
 *
 * @param {string[]} [options.knowns] - An array
 * with the only pieces of information that can be used to build satisfactions.
 * This is the complimentary to unknowns. Only `knowns` or `unknowns` must be
 * passed.
 *
 * If neither knowns and unknowns is passed then it is assumed that there are
 * no unknowns, in other words, that all pieces of information are known.
 *
 * @returns {SatisfierResult}
 *
 * @see {@link Solution}
 */
export const satisfier = (miniscript, options = {}) => {
  let { unknowns, knowns } = options;
  const { issane, issanesublevel } = compileMiniscript(miniscript);

  if (!issane) {
    throw new Error(`Miniscript ${miniscript} is not sane.`);
  }

  if (typeof unknowns === 'undefined' && typeof knowns === 'undefined') {
    unknowns = [];
  } else if (typeof unknowns !== 'undefined' && typeof knowns !== 'undefined') {
    throw new Error(`Cannot pass both knowns and unknowns`);
  } else if (
    (knowns && !Array.isArray(knowns)) ||
    (unknowns && !Array.isArray(unknowns))
  ) {
    throw new Error(`Incorrect types for unknowns / knowns`);
  }

  const knownSats = [];
  const unknownSats = [];
  const sats = evaluate(miniscript).sats || [];
  sats.map(sat => {
    if (typeof sat.nSequence === 'undefined') delete sat.nSequence;
    if (typeof sat.nLockTime === 'undefined') delete sat.nLockTime;
    //Clean format: 1 consecutive spaces at most, no leading & trailing spaces
    sat.asm = sat.asm.replace(/  +/g, ' ').trim();

    if (unknowns) {
      if (unknowns.some(unknown => sat.asm.includes(unknown))) {
        unknownSats.push(sat);
      } else {
        knownSats.push(sat);
      }
    } else {
      const delKnowns = knowns.reduce(
        (acc, known) => acc.replace(known, ''),
        sat.asm
      );
      if (
        delKnowns.match(
          /<sig\(|<sha256_preimage\(|<hash256_preimage\(|<ripemd160_preimage\(|<hash160_preimage\(/
        )
      ) {
        //Even thought all known pieces of information are removed, there are
        //still other pieces of info needed. Thus, this sat is unkown.
        unknownSats.push(sat);
      } else {
        knownSats.push(sat);
      }
    }
  });

  return { ...malleabilityAnalysis(knownSats), unknownSats };
};
