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
type IntInRange<N extends number> = IndicesArray<N>[keyof IndicesArray<N> & number];

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
type FsArray<N extends number, T, R extends T[] = []> = N extends N
    ? R['length'] extends N
        ? R
        : FsArray<N, T, [T, ...R]>
    : never;

function makeFsArray<
    N extends number,
    T extends number | boolean | string | undefined | null,
>(n: N, x: T): FsArray<N, T> {
    return Array.from({ length: n }, () => x) as FsArray<N, T>;
}
function makeFsArrayFn<N extends number, T>(
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
function zip<
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

interface FilledWordGuess extends WordGuess {
    letters: Word;
}

/** Wordle input was impossible */
export class WordleInputError extends Error {}

type LetterConstraint = ExactConstraint | ExcludeConstraint;
/** Green letter */
type ExactConstraint = {
    readonly tag: 'exact';
    exact: Letter;
};
/** Non-green letter */
type ExcludeConstraint = {
    readonly tag: 'exclude';
    exclude: FsArray<26, boolean>;
};
function exactConstraint(exact: Letter): ExactConstraint {
    return { tag: 'exact', exact };
}
function excludeConstraint(exclude: Letter[]): ExcludeConstraint {
    return {
        tag: 'exclude',
        exclude: makeFsArrayFn(26, letter => exclude.includes(letter)),
    };
}

let logging = false;
function log(...args: unknown[]) {
    if (logging) console.log(...args);
}

export class Constraint {
    positional: FsArray<5, LetterConstraint>;
    min_count: FsArray<26, number> = makeFsArray(26, 0);
    exact: FsArray<26, boolean> = makeFsArray(26, false);

    // todo: is the global information of "maximum possible occurrences of a letter" useful?

    constructor(guess?: FilledWordGuess) {
        if (!guess) {
            this.positional = makeFsArrayFn(5, () => excludeConstraint([]));
            return;
        }

        const { letters, colors } = guess;

        // 0 if not found, otherwise i + 1
        const first_blank: FsArray<26, number> = makeFsArray(26, 0);
        const first_yellow: FsArray<26, number> = makeFsArray(26, 0);

        this.positional = makeFsArrayFn(5, i => {
            const color = colors[i];
            const letter = letters[i];
            if (color == Color.GREEN) {
                this.min_count[letter] += 1;
                return exactConstraint(letter);
            }
            if (color == Color.YELLOW) {
                if (!first_yellow[letter]) {
                    first_yellow[letter] = i + 1;
                }
                this.min_count[letter] += 1;
            }
            if (color == Color.BLANK) {
                if (!first_blank[letter]) {
                    first_blank[letter] = i + 1;
                }
            }
            return excludeConstraint([letter]);
        });
        for (const letter of indices26) {
            const y = first_yellow[letter];
            const b = first_blank[letter];

            if (b && !y) {
                // we can spread the exclusion to other positions iff we know that the blank letter is not concurrently looking for a place
                for (const cons of this.positional) {
                    if (cons.tag === 'exclude') {
                        cons.exclude[letter] = true;
                    }
                }
            }
            if (y && !b) {
                //
            }
            if (y && b) {
                if (b < y) {
                    // overly pedantic?
                    throw new WordleInputError(
                        `Letter '${toChar(letter).toUpperCase()}' was colored yellow before blank`,
                    );
                }
                this.exact[letter] = true;
            }
        }
        console.log(this);
    }

    merge(other: Constraint): this {
        // todo: error when same letter is colored differently in same position
        // todo: error when result constraint is impossible to satisfy

        for (const [l, m1, m2, e1, e2] of zip(
            indices26,
            this.min_count,
            other.min_count,
            this.exact,
            other.exact,
        )) {
            // other cases with the same error?
            if ((m1 < m2 && e1) || (m2 < m1 && e2)) {
                throw new WordleInputError(`Inconsistent occurrence count requirements`);
            }
            this.min_count[l] = Math.max(m1, m2);
            this.exact[l] = e1 || e2;
        }

        for (const [i, tcons, ocons] of zip(
            indices5,
            this.positional,
            other.positional,
        )) {
            if (
                tcons.tag === 'exact' &&
                ocons.tag === 'exact' &&
                tcons.exact !== ocons.exact
            ) {
                throw new WordleInputError(`Inconsistent green letters`);
            }
            if (
                tcons.tag === 'exact' &&
                ocons.tag === 'exclude' &&
                ocons.exclude[tcons.exact]
            ) {
                throw new WordleInputError(`Letter is both green and excluded`);
            }
            if (tcons.tag === 'exclude' && ocons.tag === 'exact') {
                if (tcons.exclude[ocons.exact]) {
                    throw new WordleInputError(`Letter is both green and excluded`);
                }
                this.positional[i] = structuredClone(ocons);
            }
            if (tcons.tag === 'exclude' && ocons.tag === 'exclude') {
                for (const l of indices26) {
                    tcons.exclude[l] ||= ocons.exclude[l];
                }
            }
        }

        console.log(this);
        return this;
    }

    satisfiedBy(word: Word): boolean {
        const occurrences = makeFsArray(26, 0);
        for (const letter of word) occurrences[letter] += 1;
        for (const [min, n, exact] of zip(this.min_count, occurrences, this.exact)) {
            if ((exact && min !== n) || (!exact && n < min)) return false;
        }

        for (const [letter, cons] of zip(word, this.positional)) {
            if (
                (cons.tag === 'exact' && letter !== cons.exact) ||
                (cons.tag === 'exclude' && cons.exclude[letter])
            )
                return false;
        }
        return true;
    }
}

interface TypedLetterArray extends Uint8Array {
    readonly [index: number]: Letter;
}
const wordListBytes: TypedLetterArray = (await fetch('/valid-wordle-words.txt')
    .then(r => r.text())
    .then(
        wordListStr =>
            new Uint8Array(
                (function* (): Generator<Letter> {
                    // console.log(wordListStr);
                    let nLetters = 0;
                    for (const char of wordListStr) {
                        if (char === '\n' || char === '\r') {
                            if (nLetters !== 5 && nLetters !== 0) {
                                throw new Error(
                                    `Word of length ${nLetters} in word list.`,
                                );
                            }
                            nLetters = 0;
                        } else {
                            nLetters++;
                            if (!isAsciiLowercaseChar(char)) {
                                throw new Error(
                                    `Invalid non-whitespace char '${char}' (code point ${char.codePointAt(0)}) found in word list.`,
                                );
                            }
                            yield toLetter(char);
                        }
                    }
                })(),
            ),
    )) as TypedLetterArray;

if (wordListBytes.length % 5 !== 0)
    throw new Error(`Uint8Array wordListBytes has invalid length`);

export const wordListLength = wordListBytes.length / 5;
export function* wordList(): Generator<Word> {
    for (let i = 0; i < wordListBytes.length; i += 5) {
        yield [
            wordListBytes[i + 0] as Letter,
            wordListBytes[i + 1] as Letter,
            wordListBytes[i + 2] as Letter,
            wordListBytes[i + 3] as Letter,
            wordListBytes[i + 4] as Letter,
        ];
    }
}

export function* searchWords(cons: Constraint): Generator<Word> {
    for (const word of wordList()) {
        if (!cons.satisfiedBy(word)) continue;
        yield word;
    }
}

Object.assign(globalThis, { Constraint, WordGuess });
