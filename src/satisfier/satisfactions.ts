// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { maxLock } from './maxLock';

export type Solution = {
  asm: string;
  nSequence?: number | string;
  nLockTime?: number | string;
};

export type Satisfactions = {
  sats?: Solution[];
  dsats?: Solution[];
};

export type SatisfactionsMap = Record<string, Satisfactions>;

type SatisfactionKey = 'sats' | 'dsats';

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
 * For the example above, satisfactionsMap.X provides sats and dsats for X,
 * satisfactionsMap.Y for Y, satisfactionsMap.Z for Z, and so on for any other
 * placeholder used in the template.
 *
 * Returns an array of Solution objects containing the combined witness asm and
 * any accumulated nSequence and nLockTime values.
 *
 */

function combine(
  /** A string containing sat or dsat expressions such as "0 dsat(X) sat(Y) 1 sat(Z)". */
  solutionTemplate: string,
  /** An object mapping the arguments in solutionTemplate to their satisfactions. */
  satisfactionsMap: SatisfactionsMap
): Solution[] {
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
  const reCurr = /d?sat\(([^(]*)\)/;
  const currMatch = solutionTemplate.match(reCurr);

  if (currMatch && currMatch.length) {
    //The array of solutions to be computed and returned.
    const solutions: Solution[] = [];

    //curr is the first d?sat() matched in solutionTemplate:
    const curr = currMatch[0];
    if (!curr) {
      throw new Error('Invalid solutionTemplate: ' + solutionTemplate);
    }
    //pre is whatever was before the first d?sat():
    const pre = solutionTemplate.split(curr)[0] ?? '';
    //post is whatever was after the first d?sat():
    const post = solutionTemplate.slice(curr.length + pre.length);

    //the argument for curr: d?sat( -> argument <- ):
    //This will match the string "X" in the example above:
    //currArg = "X" for solutionTemplate "0 dsat(X) sat(Y) 1 sat(Z)"
    const currArg = currMatch[1];
    if (!currArg) {
      throw new Error('Invalid solutionTemplate: ' + solutionTemplate);
    }
    //currKey = "sats" or "dsats". "dsats" for the example above.
    const currKey: SatisfactionKey = curr[0] === 'd' ? 'dsats' : 'sats';

    const satisfactions = satisfactionsMap[currArg];
    if (typeof satisfactions !== 'object')
      throw new Error(
        `satisfactionsMap does not provide sats/dsats solutions for argument ${currArg}, evaluating: ${solutionTemplate}`
      );
    const currSolutions: Solution[] = satisfactions[currKey] || [];
    for (const currSolution of currSolutions) {
      //Does *post* contain further sat() or dsat() expressions?
      if (post.match(reCurr)) {
        //There are more sat/dsat, do a recursive call:
        const postSolutions = combine(post, satisfactionsMap);
        for (const postSolution of postSolutions) {
          //if ((currSolution.nLockTime && postSolution.nLockTime)) return [];
          const nSequence = maxLock(
            currSolution.nSequence,
            postSolution.nSequence,
            'RELATIVE'
          );
          const nLockTime = maxLock(
            currSolution.nLockTime,
            postSolution.nLockTime,
            'ABSOLUTE'
          );
          const solution: Solution = {
            asm: `${pre}${currSolution.asm}${postSolution.asm}`
          };
          if (nSequence !== undefined) solution.nSequence = nSequence;
          if (nLockTime !== undefined) solution.nLockTime = nLockTime;
          solutions.push(solution);
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
 *
 */
export const satisfactionsMaker = {
  0: (): Satisfactions => ({
    dsats: [{ asm: `` }]
  }),
  1: (): Satisfactions => ({
    sats: [{ asm: `` }]
  }),
  pk_k: (key: string): Satisfactions => ({
    dsats: [{ asm: `0` }],
    sats: [{ asm: `<sig(${key})>` }]
  }),
  pk_h: (key: string): Satisfactions => ({
    dsats: [{ asm: `0 <${key}>` }],
    sats: [{ asm: `<sig(${key})> <${key}>` }]
  }),
  older: (n: string | number): Satisfactions => ({
    sats: [{ asm: ``, nSequence: n }]
  }),
  after: (n: string | number): Satisfactions => ({
    sats: [{ asm: ``, nLockTime: n }]
  }),
  sha256: (h: string): Satisfactions => ({
    sats: [{ asm: `<sha256_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  ripemd160: (h: string): Satisfactions => ({
    sats: [{ asm: `<ripemd160_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  hash256: (h: string): Satisfactions => ({
    sats: [{ asm: `<hash256_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  hash160: (h: string): Satisfactions => ({
    sats: [{ asm: `<hash160_preimage(${h})>` }],
    dsats: [{ asm: `<random_preimage()>` }]
  }),
  andor: (
    X: Satisfactions,
    Y: Satisfactions,
    Z: Satisfactions
  ): Satisfactions => ({
    dsats: [
      ...combine(`dsat(Z) dsat(X)`, { X, Y, Z }),
      ...combine(`dsat(Y) sat(X)`, { X, Y, Z })
    ],
    sats: [
      ...combine('sat(Y) sat(X)', { X, Y, Z }),
      ...combine('sat(Z) dsat(X)', { X, Y, Z })
    ]
  }),
  and_v: (X: Satisfactions, Y: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(Y) sat(X)`, { X, Y })],
    sats: [...combine(`sat(Y) sat(X)`, { X, Y })]
  }),
  and_b: (X: Satisfactions, Y: Satisfactions): Satisfactions => ({
    dsats: [
      ...combine(`dsat(Y) dsat(X)`, { X, Y }),
      ...combine(`sat(Y) dsat(X)`, { X, Y }),
      ...combine(`dsat(Y) sat(X)`, { X, Y })
    ],
    sats: [...combine(`sat(Y) sat(X)`, { Y, X })]
  }),
  or_b: (X: Satisfactions, Z: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(Z) dsat(X)`, { X, Z })],
    sats: [
      ...combine(`dsat(Z) sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z }),
      ...combine(`sat(Z) sat(X)`, { X, Z })
    ]
  }),
  or_c: (X: Satisfactions, Z: Satisfactions): Satisfactions => ({
    sats: [
      ...combine(`sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z })
    ]
  }),
  or_d: (X: Satisfactions, Z: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(Z) dsat(X)`, { X, Z })],
    sats: [
      ...combine(`sat(X)`, { X, Z }),
      ...combine(`sat(Z) dsat(X)`, { X, Z })
    ]
  }),
  or_i: (X: Satisfactions, Z: Satisfactions): Satisfactions => ({
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
  thresh: (
    k: string | number,
    ...satisfactionsArray: Satisfactions[]
  ): Satisfactions => {
    if (Number.isInteger(Number(k)) && Number(k) > 0) k = Number(k);
    else throw new Error(`k must be positive number: ${k}`);

    //First, convert input satisfactions (which are dynamic for thresh
    //and multi) into an object.
    //For example, if input was, thresh(k, X, Y, Z), then
    //create an object like this: satisfactionsMap = {X, Y, Z};
    const satisfactionsMap: SatisfactionsMap = {};
    const N = satisfactionsArray.length;
    satisfactionsArray.map((satisfactions, index) => {
      satisfactionsMap[String(index)] = satisfactions;
    });

    const dsats: Solution[] = [];
    const sats: Solution[] = [];
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

    const dsatsNonCanSolutionTemplates: string[] = []; //Sats/dsats with 1 ≤ #(sats) ≠ k
    const satsSolutionTemplates: string[] = []; //Sats/dsats with #(sats) = k
    for (let i = 1; i < 1 << N; i++) {
      // i expressed in binary will be: 0 0 ...N... 0 1,  0  0  ... N ... 1 0,  0  0  ... N ... 1 1,  ... , 1 1 1 1 ...N.... 1
      const c: string[] = [];
      let totalSatisfactions = 0;
      for (let j = 0; j < N; j++) {
        if (i & (1 << j)) totalSatisfactions++; //binary mask of i (see above) and jth element to count how many "1"s
        c.push(i & (1 << j) ? `sat(${j})` : `dsat(${j})`);
      }
      if (totalSatisfactions !== k)
        dsatsNonCanSolutionTemplates.push(c.reverse().join(' '));
      else satsSolutionTemplates.push(c.reverse().join(' '));
    }

    //Push the non canonical dsats:
    for (const solutionTemplate of dsatsNonCanSolutionTemplates) {
      dsats.push(...combine(solutionTemplate, satisfactionsMap));
    }

    //Push the sats (which all are canonical):
    for (const solutionTemplate of satsSolutionTemplates) {
      sats.push(...combine(solutionTemplate, satisfactionsMap));
    }

    return { dsats, sats };
  },
  multi: (k: string | number, ...keys: string[]): Satisfactions => {
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
    function keyCombinations(keys: string[], k: number): string[][] {
      if (k === 0) {
        return [[]];
      }

      const combinations: string[][] = [];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!key) throw new Error('Missing key');
        const remainingKeys = keys.slice(i + 1);
        const subCombinations = keyCombinations(remainingKeys, k - 1);
        subCombinations.forEach(combination => {
          combinations.push([key, ...combination]);
        });
      }

      return combinations;
    }

    const asms: string[] = [];
    // Create asms from keyCombination
    keyCombinations(keys, k).forEach(combination => {
      let asm = '0';
      combination.forEach(key => {
        asm += ` <sig(${key})>`;
      });
      asms.push(asm);
    });

    const sats: Solution[] = asms.map(asm => ({ asm }));

    return { sats, dsats };
  },
  a: (X: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  s: (X: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  c: (X: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  }),
  d: (X: Satisfactions): Satisfactions => ({
    dsats: [{ asm: `0` }],
    sats: [...combine(`sat(X) 1`, { X })]
  }),
  v: (X: Satisfactions): Satisfactions => ({
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
  j: (X: Satisfactions): Satisfactions => {
    const dsats: Solution[] = [];

    dsats.push({ asm: `0` });

    //Filter the dsats of X with Non Zero Top Stack (nztp).
    const dsats_nzts = (X.dsats || []).filter(
      //The top stack corresponds to the last element pushed to the stack,
      //that is, the last element in the produced witness
      solution => solution.asm.trim().split(' ').pop() !== '0'
    );
    dsats.push(...dsats_nzts);

    return { dsats, sats: [...combine(`sat(X)`, { X })] };
  },
  n: (X: Satisfactions): Satisfactions => ({
    dsats: [...combine(`dsat(X)`, { X })],
    sats: [...combine(`sat(X)`, { X })]
  })
};
