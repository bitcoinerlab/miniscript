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
