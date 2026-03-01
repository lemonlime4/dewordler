export type AsciiLowercaseChar = string & { readonly __tag: unique symbol };
export function isAsciiLowercaseChar(s: string): s is AsciiLowercaseChar {
    const inRange = (cc: number) => 97 <= cc && cc <= 122;
    return s.length === 1 && inRange(s.charCodeAt(0));
}

type Indices<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc
    : Indices<N, [...Acc, Acc['length']]>;

/** Letter index for A-Z */
export type Letter = Indices<26>[number];

function intRange<N extends number>(n: N): Indices<N> {
    return [...Array(n).keys()] as Indices<N>;
}
export const intRange5 = intRange(5);
export const intRange26 = intRange(26);

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
type FSArray<N extends number, T, R extends T[] = []> = R['length'] extends N
    ? R
    : FSArray<N, T, [T, ...R]>;

function makeFSArray<N extends number, T>(n: N, x: T): FSArray<N, T> {
    return Array.from({ length: n }, () => structuredClone(x)) as FSArray<N, T>;
}

export type PartialWord = FSArray<5, Letter | null>;
export type Word = FSArray<5, Letter>;
export type Colors = FSArray<5, Color>;

export class WordGuess {
    letters: PartialWord = makeFSArray(5, null);
    colors: Colors = makeFSArray(5, Color.BLANK);

    isFilled(): this is FilledWordGuess {
        return this.letters.every(l => l !== null);
    }

    assignColor(solution: Word): Colors {
        let soln: PartialWord = [...solution];
        const colors = this.colors;
        const guess = this.letters;

        for (const i of intRange5) {
            if (guess[i] === soln[i]) {
                colors[i] = Color.GREEN;
                soln[i] = null;
            }
        }
        for (const i of intRange5) {
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

export class Constraints {
    exclude = makeFSArray(5, makeFSArray(26, false));
    include = makeFSArray(26, 0);
    green = makeFSArray(5, null as Letter | null);

    constructor(guesses: WordGuess[]) {
        const blank = makeFSArray(26, false);
        for (const guess of guesses) {
            if (!guess.isFilled()) continue;

            const include = makeFSArray(26, 0);
            for (const i of intRange5) {
                const color = guess.colors[i];
                const l = guess.letters[i];

                if (color === Color.BLANK) {
                    this.exclude[i][l] = true;
                    blank[l] = true;
                }
                if (color === Color.GREEN) {
                    if (this.green[i] !== null && this.green[i] != l) {
                        throw new WordleInputError(
                            'Contradictory green letters in input',
                        );
                    }
                    this.green[i] = l;
                    include[l] += 1;
                }
                if (color === Color.YELLOW) {
                    this.exclude[i][l] = true;
                    include[l] += 1;
                }
            }
            for (const l of intRange26) {
                this.include[l] = Math.max(this.include[l], include[l]);
            }

            if (5 < this.include.reduce((acc, n) => acc + n, 0)) {
                throw new WordleInputError('More than 5 letters required');
            }
            // error when more letters are required than available
        }
        // propagate blank letters to other parts
        for (const l of intRange26) {
            // if (blank[l])
        }
    }

    satisfiedBy(word: Word) {
        const { exclude, include, green } = this;
        for (const i of intRange5) {
            if (green[i] !== null && green[i] !== word[i]) return false;
            if (exclude[i][word[i]]) return false;
        }

        if (!include.every((n, yl) => n <= word.filter(wl => wl == yl).length)) {
            return false;
        }
        return true;
    }
}

// todo type this to have elements of type Letter
const wordListBytes = await fetch('/valid-wordle-words.txt')
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
    );
if (wordListBytes.length % 5 !== 0)
    throw new Error(`Uint8Array wordListBytes has invalid length`);

export const wordListLength = Math.floor(wordListBytes.length / 5);
export function* wordList(): Generator<Word> {
    for (let i = 0; i < wordListLength * 5; i += 5) {
        yield [
            wordListBytes[i + 0] as Letter,
            wordListBytes[i + 1] as Letter,
            wordListBytes[i + 2] as Letter,
            wordListBytes[i + 3] as Letter,
            wordListBytes[i + 4] as Letter,
        ];
    }
}

export function* searchWords(constraints: Constraints): Generator<Word> {
    // console.log('blank:', blank, '\nyellow:', yellow, '\ngreen:', green);

    for (const word of wordList()) {
        if (!constraints.satisfiedBy(word)) continue;
        yield word;
    }
}

Object.assign(globalThis, { Color, Constraints });
