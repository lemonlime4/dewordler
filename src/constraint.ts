import {
    Color,
    indices26,
    indices5,
    makeFsArray,
    makeFsArrayFn,
    toChar,
    zip,
    type FilledWordGuess,
    type FsArray,
    type Letter,
    type Word,
} from './word';

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

// debug
declare global {
    var logging: boolean;
}
globalThis.logging = false;
function log(...args: unknown[]) {
    if (globalThis.logging) console.log(...args);
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
    }

    toString() {
        let count_reqs = [];
        for (const [l, min, exact] of zip(indices26, this.min_count, this.exact)) {
            if (min === 0) continue;
            const rel = exact ? '=' : '≥';
            count_reqs.push(`${toChar(l)} ${rel} ${min}`);
        }
        let pos_reqs = this.positional.map((lc, i) => {
            let cons;
            if (lc.tag == 'exact') {
                cons = toChar(lc.exact);
            }
            if (lc.tag == 'exclude') {
                cons = `\\ ${lc.exclude
                    .map((b, l) => (b ? toChar(l as Letter) : null))
                    .filter(x => x !== null)
                    .join(' ')}`;
            }
            return `L${i + 1}: ${cons}`;
        });
        return `Constraint:\n${count_reqs.join(', ')}\n${pos_reqs.join('\n')}`;
    }

    merge(other: Constraint): this {
        // todo: error when same letter is colored differently in same position
        // ^ this doesn't apply in the case of yellow double letters
        // todo: error when result constraint is impossible to satisfy
        // - a letter is green more times than its exact count

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
                // todo remember this if you ever switch to classes
                this.positional[i] = structuredClone(ocons);
            }
            if (tcons.tag === 'exclude' && ocons.tag === 'exclude') {
                for (const l of indices26) {
                    tcons.exclude[l] ||= ocons.exclude[l];
                }
            }
        }
        return this;
    }

    satisfiedBy(word: Word): boolean {
        const occurrences = makeFsArray(26, 0);
        for (const letter of word) occurrences[letter] += 1;
        for (const [l, min, n, exact] of zip(
            indices26,
            this.min_count,
            occurrences,
            this.exact,
        )) {
            if ((exact && min !== n) || (!exact && n < min)) {
                log(toChar(l), exact, min, n);
                return false;
            }
        }

        for (const [letter, cons] of zip(word, this.positional)) {
            if (
                (cons.tag === 'exact' && letter !== cons.exact) ||
                (cons.tag === 'exclude' && cons.exclude[letter])
            ) {
                log(toChar(letter), cons);
                return false;
            }
        }
        return true;
    }
}
