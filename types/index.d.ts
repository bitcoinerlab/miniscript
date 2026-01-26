// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

export declare const compileMiniscript: (miniscript: string) => {
  asm: string;
  issane: boolean;
  issanesublevel: boolean;
};

export declare const compileMiniscript: (
  miniscript: string,
  options?: {
    tapscript?: boolean;
  }
) => {
  asm: string;
  issane: boolean;
  issanesublevel: boolean;
  error?: string | null;
};

export declare const ready: Promise<void>;

export declare const analyzeMiniscript: (
  miniscript: string,
  options?: {
    tapscript?: boolean;
  }
) => {
  issane: boolean;
  issanesublevel: boolean;
  valid: boolean;
  error?: string | null;
  needsSignature: boolean;
  nonMalleable: boolean;
  timelockMix: boolean;
  hasDuplicateKeys: boolean;
};

export declare const satisfier: (
  miniscript: string,
  options?:
    | {
        unknowns?: string[] | undefined;
        knowns?: string[] | undefined;
      }
    | undefined
) => {
  unknownSats?: Array<{
    asm: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
  nonMalleableSats?: Array<{
    asm: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
  malleableSats?: Array<{
    asm: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
};
