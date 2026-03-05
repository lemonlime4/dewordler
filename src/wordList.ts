import { Constraint } from './constraint';
import {
    isAsciiLowercaseChar,
    toLetter,
    WordGuess,
    type Letter,
    type Word,
} from './word';

const wordListBytes: Uint8Array = await fetch('/valid-wordle-words.txt')
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

export const wordListLength = wordListBytes.length / 5;
export function* wordList(): Generator<Word> {
    for (let i = 0; i < wordListBytes.length; i += 5) {
        yield [...wordListBytes.subarray(i, i + 5)] as Word;
    }
}

export function* searchWords(cons: Constraint): Generator<Word> {
    for (const word of wordList()) {
        if (!cons.satisfiedBy(word)) continue;
        yield word;
    }
}

Object.assign(globalThis, { Constraint, WordGuess });
