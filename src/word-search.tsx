type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>;
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;
export type Letter = IntRange<97, 123>;

export function charCodeIsLetter(n: number): n is Letter {
    return Number.isInteger(n) && 97 <= n && n <= 122;
}

export const Color = {
    BLANK: 0,
    YELLOW: 1,
    GREEN: 2,
} as const;

export type Color = (typeof Color)[keyof typeof Color];

type FixedSizeArray<N extends number, T, R extends T[] = []> = R['length'] extends N
    ? R
    : FixedSizeArray<N, T, [T, ...R]>;

export type Word = FixedSizeArray<5, Letter>;

export class WordGuess {
    letters: FixedSizeArray<5, Letter | null> = [null, null, null, null, null];
    colors: FixedSizeArray<5, Color> = [
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
    ];

    isFilled(): this is FilledWordGuess {
        return this.letters.every(l => l !== null);
    }
}

interface FilledWordGuess extends WordGuess {
    letters: Word;
}

class Constraints {
    blank: FixedSizeArray<5, Letter[]> = [[], [], [], [], []];
    yellow: FixedSizeArray<5, Letter[]> = [[], [], [], [], []];
    green: FixedSizeArray<5, Letter | null> = [null, null, null, null, null];

    constructor(guesses: WordGuess[]) {
        // TODO handle self contradicting input

        for (const guess of guesses) {
            if (!guess.isFilled()) continue;

            for (const i of [0, 1, 2, 3, 4] as const) {
                const color = guess.colors[i];
                const letter = guess.letters[i];

                if (color == Color.BLANK) {
                    this.blank[i].push(letter);
                }
                if (color == Color.GREEN) {
                    this.green[i] = letter;
                }
                if (color == Color.YELLOW) {
                    this.yellow[i].push(letter);
                }
            }
        }
    }
}

// todo type this to have elements of type Letter
const wordListBytes = await fetch('src/assets/valid-wordle-words.txt')
    .then(r => r.text())
    .then(
        wordListStr =>
            new Uint8Array(
                (function* (): Generator<Letter> {
                    let nLetters = 0;
                    for (const char of wordListStr) {
                        if (char == '\n' || char == '\r') {
                            if (nLetters != 5 && nLetters != 0) {
                                throw new Error(
                                    `Word of length ${nLetters} in word list.`,
                                );
                            }
                            nLetters = 0;
                        } else {
                            nLetters++;
                            let c = char.charCodeAt(0);
                            if (!charCodeIsLetter(c)) {
                                throw new Error(
                                    `Invalid non-whitespace char '${char}' (${c}) found in word list.`,
                                );
                            }
                            yield c;
                        }
                    }
                })(),
            ),
    );
if (wordListBytes.length % 5 != 0)
    throw new Error(`Uint8Array wordListBytes has invalid length`);

function* wordList(): Generator<Word> {
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

export function* searchWords(guesses: WordGuess[]): Generator<Word> {
    const { blank, yellow, green } = new Constraints(guesses);
    // console.log('blank:', blank, '\nyellow:', yellow, '\ngreen:', green);

    outer: for (const word of wordList()) {
        for (const i of [0, 1, 2, 3, 4] as const) {
            if (blank[i].includes(word[i])) continue outer;

            if (yellow[i].includes(word[i])) continue outer;

            if (green[i] && green[i] != word[i]) continue outer;
        }

        for (const j of [0, 1, 2, 3, 4] as const) {
            if (yellow[j].length > 0 && !yellow[j].every(l => word.includes(l))) {
                continue outer;
            }
        }
        yield word;
    }
}

Object.assign(globalThis, { wordList });
