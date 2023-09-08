// Copyright (c) 2022 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { maxLock, ABSOLUTE, RELATIVE } from './maxLock.js';

/**
 * Given a `solutionTemplate`, such as "0 dsat(X) sat(Y) 1 sat(Z)", and given the
 * sat/dissatisfactions for X, Y, Z,... (comprised in `satisfactionsMap`) it
 * computes all the possible combination of solutions returned in an array
 * of {@link Solution}.
 *
 * Terminology:
 *
 * A solution of type {@link Solution} is an object
 * that contains an unlocking witness for a
 * miniscript fragment.
 *
 * When matching an unlocking witness with a locking
 * script, they can produce True or False. These solutions are called sats and
 * dsats, respectively.
 *
 * For example, take this solution: `sol = {asm:"sig key"}`.
 *
 * When matched with `DUP HASH160 <HASH160(key)> EQUALVERIFY CHECKSIG` it
 * produces `True`, that is, a valid sat solution: `<sig> <key> DUP HASH160 <HASH160(key)> EQUALVERIFY CHECKSIG`.
 *
 * A solution object can also contain other associated pieces of information: `solution: {asm, nLockTime, nSequence}`:
 *   -  nLockTime, nSequence: (number/str) interlock attached to this transaction
 *
 * A `solutionTemplate` describes a solution using sats and dsats of subexpressions.
 *
 * F.ex., this is a `solutionTemplate = "0 dsat(X) sat(Y) 1 sat(Z)"`.
 *
 * satisfactions is an object of type {@link Satisfactions}
 * that comprises both sat and dsat solutions for a
 * miniscript fragment:
 *
 *   `satisfactions = {sats: [sol_s1, sol_s2, ...], dsats: [sol_d1, ...]}`
 *
 * satisfactionsMap is a group of satisfactions:
 * ```javascript
 *   satisfactionsMap = { X: satisfactions_X, Y: satisfactions_Y, ...} =
 *   satisfactionsMap = {
 *                     X: {
 *                         sats: [sol_s1, sol_s2, ...],
 *                         dsats:[...]
 *                     },
 *                     Y: {sats: [...], dsats: [...]},
 *                     ...}
 * ```
 *
 * @param {string} solutionTemplate - a string containing sat or dsat expressions such as: "0 dsat(X) sat(Y) 1 sat(Z)"
 * @param {Object} satisfactionsMap - an object mapping the arguments for the sat and dsat expressions
 * in `solutionTemplate` (f.ex: `X, Y, Z`) to their {@link Satisfactions}.
 * @param {Satisfactions} [satisfactionsMap.X] - The satisfactions for `X`
 * @param {Satisfactions} [satisfactionsMap.Y] - The satisfactions for `Y`
 * @param {Satisfactions} [satisfactionsMap.Z] - The satisfactions for `Z`
 * @param {Satisfactions} [satisfactionsMap....] - The satisfactions for `...`
 *
 * @returns {Solution[]} an array of solutions, containing the resulting witness, nSequence and nLockTime values, and whether the solution has a HASSIG marker or should be marked as "DONTUSE".
 */

function combine(solutionTemplate, satisfactionsMap) {
  //First, break solutionTemplate into 3 parts:
  //  pre + curr + post,
  //where curr is the first sat(...)/dsat(...) in solutionTemplate.
  //
  //For example, in "0 dsat(X) sat(Y) 1 sat(Z)":
  //  pre= "0 "; curr = "dsat(X)"; post: " sat(Y) sat(Z)"
  //
  //Recursively call combine(post) until there are no further
  //sat()/dsat() in *post*

  //regExp that matches the first dsat(...) or sat(...):
  const reCurr = /d?sat\(([^\(]*)\)/;
  const currMatch = solutionTemplate.match(reCurr);

  if (currMatch && currMatch.length) {
    //The array of solutions to be computed and returned.
    const solutions = [];

    //curr is the first d?sat() matched in solutionTemplate:
    const curr = currMatch[0];
    //pre is whatever was before the first d?sat():
    const pre = solutionTemplate.split(curr)[0];
    //post is whatever was after the first d?sat():
    const post = solutionTemplate.slice(curr.length + pre.length);

    //the argument for curr: d?sat( -> argument <- ):
    //This will match the string "X" in the example above:
    //currArg = "X" for solutionTemplate "0 dsat(X) sat(Y) 1 sat(Z)"
    const currArg = currMatch[1];
    //currKey = "sats" or "dsats". "dsats" for the example above.
    const currKey = curr[0] === 'd' ? 'dsats' : 'sats';

    if (typeof satisfactionsMap[currArg] !== 'object')
      throw new Error(
        `satisfactionsMap does not provide sats/dsats solutions for argument ${currArg}, evaluating: ${solutionTemplate}`
      );
    const currSolutions = satisfactionsMap[currArg][currKey] || [];
    for (const currSolution of currSolutions) {
      //Does *post* contain further sat() or dsat() expressions?
      if (post.match(reCurr)) {
        //There are more sat/dsat, do a recursive call:
        const postSolutions = combine(post, satisfactionsMap);
        for (const postSolution of postSolutions) {
          //if ((currSolution.nLockTime && postSolution.nLockTime)) return [];
          solutions.push({
            nSequence: maxLock(
              currSolution.nSequence,
              postSolution.nSequence,
              RELATIVE
            ),
            nLockTime: maxLock(
              currSolution.nLockTime,
              postSolution.nLockTime,
              ABSOLUTE
            ),
            asm: `${pre}${currSolution.asm}${postSolution.asm}`
          });
        }
      } else {
        //This was the last instance of combine where there are no *post*
        //sat/dsats
        solutions.push({
          ...currSolution,
          asm: `${pre}${currSolution.asm}${post}`
        });
      }
    }
    //markDontUseSolutions(solutions);

    return solutions;
  }
  throw new Error('Invalid solutionTemplate: ' + solutionTemplate);
}

/**
 * An object containing functions for generating Basic satisfaction and dissatisfaction sets for miniscripts.
 *
 * @see {@link https://bitcoin.sipa.be/miniscript/}
 * @typedef {Object} SatisfactionsMaker
 *
 */
export const satisfactionsMaker = {
  0: () => ({
    dsats: [{ asm: `` }]
  }),
  1: () => ({
    sats: [{ asm: `` }]
  }),
  pk_k: key => ({
    dsats: [{ asm: `0` }],
    sats: [{ asm: `<sig(${key})>` }]
  }),
  pk_h: key => ({
    dsats: [{ asm: `0 <${key}>` }],
    sats: [{ asm: `<sig(${key})> <${key}>` }]
  }),
  older: n => ({
    sats: [{ asm: ``, nSequence: n }]
  }),
  after: n => ({
    sats: [{ asm: ``, nLockTime: n }]
  }),
  sha256: h => ({
    sats: [{ asm: `<sha256_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  ripemd160: h => ({
    sats: [{ asm: `<ripemd160_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  hash256: h => ({
    sats: [{ asm: `<hash256_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  hash160: h => ({
    sats: [{ asm: `<hash160_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  andor: (X, Y, Z) => ({
    dsats: [
      ...combine(`dsat(Z) dsat(X)`, { X, Y, Z }),
      ...combine(`dsat(Y) sat(X)`, { X, Y, Z })
    ],
    sats: [
      ...combine('sat(Y) sat(X)', { X, Y, Z }),
      ...combine('sat(Z) dsat(X)', { X, Y, Z })
    ]
  }),
  and_v: (X, Y) => ({
    dsats: [...combine(`dsat(Y) sat(X)`, { X, Y })],
    sats: [...combine(`sat(Y) sat(X)`, { X, Y })]
  }),
  and_b: (X, Y) => ({
    dsats: [
      ...combine(`dsat(Y) dsat(X)`, { X, Y }),
      //https://bitcoin.sipa.be/miniscript/
      //The non-canonical options for and_b, or_b, and thresh are always
      //overcomplete (reason 3), so instead use DONTUSE there
      ...combine(`sat(Y) dsat(X)`, { X, Y }),
      ...combine(`dsat(Y) sat(X)`, { X, Y })
    ],
    sats: [...combine(`sat(Y) sat(X)`, { Y, X })]
  }),
  or_b: (X, Z) => ({
    dsats: [...combine(`dsat(Z) dsat(X)`, { X, Z })],
    sats: [
      ...combine(`dsat(Z) sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z }),
      //https://bitcoin.sipa.be/miniscript/
      //The non-canonical options for and_b, or_b, and thresh are always
      //overcomplete (reason 3), so instead use DONTUSE there
      ...combine(`sat(Z) sat(X)`, { X, Z })
    ]
  }),
  or_c: (X, Z) => ({
    sats: [
      ...combine(`sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z })
    ]
  }),
  or_d: (X, Z) => ({
    dsats: [...combine(`dsat(Z) dsat(X)`, { X, Z })],
    sats: [
      ...combine(`sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z })
    ]
  }),
  or_i: (X, Z) => ({
    dsats: [
      ...combine(`dsat(X) 1`, { X, Z }),
      ...combine(`dsat(Z) 0`, { X, Z })
    ],
    sats: [...combine(`sat(X) 1`, { X, Z }), ...combine(`sat(Z) 0`, { X, Z })]
  }),
  /*
   * This is not entirely trivial from the docs
   * (https://bitcoin.sipa.be/miniscript/),
   *  but solution templates for thresh must be written in reverse order.
   *  For example the first dsat, which is "All dsats", corresponds to:
   *  "<DSAT_N> <DSAT_N-1> ... <DSAT_1>" (note the reverse order in N)
   *  While this is not entirely trivial by reading the document
   *  it can be deduced by analyzing the script:
   *  thresh(k,X1,...,Xn)	[X1] [X2] ADD ... [Xn] ADD ... <k> EQUAL
   */
  thresh: (k, ...satisfactionsArray) => {
    if (Number.isInteger(Number(k)) && Number(k) > 0) k = Number(k);
    else throw new Error(`k must be positive number: ${k}`);

    //First, convert input satisfactions (which are dynamic for thresh
    //and multi) into an object.
    //For example, if input was, thresh(k, X, Y, Z), then
    //create an object like this: satisfactionsMap = {X, Y, Z};
    const satisfactionsMap = {};
    const N = satisfactionsArray.length;
    satisfactionsArray.map((satisfactions, index) => {
      satisfactionsMap[index] = satisfactions;
    });

    const dsats = [];
    const sats = [];
    //Push the canonical dsat (All dsats):
    //"<DSAT_N> <DSAT_N-1> ... <DSAT_1>" (note the reverse order)
    dsats.push(
      ...combine(
        Object.keys(satisfactionsMap)
          .map(mapKeyName => `dsat(${mapKeyName})`)
          .reverse()
          .join(' '),
        satisfactionsMap
      )
    );

    const dsatsNonCanSolutionTemplates = []; //Sats/dsats with 1 ≤ #(sats) ≠ k
    const satsSolutionTemplates = []; //Sats/dsats with #(sats) = k
    for (let i = 1; i < 1 << N; i++) {
      const c = [];
      let totalSatisfactions = 0;
      for (let j = 0; j < N; j++) {
        if (i & (1 << j)) totalSatisfactions++;
        c.push(i & (1 << j) ? `sat(${j})` : `dsat(${j})`);
      }
      if (totalSatisfactions !== k)
        dsatsNonCanSolutionTemplates.push(c.reverse().join(' '));
      else satsSolutionTemplates.push(c.reverse().join(' '));
    }

    //Push the non canonical dsats:
    for (const solutionTemplate of dsatsNonCanSolutionTemplates) {
      //https://bitcoin.sipa.be/miniscript/
      //The non-canonical options for and_b, or_b, and thresh are always
      //overcomplete (reason 3), so instead use DONTUSE there
      dsats.push(...combine(solutionTemplate, satisfactionsMap));
    }

    //Push the sats (which all are canonical):
    for (const solutionTemplate of satsSolutionTemplates) {
      sats.push(...combine(solutionTemplate, satisfactionsMap));
    }

    return { dsats, sats };
  },
  multi: (k, ...keys) => {
    if (Number.isInteger(Number(k)) && Number(k) > 0) k = Number(k);
    else throw new Error(`k must be positive number: ${k}`);

    //Example of a multi-sig locking script:
    //OP_3 <pubKey1> <pubKey2> <pubKey3> <pubKey4> OP_4 OP_CHECKMULTISIG
    //unlockingScript: OP_0 <sig1> <sig2> <sig4>
    //OP_0 is a dummy OP, needed because of a bug in Bitcoin
    if (typeof k !== 'number') throw new Error('k must be a number:' + k);
    if (k === 0) throw new Error('k cannot be 0');
    const dsats = [{ asm: '0 '.repeat(k + 1).trim() }];

    // Create all combinations of k signatures
    function keyCombinations(keys, k) {
      if (k === 0) {
        return [[]];
      }

      const combinations = [];

      for (let i = 0; i < keys.length; i++) {
        const remainingKeys = keys.slice(i + 1);
        const subCombinations = keyCombinations(remainingKeys, k - 1);
        subCombinations.forEach(combination => {
          combinations.push([keys[i], ...combination]);
        });
      }

      return combinations;
    }

    const asms = [];
    // Create asms from keyCombination
    keyCombinations(keys, k).forEach(combination => {
      let asm = '0';
      combination.forEach(key => {
        asm += ` <sig(${key})>`;
      });
      asms.push(asm);
    });

    let asm = '0';
    for (let i = 0; i < k; i++) {
      asm += ` <sig(${keys[i]})>`;
    }
    const sats = asms.map(asm => ({ asm }));

    return { sats, dsats };
  },
  a: X => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  s: X => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  c: X => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  d: X => ({
    dsats: [{ asm: `0` }],
    sats: [...combine(`sat(X) 1`, { X })]
  }),
  v: X => ({
    sats: [...combine(`sat(X)`, { X })]
  }),

  /**
   * j:X corresponds to SIZE 0NOTEQUAL IF [X] ENDIF
   *
   * By definition, this: "dsat(X) X" produces a zero.
   *
   *
   * A dsat needs to make this "dsat(X) X" return zero.

   * The easiest dsat for j:X is using 0:
   * 0 SIZE 0NOTEQUAL IF [X] ENDIF
   * 0 0 0NOTEQUAL IF [X] ENDIF
   * 0 0 IF [X] ENDIF
   * 0

   * Now let's do the case where dsat(X) finishes with a 0: "... 0"
   * ... 0 SIZE 0NOTEQUAL IF [X] ENDIF
   * ... 0 0 0NOTEQUAL IF [X] ENDIF
   * ... 0 0 IF [X] ENDIF 
   * ... 0
   * DSAT(X)
   * The final expression is "DSAT(X)".
   * It should have either been "0" or "DSAT(X) X"
   * Thus, this is not a valid dsat.

   * Now let's do the case where dsat(X) is this: "... <nonzero>"
   * ... <nonzero> SIZE 0NOTEQUAL IF [X] ENDIF
   * ... <nonzero> <length_is_nonzero> 0NOTEQUAL IF [X] ENDIF
   * ... <nonzero> 1 IF [X] ENDIF
   * ... <nonzero> [X]
   * DSAT(X) [X]

   * DSAT(X) X is a good dsat
   */
  j: X => {
    const dsats = [];
    const sats = [];

    dsats.push({ asm: `0` });

    //Filter the dsats of X with Non Zero Top Stack (nztp).
    const dsats_nzts = X.dsats.filter(
      //The top stack corresponds to the last element pushed to the stack,
      //that is, the last element in the produced witness
      solution => solution.asm.trim().split(' ').pop() !== '0'
    );
    dsats.push(...dsats_nzts);

    return { dsats, sats: [...combine(`sat(X)`, { X })] };
  },
  n: X => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  })
};
