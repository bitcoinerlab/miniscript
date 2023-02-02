import bip68 from 'bip68';

export const primitives = {
  0: {
    miniscript: '0',
    script: '0',
    nonMalleableSats: [],
    malleableSats: []
  },

  1: {
    miniscript: '1',
    script: '1',
    throws: 'Miniscript 1 is not sane.'
  },

  //'pk_k(key)' is not a valid miniscript
  'c:pk_k(key)': {
    miniscript: 'c:pk_k(key)',
    script: '<key> OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key)>' }],
    malleableSats: []
  },
  //same as above
  'pk(key)': {
    miniscript: 'pk(key)',
    script: '<key> OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key)>' }],
    malleableSats: []
  },

  //'pk_h(key)' is not a valid miniscript
  'c:pk_h(key)': {
    miniscript: 'c:pk_h(key)',
    script: 'OP_DUP OP_HASH160 <HASH160(key)> OP_EQUALVERIFY OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key)> <key>' }],
    malleableSats: []
  },
  //same as above
  'pkh(key)': {
    miniscript: 'pkh(key)',
    script: 'OP_DUP OP_HASH160 <HASH160(key)> OP_EQUALVERIFY OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key)> <key>' }],
    malleableSats: []
  },

  //older
  'and_v(v:pk(key),older(10))': {
    miniscript: 'and_v(v:pk(key),older(10))',
    script: '<key> OP_CHECKSIGVERIFY 10 OP_CHECKSEQUENCEVERIFY',
    nonMalleableSats: [{ asm: '<sig(key)>', nSequence: 10 }],
    malleableSats: []
  },

  //after
  'and_v(v:pk(key),after(10))': {
    miniscript: 'and_v(v:pk(key),after(10))',
    script: '<key> OP_CHECKSIGVERIFY 10 OP_CHECKLOCKTIMEVERIFY',
    nonMalleableSats: [{ asm: '<sig(key)>', nLockTime: 10 }],
    malleableSats: []
  },

  //hashes
  'and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    nonMalleableSats: [{ asm: '<sha256_preimage(H)> <sig(k)>' }],
    malleableSats: []
  },
  'with unknowns - and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    unknowns: ['<sha256_preimage(H)>'],
    unknownSats: [{ asm: '<sha256_preimage(H)> <sig(k)>' }],
    //If the preimage is unknown we cannot compute any satisfaction
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_v(v:pk(k),ripemd160(H))': {
    miniscript: 'and_v(v:pk(k),ripemd160(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUAL',
    nonMalleableSats: [{ asm: '<ripemd160_preimage(H)> <sig(k)>' }],
    malleableSats: []
  },
  'and_v(v:pk(k),hash256(H))': {
    miniscript: 'and_v(v:pk(k),hash256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_HASH256 <H> OP_EQUAL',
    nonMalleableSats: [{ asm: '<hash256_preimage(H)> <sig(k)>' }],
    malleableSats: []
  },
  'and_v(v:pk(k),hash160(H))': {
    miniscript: 'and_v(v:pk(k),hash160(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_HASH160 <H> OP_EQUAL',
    nonMalleableSats: [{ asm: '<hash160_preimage(H)> <sig(k)>' }],
    malleableSats: []
  },

  //andor ~truth table
  'andor(0,0,0)': {
    miniscript: 'andor(0,0,0)',
    script: '0 OP_NOTIF 0 OP_ELSE 0 OP_ENDIF',
    nonMalleableSats: [],
    malleableSats: []
  },
  'andor(0,0,pk(k))': {
    miniscript: 'andor(0,0,pk(k))',
    script: '0 OP_NOTIF <k> OP_CHECKSIG OP_ELSE 0 OP_ENDIF',
    nonMalleableSats: [{ asm: '<sig(k)>' }],
    malleableSats: []
  },
  'andor(0,pk(k),0)': {
    miniscript: 'andor(0,pk(k),0)',
    script: '0 OP_NOTIF 0 OP_ELSE <k> OP_CHECKSIG OP_ENDIF',
    nonMalleableSats: [],
    malleableSats: []
  },
  'andor(0,pk(key1),pk(key2))': {
    miniscript: 'andor(0,pk(key1),pk(key2))',
    script: '0 OP_NOTIF <key2> OP_CHECKSIG OP_ELSE <key1> OP_CHECKSIG OP_ENDIF',
    nonMalleableSats: [{ asm: '<sig(key2)>' }],
    malleableSats: []
  },
  //other andor(1,Y,Z) combinations are not valid miniscripts

  //and_v ~truth table
  'and_v(v:0,0)': {
    miniscript: 'and_v(v:0,0)',
    script: '0 OP_VERIFY 0',
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_v(v:0,1)': {
    miniscript: 'and_v(v:0,1)',
    script: '0 OP_VERIFY 1',
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_v(v:1,0)': {
    miniscript: 'and_v(v:1,0)',
    script: '1 OP_VERIFY 0',
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_v(v:pk(key1),pk(key2))': {
    miniscript: 'and_v(v:pk(key1),pk(key2))',
    script: '<key1> OP_CHECKSIGVERIFY <key2> OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key2)> <sig(key1)>' }],
    malleableSats: []
  },

  //and_b(X,Y): [X] [Y] BOOLAND
  'and_b(0,s:pk(key))': {
    miniscript: 'and_b(0,s:pk(key))',
    script: '0 OP_SWAP <key> OP_CHECKSIG OP_BOOLAND',
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_b(1,s:pk(key))': {
    miniscript: 'and_b(1,s:pk(key))',
    script: '1 OP_SWAP <key> OP_CHECKSIG OP_BOOLAND',
    nonMalleableSats: [{ asm: '<sig(key)>' }],
    malleableSats: []
  },
  'and_b(pk(a),s:pk(b))': {
    miniscript: 'and_b(pk(a),s:pk(b))',
    script: '<a> OP_CHECKSIG OP_SWAP <b> OP_CHECKSIG OP_BOOLAND',
    nonMalleableSats: [{ asm: '<sig(b)> <sig(a)>' }],
    malleableSats: []
  },

  //or_b(X,Z)	[X] [Z] BOOLOR
  'or_b(0,a:0)': {
    miniscript: 'or_b(0,a:0)',
    script: '0 OP_TOALTSTACK 0 OP_FROMALTSTACK OP_BOOLOR',
    nonMalleableSats: [],
    malleableSats: []
  },
  'and_v(v:pk(key1),or_b(pk(key2),a:pk(key3)))': {
    miniscript: 'and_v(v:pk(key1),or_b(pk(key2),a:pk(key3)))',
    script:
      '<key1> OP_CHECKSIGVERIFY <key2> OP_CHECKSIG OP_TOALTSTACK <key3> OP_CHECKSIG OP_FROMALTSTACK OP_BOOLOR',
    nonMalleableSats: [
      { asm: '0 <sig(key2)> <sig(key1)>' },
      { asm: '<sig(key3)> 0 <sig(key1)>' }
    ],
    malleableSats: [{ asm: '<sig(key3)> <sig(key2)> <sig(key1)>' }]
  },
  'and_v(v:pk(key1),or_b(pk(key2),su:after(500000)))': {
    miniscript: 'and_v(v:pk(key1),or_b(pk(key2),su:after(500000)))',
    script:
      '<key1> OP_CHECKSIGVERIFY <key2> OP_CHECKSIG OP_SWAP OP_IF <20a107> OP_CHECKLOCKTIMEVERIFY OP_ELSE 0 OP_ENDIF OP_BOOLOR',
    nonMalleableSats: [
      { nLockTime: 500000, asm: '1 0 <sig(key1)>' },
      { asm: '0 <sig(key2)> <sig(key1)>' }
    ],
    malleableSats: [{ nLockTime: 500000, asm: '1 <sig(key2)> <sig(key1)>' }]
  },

  //or_c(X,Z)	[X] NOTIF [Z] ENDIF
  't:or_c(0,v:0)': {
    miniscript: 't:or_c(0,v:0)',
    script: '0 OP_NOTIF 0 OP_VERIFY OP_ENDIF 1',
    nonMalleableSats: [],
    malleableSats: []
  },
  //Here we assume that both we and the attacker know ripemd160_preimage.
  //In fact, all pre-images are assumed to be publicly known by default.
  //If this is the case then we cannot provide this result:
  //{"script": "<sig(key2)> <sig(key1)>"}
  //Because an attacker could build a new satisfaction using sig(key2)
  'c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))': {
    miniscript: 'c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))',
    script:
      '<key1> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_ENDIF <key2> OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key2)> <ripemd160_preimage(H)> 0' }],
    malleableSats: [{ asm: '<sig(key2)> <sig(key1)>' }]
  },
  //Here we assume that no-one knows ripemd160_preimage.
  //The only possible solution is siginig with 2 keys. The attacker cannot
  //create a new solution because ripemd160_preimage is not known.
  'with unknows set - c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))': {
    miniscript: 'c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))',
    script:
      '<key1> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_ENDIF <key2> OP_CHECKSIG',
    unknowns: ['<ripemd160_preimage(H)>'],
    unknownSats: [{ asm: '<sig(key2)> <ripemd160_preimage(H)> 0' }],
    nonMalleableSats: [{ asm: '<sig(key2)> <sig(key1)>' }],
    malleableSats: []
  },

  //or_d(X,Z): [X] IFDUP NOTIF [Z] ENDIF
  'or_d(0,0)': {
    miniscript: 'or_d(0,0)',
    script: '0 OP_IFDUP OP_NOTIF 0 OP_ENDIF',
    nonMalleableSats: [],
    malleableSats: []
  },
  //solutions are malleable because an attacker can allways default to
  //{"nLockTime": 500000, "script": "1 0 0"}
  //So nLockTime solution would be the only possible one except this would not
  //be sane because it has no signatures.
  'or_d(pk(key1),and_b(pk(key2),a:sha256(H)))': {
    miniscript: 'or_d(pk(key1),and_b(pk(key2),a:sha256(H)))',
    script:
      '<key1> OP_CHECKSIG OP_IFDUP OP_NOTIF <key2> OP_CHECKSIG OP_TOALTSTACK OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL OP_FROMALTSTACK OP_BOOLAND OP_ENDIF',
    nonMalleableSats: [
      { asm: '<sig(key1)>' },
      { asm: '<sha256_preimage(H)> <sig(key2)> 0' }
    ],
    malleableSats: []
  },
  //same as above. if don't know sig(key2)
  'with unknows set - or_d(pk(key1),and_b(pk(key2),a:sha256(H)))': {
    miniscript: 'or_d(pk(key1),and_b(pk(key2),a:sha256(H)))',
    script:
      '<key1> OP_CHECKSIG OP_IFDUP OP_NOTIF <key2> OP_CHECKSIG OP_TOALTSTACK OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL OP_FROMALTSTACK OP_BOOLAND OP_ENDIF',
    unknowns: ['<sig(key2)>'],
    //[{"script": "<sig(key1)>"}, {"script": "0 <sig(key2)> 0"}, {"nLockTime": 500000, "script": "1 0 0"}, {"nLockTime": 500000, "script": "1 <sig(key2)> 0"}]
    unknownSats: [{ asm: '<sha256_preimage(H)> <sig(key2)> 0' }],
    nonMalleableSats: [{ asm: '<sig(key1)>' }],
    malleableSats: []
  },
  'or_d(c:pk_h(key1),andor(c:pk_k(key2),older(2016),pk(key3)))': {
    miniscript: 'or_d(c:pk_h(key1),andor(c:pk_k(key2),older(2016),pk(key3)))',
    script:
      'OP_DUP OP_HASH160 <HASH160(key1)> OP_EQUALVERIFY OP_CHECKSIG OP_IFDUP OP_NOTIF <key2> OP_CHECKSIG OP_NOTIF <key3> OP_CHECKSIG OP_ELSE <e007> OP_CHECKSEQUENCEVERIFY OP_ENDIF OP_ENDIF',
    nonMalleableSats: [
      { asm: '<sig(key1)> <key1>' },
      { nSequence: 2016, asm: '<sig(key2)> 0 <key1>' },
      { asm: '<sig(key3)> 0 0 <key1>' }
    ],
    malleableSats: []
  },

  //or_i(X,Z)	IF [X] ELSE [Z] ENDIF
  'c:or_i(pk_k(key1),pk_k(key2))': {
    miniscript: 'c:or_i(pk_k(key1),pk_k(key2))',
    script: 'OP_IF <key1> OP_ELSE <key2> OP_ENDIF OP_CHECKSIG',
    nonMalleableSats: [{ asm: '<sig(key1)> 1' }, { asm: '<sig(key2)> 0' }],
    malleableSats: []
  },
  'c:or_i(and_v(v:after(500000),pk_k(key1)),pk_k(key2))': {
    miniscript: 'c:or_i(and_v(v:after(500000),pk_k(key1)),pk_k(key2))',
    script:
      'OP_IF <20a107> OP_CHECKLOCKTIMEVERIFY OP_VERIFY <key1> OP_ELSE <key2> OP_ENDIF OP_CHECKSIG',
    nonMalleableSats: [
      { nLockTime: 500000, asm: '<sig(key1)> 1' },
      { asm: '<sig(key2)> 0' }
    ],
    malleableSats: []
  },
  'with unknowns set - c:or_i(and_v(v:after(500000),pk_k(key1)),pk_k(key2))': {
    miniscript: 'c:or_i(and_v(v:after(500000),pk_k(key1)),pk_k(key2))',
    script:
      'OP_IF <20a107> OP_CHECKLOCKTIMEVERIFY OP_VERIFY <key1> OP_ELSE <key2> OP_ENDIF OP_CHECKSIG',
    unknowns: ['<sig(key1)>'],
    //If the preimage is not konwn, then it is not malleable.
    //[{"nLockTime": 500000, "script": "<sig(key1)> 1"}, {"script": "<sha256_preimage(H)> 0"}]
    unknownSats: [{ nLockTime: 500000, asm: '<sig(key1)> 1' }],
    nonMalleableSats: [{ asm: '<sig(key2)> 0' }],
    malleableSats: []
  },
  'c:or_i(and_v(v:older(16),pk_h(key1)),pk_h(key2))': {
    miniscript: 'c:or_i(and_v(v:older(16),pk_h(key1)),pk_h(key2))',
    script:
      'OP_IF 16 OP_CHECKSEQUENCEVERIFY OP_VERIFY OP_DUP OP_HASH160 <HASH160(key1)> OP_EQUALVERIFY OP_ELSE OP_DUP OP_HASH160 <HASH160(key2)> OP_EQUALVERIFY OP_ENDIF OP_CHECKSIG',
    nonMalleableSats: [
      { nSequence: 16, asm: '<sig(key1)> <key1> 1' },
      { asm: '<sig(key2)> <key2> 0' }
    ],
    malleableSats: []
  },
  'with unknowns set - c:or_i(and_v(v:older(16),pk_h(key1)),pk_h(key2))': {
    miniscript: 'c:or_i(and_v(v:older(16),pk_h(key1)),pk_h(key2))',
    script:
      'OP_IF 16 OP_CHECKSEQUENCEVERIFY OP_VERIFY OP_DUP OP_HASH160 <HASH160(key1)> OP_EQUALVERIFY OP_ELSE OP_DUP OP_HASH160 <HASH160(key2)> OP_EQUALVERIFY OP_ENDIF OP_CHECKSIG',
    unknowns: ['<sig(key1)>', '<sig(key2)>'],
    unknownSats: [
      { nSequence: 16, asm: '<sig(key1)> <key1> 1' },
      { asm: '<sig(key2)> <key2> 0' }
    ],
    nonMalleableSats: [],
    malleableSats: []
  },
  'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))': {
    miniscript: 'c:or_i(andor(c:pk_h(key1),pk_h(key2),pk_h(key3)),pk_k(key4))',
    script:
      'OP_IF OP_DUP OP_HASH160 <HASH160(key1)> OP_EQUALVERIFY OP_CHECKSIG OP_NOTIF OP_DUP OP_HASH160 <HASH160(key3)> OP_EQUALVERIFY OP_ELSE OP_DUP OP_HASH160 <HASH160(key2)> OP_EQUALVERIFY OP_ENDIF OP_ELSE <key4> OP_ENDIF OP_CHECKSIG',
    nonMalleableSats: [
      { asm: '<sig(key2)> <key2> <sig(key1)> <key1> 1' },
      { asm: '<sig(key3)> <key3> 0 <key1> 1' },
      { asm: '<sig(key4)> 0' }
    ],
    malleableSats: []
  },
  'or_i(and_b(pk(key1),s:pk(key2)),and_b(older(1),s:pk(key3)))': {
    miniscript: 'or_i(and_b(pk(key1),s:pk(key2)),and_b(older(1),s:pk(key3)))',
    script:
      'OP_IF <key1> OP_CHECKSIG OP_SWAP <key2> OP_CHECKSIG OP_BOOLAND OP_ELSE 1 OP_CHECKSEQUENCEVERIFY OP_SWAP <key3> OP_CHECKSIG OP_BOOLAND OP_ENDIF',
    nonMalleableSats: [
      { asm: '<sig(key2)> <sig(key1)> 1' },
      { nSequence: 1, asm: '<sig(key3)> 0' }
    ],
    malleableSats: []
  },
  'with unknowns set - or_i(and_b(pk(key1),s:pk(key2)),and_b(older(1),s:pk(key3)))':
    {
      miniscript: 'or_i(and_b(pk(key1),s:pk(key2)),and_b(older(1),s:pk(key3)))',
      script:
        'OP_IF <key1> OP_CHECKSIG OP_SWAP <key2> OP_CHECKSIG OP_BOOLAND OP_ELSE 1 OP_CHECKSEQUENCEVERIFY OP_SWAP <key3> OP_CHECKSIG OP_BOOLAND OP_ENDIF',
      unknowns: ['<sig(key3)>'],
      unknownSats: [{ nSequence: 1, asm: '<sig(key3)> 0' }],
      nonMalleableSats: [{ asm: '<sig(key2)> <sig(key1)> 1' }],
      malleableSats: []
    },

  //thresh(k,X1,...,Xn)	[X1] [X2] ADD ... [Xn] ADD ... <k> EQUAL
  'thresh(2,pk(A),s:pk(B),sln:1)': {
    miniscript: 'thresh(2,pk(A),s:pk(B),sln:1)',
    script:
      '<A> OP_CHECKSIG OP_SWAP <B> OP_CHECKSIG OP_ADD OP_SWAP OP_IF 0 OP_ELSE 1 OP_0NOTEQUAL OP_ENDIF OP_ADD 2 OP_EQUAL',
    nonMalleableSats: [{ asm: '0 0 <sig(A)>' }, { asm: '0 <sig(B)> 0' }],
    malleableSats: [{ asm: '1 <sig(B)> <sig(A)>' }]
  },
  'with unknownws - thresh(2,pk(A),s:pk(B),sln:1)': {
    miniscript: 'thresh(2,pk(A),s:pk(B),sln:1)',
    script:
      '<A> OP_CHECKSIG OP_SWAP <B> OP_CHECKSIG OP_ADD OP_SWAP OP_IF 0 OP_ELSE 1 OP_0NOTEQUAL OP_ENDIF OP_ADD 2 OP_EQUAL',
    unknowns: ['<sig(A)>'],
    unknownSats: [{ asm: '0 0 <sig(A)>' }, { asm: '1 <sig(B)> <sig(A)>' }],
    nonMalleableSats: [{ asm: '0 <sig(B)> 0' }],
    malleableSats: []
  },
  'with unknowns set - thresh(2,pk(k1),s:pk(k2),sjtv:sha256(H))': {
    miniscript: 'thresh(2,pk(k1),s:pk(k2),sjtv:sha256(H))',
    script:
      '<k1> OP_CHECKSIG OP_SWAP <k2> OP_CHECKSIG OP_ADD OP_SWAP OP_SIZE OP_0NOTEQUAL OP_IF OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUALVERIFY 1 OP_ENDIF OP_ADD 2 OP_EQUAL',
    unknowns: ['<sha256_preimage(H)>'],
    unknownSats: [
      { asm: '<sha256_preimage(H)> 0 <sig(k1)>' },
      { asm: '<sha256_preimage(H)> <sig(k2)> 0' }
    ],
    nonMalleableSats: [{ asm: '0 <sig(k2)> <sig(k1)>' }],
    malleableSats: []
  },
  'or(thresh(2,pk(k1),pk(k2),sha256(H)),pk(k3))': {
    miniscript: 'or(thresh(2,pk(k1),pk(k2),sha256(H)),pk(k3))',
    throws:
      'Miniscript or(thresh(2,pk(k1),pk(k2),sha256(H)),pk(k3)) is not sane'
  },
  'thresh(2,multi(2,key1,key2),a:multi(1,key3),ac:pk_k(key4))': {
    miniscript: 'thresh(2,multi(2,key1,key2),a:multi(1,key3),ac:pk_k(key4))',
    script:
      '2 <key1> <key2> 2 OP_CHECKMULTISIG OP_TOALTSTACK 1 <key3> 1 OP_CHECKMULTISIG OP_FROMALTSTACK OP_ADD OP_TOALTSTACK <key4> OP_CHECKSIG OP_FROMALTSTACK OP_ADD 2 OP_EQUAL',
    //I manually checked them:
    nonMalleableSats: [
      { asm: '0 0 <sig(key3)> 0 <sig(key1)> <sig(key2)>' },
      { asm: '<sig(key4)> 0 0 0 <sig(key1)> <sig(key2)>' },
      { asm: '<sig(key4)> 0 <sig(key3)> 0 0 0' }
    ],
    malleableSats: []
  },
  'thresh(2,c:pk_h(key),s:sha256(e38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f),a:hash160(dd69735817e0e3f6f826a9238dc2e291184f0131))':
    {
      miniscript:
        'thresh(2,c:pk_h(key),s:sha256(e38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f),a:hash160(dd69735817e0e3f6f826a9238dc2e291184f0131))',
      script:
        'OP_DUP OP_HASH160 <HASH160(key1)> OP_EQUALVERIFY OP_CHECKSIG OP_SWAP OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <e38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f> OP_EQUAL OP_ADD OP_TOALTSTACK OP_SIZE <20> OP_EQUALVERIFY OP_HASH160  OP_EQUAL OP_FROMALTSTACK OP_ADD 2 OP_EQUAL',
      //This is insane because miniscript assumes that preimages are public
      //and so 2 of 3 pieces of information would allways be available to
      //attackers
      //This is not going to work even by setting preimages to unknowns because
      //this is expression insane at the miniscript level.
      //Read the docs at satisfier(), argument:unknowns, for the details.
      throws:
        'Miniscript thresh(2,c:pk_h(key),s:sha256(e38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f),a:hash160(dd69735817e0e3f6f826a9238dc2e291184f0131)) is not sane.'
    },
  'thresh(1,c:pk_k(key1),altv:after(1000000000),altv:after(100))': {
    miniscript: 'thresh(1,c:pk_k(key1),altv:after(1000000000),altv:after(100))',
    //This is insane at the miniscript level because a) it mixes time locks and
    //b) because it cannot be satisfyed in a non-malleable: adding any key1
    //would satisfy it.
    throws:
      'Miniscript thresh(1,c:pk_k(key1),altv:after(1000000000),altv:after(100)) is not sane.'
  },
  'thresh(2,c:pk_k(key1),altv:after(200),altv:after(100))': {
    miniscript: 'thresh(2,c:pk_k(key1),altv:after(200),altv:after(100))',
    script:
      '<key1> OP_CHECKSIG OP_TOALTSTACK OP_IF 0 OP_ELSE <c800> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD 2 OP_EQUAL',
    //[{"nLockTime": 200, "script": "1 0 <sig(key1)>"}, {"nLockTime": 100, "script": "0 1 <sig(key1)>"}, {"nLockTime": 200, "script": "0 0 0"}]
    nonMalleableSats: [{ nLockTime: 200, asm: '0 0 0' }], //Don't reveal the signature
    //because it would be malleable
    malleableSats: []
  },
  'thresh(2,c:pk_k(key1),altv:after(200),altv:after(100))': {
    miniscript: 'thresh(2,c:pk_k(key1),altv:after(200),altv:after(100))',
    script:
      '<key1> OP_CHECKSIG OP_TOALTSTACK OP_IF 0 OP_ELSE <c800> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD 2 OP_EQUAL',
    throws:
      'Miniscript thresh(2,c:pk_k(key1),altv:after(200),altv:after(100)) is not sane.'
  },
  'thresh(2,c:pk_k(key1),ac:pk_k(key2),altv:after(1000000000),altv:after(100))':
    {
      miniscript:
        'thresh(2,c:pk_k(key1),ac:pk_k(key2),altv:after(1000000000),altv:after(100))',
      //Same reasoning as above. timelock mic¡xing and any key1 or key2 could satisfy
      throws:
        'Miniscript thresh(2,c:pk_k(key1),ac:pk_k(key2),altv:after(1000000000),altv:after(100)) is not sane.'
    },
  'thresh(2,c:pk_k(key1),ac:pk_k(key2),altv:after(100))': {
    miniscript: 'thresh(2,c:pk_k(key1),ac:pk_k(key2),altv:after(100))',
    //Note that <sig(key1)> or <sig(key2)> in the first solution cannot be
    //used to form the other solutions since nLockTime forms part of the
    //transaction template whose hash is signed.
    // [{"script": "1 <sig(key2)> <sig(key1)>"}, {"nLockTime": 100, "script": "0 0 <sig(key1)>"}, {"nLockTime": 100, "script": "0 <sig(key2)> 0"}]
    script:
      '<key1> OP_CHECKSIG OP_TOALTSTACK <key2> OP_CHECKSIG OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD 2 OP_EQUAL',
    nonMalleableSats: [
      { asm: '1 <sig(key2)> <sig(key1)>' },
      { nLockTime: 100, asm: '0 0 <sig(key1)>' },
      { nLockTime: 100, asm: '0 <sig(key2)> 0' }
    ],
    malleableSats: []
  },
  'thresh(3,c:pk_k(key1),ac:pk_k(key2),altv:after(100),altv:after(200))': {
    miniscript:
      'thresh(3,c:pk_k(key1),ac:pk_k(key2),altv:after(100),altv:after(200))',
    script:
      '<key1> OP_CHECKSIG OP_TOALTSTACK <key2> OP_CHECKSIG OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE <c800> OP_CHECKLOCKTIMEVERIFY OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD 3 OP_EQUAL',
    nonMalleableSats: [
      { nLockTime: 100, asm: '1 0 <sig(key2)> <sig(key1)>' },
      //This one below should not be used because it could used to create the
      //2 other solutions below by an attacker
      //{"nLockTime": 200, "script": "0 1 <sig(key2)> <sig(key1)>"},
      { nLockTime: 200, asm: '0 0 0 <sig(key1)>' },
      { nLockTime: 200, asm: '0 0 <sig(key2)> 0' }
    ],
    malleableSats: [{ nLockTime: 200, asm: '0 1 <sig(key2)> <sig(key1)>' }]
  },
  'thresh(3,j:and_v(v:ripemd160(H),and_v(v:ripemd160(H),n:older(110))),s:pk(A),s:pk(B),aj:and_v(v:sha256(H),and_v(v:sha256(H),n:older(100))))':
    {
      miniscript:
        'thresh(3,j:and_v(v:ripemd160(H),and_v(v:ripemd160(H),n:older(110))),s:pk(A),s:pk(B),aj:and_v(v:sha256(H),and_v(v:sha256(H),n:older(100))))',
      script:
        'OP_SIZE OP_0NOTEQUAL OP_IF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY <6e> OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_SWAP <A> OP_CHECKSIG OP_ADD OP_SWAP <B> OP_CHECKSIG OP_ADD OP_TOALTSTACK OP_SIZE OP_0NOTEQUAL OP_IF OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUALVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUALVERIFY <64> OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_FROMALTSTACK OP_ADD 3 OP_EQUAL',
      nonMalleableSats: [
        {
          nSequence: 110,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> 0 <sig(A)> <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        },
        {
          nSequence: 110,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> <sig(B)> 0 <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        },
        {
          nSequence: 100,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> <sig(B)> <sig(A)> 0'
        }
      ],
      malleableSats: [
        {
          nSequence: 110,
          asm: '0 <sig(B)> <sig(A)> <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        }
      ]
    },
  'with unknowns sats - thresh(3,j:and_v(v:ripemd160(H),and_v(v:ripemd160(H),n:older(110))),s:pk(A),s:pk(B),aj:and_v(v:sha256(H),and_v(v:sha256(H),n:older(100))))':
    {
      miniscript:
        'thresh(3,j:and_v(v:ripemd160(H),and_v(v:ripemd160(H),n:older(110))),s:pk(A),s:pk(B),aj:and_v(v:sha256(H),and_v(v:sha256(H),n:older(100))))',
      script:
        'OP_SIZE OP_0NOTEQUAL OP_IF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY <6e> OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_SWAP <A> OP_CHECKSIG OP_ADD OP_SWAP <B> OP_CHECKSIG OP_ADD OP_TOALTSTACK OP_SIZE OP_0NOTEQUAL OP_IF OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUALVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUALVERIFY <64> OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_FROMALTSTACK OP_ADD 3 OP_EQUAL',
      unknowns: ['<sha256_preimage(H)>'],
      unknownSats: [
        {
          nSequence: 110,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> 0 <sig(A)> <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        },
        {
          nSequence: 110,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> <sig(B)> 0 <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        },
        {
          nSequence: 100,
          asm: '<sha256_preimage(H)> <sha256_preimage(H)> <sig(B)> <sig(A)> 0'
        }
      ],
      nonMalleableSats: [
        {
          nSequence: 110,
          asm: '0 <sig(B)> <sig(A)> <ripemd160_preimage(H)> <ripemd160_preimage(H)>'
        }
      ],
      malleableSats: []
    },
  'thresh(3,c:pk_k(key1),ac:pk_k(key2),altv:1,altv:1)': {
    miniscript: 'thresh(3,c:pk_k(key1),ac:pk_k(key2),altv:1,altv:1)',
    script:
      '<key1> OP_CHECKSIG OP_TOALTSTACK <key2> OP_CHECKSIG OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE 1 OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD OP_TOALTSTACK OP_IF 0 OP_ELSE 1 OP_VERIFY 1 OP_ENDIF OP_FROMALTSTACK OP_ADD 3 OP_EQUAL',
    nonMalleableSats: [
      { asm: '0 0 0 <sig(key1)>' },
      { asm: '0 0 <sig(key2)> 0' }
    ],
    malleableSats: [
      { asm: '1 0 <sig(key2)> <sig(key1)>' },
      { asm: '0 1 <sig(key2)> <sig(key1)>' }
    ]
  },
  //multi(k,key1,...,keyn)	-> <k> <key1> ... <keyn> <n> CHECKMULTISIG
  'multi(3,key1,key2,key3,key4)': {
    miniscript: 'multi(3,key1,key2,key3,key4)',
    script: '3 <key1> <key2> <key3> <key4> 4 OP_CHECKMULTISIG',
    nonMalleableSats: [
      { asm: '0 <sig(key1)> <sig(key2)> <sig(key3)>' },
      { asm: '0 <sig(key1)> <sig(key2)> <sig(key4)>' },
      { asm: '0 <sig(key1)> <sig(key3)> <sig(key4)>' },
      { asm: '0 <sig(key2)> <sig(key3)> <sig(key4)>' }
    ],
    malleableSats: []
  },
  'multi(2,key1,key2,key3,key4)': {
    miniscript: 'multi(2,key1,key2,key3,key4)',
    script: '2 <key1> <key2> <key3> <key4> 4 OP_CHECKMULTISIG',
    nonMalleableSats: [
      { asm: '0 <sig(key1)> <sig(key2)>' },
      { asm: '0 <sig(key1)> <sig(key3)>' },
      { asm: '0 <sig(key1)> <sig(key4)>' },
      { asm: '0 <sig(key2)> <sig(key3)>' },
      { asm: '0 <sig(key2)> <sig(key4)>' },
      { asm: '0 <sig(key3)> <sig(key4)>' }
    ],
    malleableSats: []
  },
  'multi(1,key1,key2)': {
    miniscript: 'multi(1,key1,key2)',
    script: '1 <key1> <key2> 2 OP_CHECKMULTISIG',
    nonMalleableSats: [{ asm: '0 <sig(key1)>' }, { asm: '0 <sig(key2)>' }],
    malleableSats: []
  },
  'multi(0,key1,key2,key3,key4)': {
    miniscript: 'multi(0,key1,key2,key3,key4)',
    script: '0 <key1> <key2> <key3> <key4> 4 OP_CHECKMULTISIG',
    throws: 'Miniscript multi(0,key1,key2,key3,key4) is not sane.'
  },

  //a:X	-> TOALTSTACK [X] FROMALTSTACK -> This has already been tested above.
  //s:X -> s:X	SWAP [X] -> This has already been tested above.
  //c:X -> [X] CHECKSIG -> Tested above.

  //d:X -> DUP IF [X] ENDIF
  'and_v(v:pk(key),or_d(nd:and_v(v:after(10),v:after(20)),0))': {
    miniscript: 'and_v(v:pk(key),or_d(nd:and_v(v:after(10),v:after(20)),0))',
    script:
      '<key> OP_CHECKSIGVERIFY OP_DUP OP_IF 10 OP_CHECKLOCKTIMEVERIFY OP_VERIFY <14> OP_CHECKLOCKTIMEVERIFY OP_VERIFY OP_ENDIF OP_0NOTEQUAL OP_IFDUP OP_NOTIF 0 OP_ENDIF',
    nonMalleableSats: [{ nLockTime: 20, asm: '1 <sig(key)>' }],
    malleableSats: []
  }

  //v:X	-> [X] VERIFY (or VERIFY version of last opcode in [X]) -> This has alrady been tested above.
  //j:X	-> SIZE 0NOTEQUAL IF [X] ENDIF -> This has alrady been tested above.
  //n:X -> [X] 0NOTEQUAL -> This has alrady been tested above.
};

export const timeLocks = {
  'Sign with key and older than 10 and older than 20 blocks': {
    policy: 'and(pk(key),and(older(10),older(20)))',
    miniscript: 'and_v(v:pk(key),and_v(v:older(10),older(20)))',
    script:
      '<key> OP_CHECKSIGVERIFY 10 OP_CHECKSEQUENCEVERIFY OP_VERIFY <14> OP_CHECKSEQUENCEVERIFY',
    nonMalleableSats: [{ asm: '<sig(key)>', nSequence: 20 }],
    malleableSats: []
  },
  '(Sign with key1 and older than 10 blocks) or (sign with key2 and older than 20 blocks)':
    {
      policy: 'or(and(pk(key1),older(10)),and(pk(key2),older(20)))',
      miniscript: 'andor(pk(key1),older(10),and_v(v:pk(key2),older(20)))',
      script:
        '<key1> OP_CHECKSIG OP_NOTIF <key2> OP_CHECKSIGVERIFY <14> OP_CHECKSEQUENCEVERIFY OP_ELSE 10 OP_CHECKSEQUENCEVERIFY OP_ENDIF',
      nonMalleableSats: [
        { nSequence: 10, asm: '<sig(key1)>' },
        { nSequence: 20, asm: '<sig(key2)> 0' }
      ],
      malleableSats: []
    },
  '(Sign with key1 and after than 10 seconds) or (sign with key2 and after than 20 sconds)':
    {
      policy: 'or(and(pk(key1),after(10)),and(pk(key2),after(20)))',
      miniscript: 'andor(pk(key1),after(10),and_v(v:pk(key2),after(20)))',
      script:
        '<key1> OP_CHECKSIG OP_NOTIF <key2> OP_CHECKSIGVERIFY <14> OP_CHECKLOCKTIMEVERIFY OP_ELSE 10 OP_CHECKLOCKTIMEVERIFY OP_ENDIF',
      nonMalleableSats: [
        { asm: '<sig(key1)>', nLockTime: 10 },
        { asm: '<sig(key2)> 0', nLockTime: 20 }
      ],
      malleableSats: []
    },
  'Throw on mix absolute time locks types. Sign with key and after than 10 and after 500000000':
    {
      miniscript: 'and_v(v:pk(key),and_v(v:after(10),after(500000000)))',
      script:
        '<key> OP_CHECKSIGVERIFY 10 OP_CHECKLOCKTIMEVERIFY OP_VERIFY <0065cd1d> OP_CHECKLOCKTIMEVERIFY',
      //throws: 'nLockTime values must be either below 500000000 or both above or equal 500000000'
      throws:
        'Miniscript and_v(v:pk(key),and_v(v:after(10),after(500000000))) is not sane.'
    },
  ['Throw on mix relative time locks types. Sign with key and older than 10 blocks and older than 512 seconds: ' +
  `and_v(v:pk(key),and_v(v:older(${bip68.encode({
    seconds: 1 * 512
  })}),older(${bip68.encode({ blocks: 10 })})))`]: {
    miniscript: `and_v(v:pk(key),and_v(v:older(${bip68.encode({
      seconds: 1 * 512
    })}),older(${bip68.encode({ blocks: 10 })})))`,
    //throws: 'a and b must both be either represent seconds or block height'
    throws:
      'Miniscript and_v(v:pk(key),and_v(v:older(4194305),older(10))) is not sane.'
  },
  'Do not throw on mix relative time locks types but using different paths. (Sign with key1 and older than 512 seconds) or (sign with key2 and older than 10 blocks)':
    {
      miniscript: `andor(pk(key1),older(${bip68.encode({
        seconds: 1 * 512
      })}),and_v(v:pk(key2),older(${bip68.encode({ blocks: 10 })})))`,
      script:
        '<key1> OP_CHECKSIG OP_NOTIF <key2> OP_CHECKSIGVERIFY 10 OP_CHECKSEQUENCEVERIFY OP_ELSE <010040> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
      nonMalleableSats: [
        {
          asm: '<sig(key1)>',
          nSequence: bip68.encode({
            seconds: 1 * 512
          })
        },
        { asm: '<sig(key2)> 0', nSequence: bip68.encode({ blocks: 10 }) }
      ],
      malleableSats: []
    },
  'and_v(and_v(v:pk(a),v:after(10)),and_v(v:pk(b),after(11)))': {
    policy: 'and(and(pk(a),after(10)),and(pk(b),after(11)))',
    miniscript: 'and_v(and_v(v:pk(a),v:after(10)),and_v(v:pk(b),after(11)))',
    script:
      '<a> OP_CHECKSIGVERIFY 10 OP_CHECKLOCKTIMEVERIFY OP_VERIFY <b> OP_CHECKSIGVERIFY 11 OP_CHECKLOCKTIMEVERIFY',
    nonMalleableSats: [{ asm: '<sig(b)> <sig(a)>', nLockTime: 11 }],
    malleableSats: []
  },

  'andor(pk(c),after(13),and_v(and_v(v:pk(a),v:after(10)),after(11)))': {
    policy: 'or(and(and(pk(a),after(10)),after(11)),and(pk(c),after(13)))',
    miniscript:
      'andor(pk(c),after(13),and_v(and_v(v:pk(a),v:after(10)),after(11)))',
    script:
      '<c> OP_CHECKSIG OP_NOTIF <a> OP_CHECKSIGVERIFY 10 OP_CHECKLOCKTIMEVERIFY OP_VERIFY 11 OP_CHECKLOCKTIMEVERIFY OP_ELSE 13 OP_CHECKLOCKTIMEVERIFY OP_ENDIF',
    nonMalleableSats: [
      { asm: '<sig(c)>', nLockTime: 13 },
      { asm: '<sig(a)> 0', nLockTime: 11 }
    ],
    malleableSats: []
  },
  'andor(pk(b),after(100),pk(a))': {
    policy: 'or(pk(a),and(pk(b),after(100)))',
    miniscript: 'andor(pk(b),after(100),pk(a))',
    script:
      '<b> OP_CHECKSIG OP_NOTIF <a> OP_CHECKSIG OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_ENDIF',
    nonMalleableSats: [
      { asm: '<sig(b)>', nLockTime: 100 },
      { asm: '<sig(a)> 0' }
    ],
    malleableSats: []
  }
};
export const other = {
  'and_v(v:pk(key_remote),hash160(H))': {
    miniscript: 'and_v(v:pk(key_remote),hash160(H))',
    nonMalleableSats: [{ asm: '<hash160_preimage(H)> <sig(key_remote)>' }],
    script:
      '<key_remote> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_HASH160 <H> OP_EQUAL',
    malleableSats: []
  },
  'and_v(v:pk(key),or_b(l:after(100),al:after(200)))': {
    miniscript: 'and_v(v:pk(key),or_b(l:after(100),al:after(200)))',
    script:
      '<key> OP_CHECKSIGVERIFY OP_IF 0 OP_ELSE <64> OP_CHECKLOCKTIMEVERIFY OP_ENDIF OP_TOALTSTACK OP_IF 0 OP_ELSE <c800> OP_CHECKLOCKTIMEVERIFY OP_ENDIF OP_FROMALTSTACK OP_BOOLOR',
    throws:
      'Miniscript and_v(v:pk(key),or_b(l:after(100),al:after(200))) is not sane.'
  },
  'and_v(v:pk(key_user),or_d(pk(key_service),older(12960)))': {
    miniscript: 'and_v(v:pk(key_user),or_d(pk(key_service),older(12960)))',
    script:
      '<key_user> OP_CHECKSIGVERIFY <key_service> OP_CHECKSIG OP_IFDUP OP_NOTIF <a032> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
    nonMalleableSats: [
      { nSequence: 12960, asm: '0 <sig(key_user)>' },
      { asm: '<sig(key_service)> <sig(key_user)>' }
    ],
    malleableSats: []
  },
  'andor(pk(matured),older(8640),pk(rushed))': {
    miniscript: 'andor(pk(matured),older(8640),pk(rushed))',
    script:
      '<matured> OP_CHECKSIG OP_NOTIF <rushed> OP_CHECKSIG OP_ELSE <c021> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
    nonMalleableSats: [
      { nSequence: 8640, asm: '<sig(matured)>' },
      { asm: '<sig(rushed)> 0' }
    ],
    malleableSats: []
  },
  'with unknown matured - andor(pk(matured),older(8640),pk(rushed))': {
    miniscript: 'andor(pk(matured),older(8640),pk(rushed))',
    script:
      '<matured> OP_CHECKSIG OP_NOTIF <rushed> OP_CHECKSIG OP_ELSE <c021> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
    unknowns: ['<sig(matured)>'],
    unknownSats: [{ nSequence: 8640, asm: '<sig(matured)>' }],
    nonMalleableSats: [{ asm: '<sig(rushed)> 0' }],
    malleableSats: []
  },
  'with unknown rushed - andor(pk(matured),older(8640),pk(rushed))': {
    miniscript: 'andor(pk(matured),older(8640),pk(rushed))',
    script:
      '<matured> OP_CHECKSIG OP_NOTIF <rushed> OP_CHECKSIG OP_ELSE <c021> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
    unknowns: ['<sig(rushed)>'],
    unknownSats: [{ asm: '<sig(rushed)> 0' }],
    nonMalleableSats: [{ nSequence: 8640, asm: '<sig(matured)>' }],
    malleableSats: []
  },
  'thresh(3,pk(key_1),s:pk(key_2),s:pk(key_3),sln:older(12960))': {
    miniscript: 'thresh(3,pk(key_1),s:pk(key_2),s:pk(key_3),sln:older(12960))',
    script:
      '<key_1> OP_CHECKSIG OP_SWAP <key_2> OP_CHECKSIG OP_ADD OP_SWAP <key_3> OP_CHECKSIG OP_ADD OP_SWAP OP_IF 0 OP_ELSE <a032> OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_ADD 3 OP_EQUAL',
    nonMalleableSats: [
      { nSequence: 12960, asm: '0 0 <sig(key_2)> <sig(key_1)>' },
      { nSequence: 12960, asm: '0 <sig(key_3)> 0 <sig(key_1)>' },
      { nSequence: 12960, asm: '0 <sig(key_3)> <sig(key_2)> 0' },
      { asm: '1 <sig(key_3)> <sig(key_2)> <sig(key_1)>' }
    ],
    malleableSats: []
  },
  'andor(pk(key_local),older(1008),pk(key_revocation))': {
    miniscript: 'andor(pk(key_local),older(1008),pk(key_revocation))',
    script:
      '<key_local> OP_CHECKSIG OP_NOTIF <key_revocation> OP_CHECKSIG OP_ELSE <f003> OP_CHECKSEQUENCEVERIFY OP_ENDIF',
    nonMalleableSats: [
      { nSequence: 1008, asm: '<sig(key_local)>' },
      { asm: '<sig(key_revocation)> 0' }
    ],
    malleableSats: []
  },
  't:or_c(pk(key_revocation),and_v(v:pk(key_remote),or_c(pk(key_local),v:hash160(H))))':
    {
      miniscript:
        't:or_c(pk(key_revocation),and_v(v:pk(key_remote),or_c(pk(key_local),v:hash160(H))))',
      script:
        '<key_revocation> OP_CHECKSIG OP_NOTIF <key_remote> OP_CHECKSIGVERIFY <key_local> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_HASH160 <H> OP_EQUALVERIFY OP_ENDIF OP_ENDIF 1',
      nonMalleableSats: [
        { asm: '<sig(key_revocation)>' },
        { asm: '<hash160_preimage(H)> 0 <sig(key_remote)> 0' }
      ],
      malleableSats: [{ asm: '<sig(key_local)> <sig(key_remote)> 0' }]
    },
  'with unknown preimage - t:or_c(pk(key_revocation),and_v(v:pk(key_remote),or_c(pk(key_local),v:hash160(H))))':
    {
      miniscript:
        't:or_c(pk(key_revocation),and_v(v:pk(key_remote),or_c(pk(key_local),v:hash160(H))))',
      script:
        '<key_revocation> OP_CHECKSIG OP_NOTIF <key_remote> OP_CHECKSIGVERIFY <key_local> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_HASH160 <H> OP_EQUALVERIFY OP_ENDIF OP_ENDIF 1',
      unknowns: ['<hash160_preimage(H)>'],
      unknownSats: [{ asm: '<hash160_preimage(H)> 0 <sig(key_remote)> 0' }],
      nonMalleableSats: [
        { asm: '<sig(key_local)> <sig(key_remote)> 0' },
        { asm: '<sig(key_revocation)>' }
      ],
      malleableSats: []
    },
  'andor(pk(key_remote),or_i(and_v(v:pkh(key_local),hash160(H)),older(1008)),pk(key_revocation))':
    {
      miniscript:
        'andor(pk(key_remote),or_i(and_v(v:pkh(key_local),hash160(H)),older(1008)),pk(key_revocation))',
      script:
        '<key_remote> OP_CHECKSIG OP_NOTIF <key_revocation> OP_CHECKSIG OP_ELSE OP_IF OP_DUP OP_HASH160 <HASH160(key_local)> OP_EQUALVERIFY OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_HASH160 <H> OP_EQUAL OP_ELSE <f003> OP_CHECKSEQUENCEVERIFY OP_ENDIF OP_ENDIF',
      nonMalleableSats: [
        { nSequence: 1008, asm: '0 <sig(key_remote)>' },
        { asm: '<sig(key_revocation)> 0' },
        {
          asm: '<hash160_preimage(H)> <sig(key_local)> <key_local> 1 <sig(key_remote)>'
        }
      ],
      malleableSats: []
    },
  'thresh(1,pkh(@0),a:and_n(multi(1,@1,@2),n:older(2)))': {
    miniscript: 'thresh(1,pkh(@0),a:and_n(multi(1,@1,@2),n:older(2)))',
    script:
      'OP_DUP OP_HASH160 <HASH160(@0)> OP_EQUALVERIFY OP_CHECKSIG OP_TOALTSTACK 1 <@1> <@2> 2 OP_CHECKMULTISIG OP_NOTIF 0 OP_ELSE 2 OP_CHECKSEQUENCEVERIFY OP_0NOTEQUAL OP_ENDIF OP_FROMALTSTACK OP_ADD 1 OP_EQUAL',
    nonMalleableSats: [
      { asm: '0 0 <sig(@0)> <@0>' },
      { asm: '0 <sig(@1)> 0 <@0>', nSequence: 2 },
      { asm: '0 <sig(@2)> 0 <@0>', nSequence: 2 }
    ],
    malleableSats: []
  }
};
export const knowns = {
  'with unknowns - and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    unknowns: ['<sha256_preimage(H)>'],
    unknownSats: [{ asm: '<sha256_preimage(H)> <sig(k)>' }],
    //If the preimage is unknown we cannot compute any satisfaction
    nonMalleableSats: [],
    malleableSats: []
  },
  'with knowns - and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    knowns: ['<sig(k)>'],
    unknownSats: [{ asm: '<sha256_preimage(H)> <sig(k)>' }],
    //If the preimage is unknown we cannot compute any satisfaction
    nonMalleableSats: [],
    malleableSats: []
  },
  'with all knowns - and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    knowns: ['<sig(k)>', '<sha256_preimage(H)>'],
    unknownSats: [],
    //If the preimage is unknown we cannot compute any satisfaction
    nonMalleableSats: [{ asm: '<sha256_preimage(H)> <sig(k)>' }],
    malleableSats: []
  },
  'throws with both knowns and unknowns - and_v(v:pk(k),sha256(H))': {
    miniscript: 'and_v(v:pk(k),sha256(H))',
    script:
      '<k> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_SHA256 <H> OP_EQUAL',
    knowns: ['<sig(k)>'],
    unknowns: ['<sha256_preimage(H)>'],
    throws: 'Cannot pass both knowns and unknowns'
  },
  'with unknows set - c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))': {
    miniscript: 'c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))',
    script:
      '<key1> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_ENDIF <key2> OP_CHECKSIG',
    unknowns: ['<ripemd160_preimage(H)>'],
    unknownSats: [{ asm: '<sig(key2)> <ripemd160_preimage(H)> 0' }],
    nonMalleableSats: [{ asm: '<sig(key2)> <sig(key1)>' }],
    malleableSats: []
  },
  'with knows set - c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))': {
    miniscript: 'c:and_v(or_c(pk(key1),v:ripemd160(H)),pk_k(key2))',
    script:
      '<key1> OP_CHECKSIG OP_NOTIF OP_SIZE <20> OP_EQUALVERIFY OP_RIPEMD160 <H> OP_EQUALVERIFY OP_ENDIF <key2> OP_CHECKSIG',
    knowns: ['<sig(key1)>', '<sig(key2)>'],
    unknownSats: [{ asm: '<sig(key2)> <ripemd160_preimage(H)> 0' }],
    nonMalleableSats: [{ asm: '<sig(key2)> <sig(key1)>' }],
    malleableSats: []
  }
};
