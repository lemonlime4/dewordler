export type AsciiLowercaseChar = string & { readonly __tag: unique symbol };
export function isAsciiLowercaseChar(s: string): s is AsciiLowercaseChar {
    const inRange = (cc: number) => 97 <= cc && cc <= 122;
    return s.length === 1 && inRange(s.charCodeAt(0));
}

type IndicesArray<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc
    : IndicesArray<N, [...Acc, Acc['length']]>;

export const indices5 = [...Array(5).keys()] as IndicesArray<5>;
export const indices26 = [...Array(26).keys()] as IndicesArray<26>;

// type IntsInRange<N extends number, Acc extends number[] = []> = Acc['length'] extends N
//     ? Acc[number]
//     : IntsInRange<N, [...Acc, Acc['length']]>;
export type IntInRange<N extends number> = IndicesArray<N>[keyof IndicesArray<N> &
    number];

/** Letter index for A-Z */
export type Letter = IntInRange<26>;

export function toLetter(c: AsciiLowercaseChar): Letter {
    return (c.charCodeAt(0) - 97) as Letter;
}

export function toChar(l: Letter): AsciiLowercaseChar {
    return String.fromCharCode(l + 97) as AsciiLowercaseChar;
}

/** Blank, green or yellow color */
export type Color = 0 | 1 | 2;
export const Color = Object.freeze({
    BLANK: 0 as Color,
    YELLOW: 1 as Color,
    GREEN: 2 as Color,
} as const);

/** Fixed size array type */
export type FsArray<N extends number, T, R extends T[] = []> = N extends N
    ? R['length'] extends N
        ? R
        : FsArray<N, T, [T, ...R]>
    : never;

export function makeFsArray<
    N extends number,
    T extends number | boolean | string | undefined | null,
>(n: N, x: T): FsArray<N, T> {
    return Array.from({ length: n }, () => x) as FsArray<N, T>;
}
export function makeFsArrayFn<N extends number, T>(
    n: N,
    f: (x: IntInRange<N>) => T,
): FsArray<N, T> {
    return Array.from({ length: n }, (_, i) => f(i as IntInRange<N>)) as FsArray<N, T>;
}

// todo reread this
type _ZipResult<
    Ts extends [unknown[], ...unknown[][]] & {
        [_ in keyof Ts]: {
            length: Ts[0]['length'];
        };
    },
> = Ts[0] extends { length: infer N extends number }
    ? number extends N
        ? never
        : FsArray<
              N,
              {
                  [K in keyof Ts]: Ts[K] extends (infer T)[] ? T : never;
              }
          >
    : never;
export function zip<
    Ts extends [unknown[], ...unknown[][]] & {
        [_ in keyof Ts]: {
            length: Ts[0]['length'];
        };
    },
>(...args: Ts): _ZipResult<Ts> {
    return Array.from(args[0], (_, i) => args.map(xs => xs[i])) as _ZipResult<Ts>;
}

export type PartialWord = FsArray<5, Letter | null>;
export type Word = FsArray<5, Letter>;
export type Colors = FsArray<5, Color>;

export class WordGuess {
    letters: PartialWord = makeFsArray(5, null);
    colors: Colors = makeFsArray(5, Color.BLANK);

    isFilled(): this is FilledWordGuess {
        return this.letters.every(l => l !== null);
    }

    tryToFilled(): FilledWordGuess | undefined {
        if (this.isFilled()) return this;
        return undefined;
    }

    assignColor(solution: Word): Colors {
        const soln: PartialWord = [...solution];
        const colors = this.colors;
        const guess = this.letters;

        for (const i of indices5) {
            if (guess[i] === soln[i]) {
                colors[i] = Color.GREEN;
                soln[i] = null;
            } else {
                colors[i] = Color.BLANK;
            }
        }
        for (const i of indices5) {
            if (colors[i] !== Color.GREEN) {
                const j = soln.indexOf(guess[i]);
                if (j !== -1) {
                    colors[i] = Color.YELLOW;
                    soln[j] = null;
                }
            }
        }

        return colors;
    }
}

export interface FilledWordGuess extends WordGuess {
    letters: Word;
}
