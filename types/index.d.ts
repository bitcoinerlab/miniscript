export declare const compileMiniscript: (miniscript: string) => {
  asm: string;
  issane: boolean;
  issanesublevel: boolean;
};

export declare const compilePolicy: (miniscript: string) => {
  miniscript: string;
  asm: string;
  issane: boolean;
  issanesublevel: boolean;
};

export declare const satisfier: (
  miniscript: string,
  unknowns?: string[]
) => {
  unknownSats?: Array<{
    witness: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
  nonMalleableSats?: Array<{
    witness: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
  malleableSats?: Array<{
    witness: string;
    nLockTime?: number;
    nSequence?: number;
  }>;
};
