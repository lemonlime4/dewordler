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

export class Word {
    letters: FixedSizeArray<5, Letter | null> = [null, null, null, null, null];
    colors: FixedSizeArray<5, Color> = [
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
        Color.BLANK,
    ];

    isFilled(): this is FilledWord {
        return this.letters.every(l => l !== null);
    }
}

interface FilledWord extends Word {
    letters: FixedSizeArray<5, Letter>;
}

type Constraints = {
    blank: FixedSizeArray<5, Letter[]>;
    green: FixedSizeArray<5, Letter[]>;
    yellow: FixedSizeArray<5, Letter[]>;
};

function makeConstraints(words: Word[]): Constraints {
    const constraints: Constraints = {
        blank: [[], [], [], [], []],
        green: [[], [], [], [], []],
        yellow: [[], [], [], [], []],
    };

    for (const word of words) {
        if (!word.isFilled()) continue;

        for (const i of [0, 1, 2, 3, 4] as const) {
            const color = word.colors[i];
            const letter = word.letters[i];

            if (color == Color.BLANK) {
                constraints.blank[i].push(letter);
            }
            if (color == Color.GREEN) {
                constraints.green[i].push(letter);
            }
            if (color == Color.YELLOW) {
                constraints.yellow[i].push(letter);
            }
        }
    }

    return constraints;
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
const nWords = wordListBytes.length / 5;
if (!Number.isInteger(nWords))
    throw new Error(`Uint8Array wordListBytes has invalid length ${nWords}`);

Object.assign(globalThis, { words: wordListBytes });
