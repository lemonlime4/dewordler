import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import './App.css';

import { Constraint, WordleInputError } from './constraint';
import {
    Color,
    indices5,
    isAsciiLowercaseChar,
    type Letter,
    makeFsArray,
    toChar,
    toLetter,
    type Word,
    WordGuess,
} from './word';
import { searchWords } from './wordList';

export default App;

// debug
declare global {
    var guesses: WordGuess[];
    var lastConstraint: Constraint;
}

function App() {
    const makeStoreWord = () => createStore(new WordGuess())[0];
    const [guesses, setGuesses] = createStore([
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
    ]);
    globalThis.guesses = guesses;

    {
        const gs = JSON.parse(
            localStorage.getItem('wordleinputstate') ?? '',
        ) as WordGuess[];

        gs.forEach((g, i) => {
            setGuesses(i, 'letters', g.letters);
            setGuesses(i, 'colors', g.colors);
        });
        localStorage.setItem('wordleinputstate', JSON.stringify(guesses));
        createEffect(() => {
            localStorage.setItem('wordleinputstate', JSON.stringify(guesses));
        });
    }
    const [active, setActive] = createStore({
        word: 0,
        letter: 0,
    });

    const listener = (ev: KeyboardEvent) => {
        if (ev.key === 'Tab') {
            ev.preventDefault();
        } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
            let offset = ev.key === 'ArrowUp' ? -1 : 1;
            setActive('word', wi =>
                Math.max(0, Math.min(guesses.length - 1, wi + offset)),
            );
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            let offset = ev.key === 'ArrowLeft' ? -1 : 1;
            setActive('letter', li => Math.max(0, Math.min(4, li + offset)));
        } else if (ev.key === 'Backspace' && ev.ctrlKey) {
            setGuesses(active.word, 'letters', indices5, null);
            setGuesses(active.word, 'colors', indices5, Color.BLANK);
            setActive('letter', 0);
        } else if (ev.key === 'Backspace') {
            if (guesses[active.word]?.letters[active.letter] !== null) {
                // keep active letter where it is
            } else if (active.letter > 0) {
                setActive('letter', li => li - 1);
            } else if (active.word > 0) {
                setActive('letter', 4);
                setActive('word', wi => wi - 1);
            }
            setGuesses(active.word, 'letters', active.letter, null);
        } else if (ev.key === ' ' && ev.ctrlKey) {
            setGuesses(active.word, 'colors', makeFsArray(5, Color.BLANK));
        } else if (ev.key === ' ' || ev.key === '-' || ev.key === '=') {
            const color =
                ev.key === '-'
                    ? Color.YELLOW
                    : ev.key === '='
                      ? Color.GREEN
                      : Color.BLANK;
            setGuesses(active.word, 'colors', active.letter, color);
        } else {
            const letter = readLetter(ev);
            if (letter !== undefined) {
                setGuesses(active.word, 'letters', active.letter, letter);

                // advance selection
                if (
                    active.word < guesses.length - 1 &&
                    guesses[active.word]?.letters.every(l => l !== null)
                ) {
                    setActive('word', wi => wi + 1);
                    setActive('letter', 0);
                } else if (active.letter !== 4) {
                    setActive('letter', li => li + 1);
                }
            }
        }
    };
    window.addEventListener('keydown', listener);
    onCleanup(() => window.removeEventListener('keydown', listener));

    const MAX_RESULTS_COUNT = 15;
    const [results, setResults] = createSignal<string[]>([]);
    const [overflow, setOverflow] = createSignal(0);
    const [error, setError] = createSignal('');

    const MAX_MISMATCHES_COUNT = 10;
    const [mismatches, setMismatches] = createStore<[Word, WordGuess][]>([]);

    function updateResults() {
        console.log('updating results');
        const mm: [Word, WordGuess][] = [];
        try {
            const results: string[] = [];
            let n = 0;
            const filledGuesses = guesses.filter(guess => guess.isFilled());
            const constraint = filledGuesses.reduce(
                (acc, c) => acc.merge(new Constraint(c)),
                new Constraint(),
            );
            console.log(constraint.toString());
            globalThis.lastConstraint = constraint;
            for (const word of searchWords(constraint)) {
                n += 1;
                if (results.length < MAX_RESULTS_COUNT) {
                    results.push(word.map(toChar).join('').toLowerCase());
                }
                if (mm.length < MAX_MISMATCHES_COUNT) {
                    for (const g of filledGuesses) {
                        const guess = Object.assign(
                            new WordGuess(),
                            JSON.parse(JSON.stringify(g)),
                        );
                        const c0 = guess.colors.toString();
                        guess.assignColor(word);
                        if (guess.colors.toString() != c0) {
                            mm.push([word, guess]);
                        }
                    }
                }
            }
            setResults(results);
            setOverflow(Math.max(0, n - results.length));
            setError('');
        } catch (err) {
            if (!(err instanceof WordleInputError)) throw err;
            setError(err.message);
        }
        setMismatches(mm);
    }

    updateResults();

    return (
        <>
            <section id="first-section">
                <h1>dewordler</h1>
                <div id="input">
                    <For each={guesses}>
                        {(word, wi) => (
                            <div
                                class="word"
                                classList={{
                                    active: wi() === active.word,
                                    // invalid: wi() == 1,
                                }}
                            >
                                {indices5.map(li => (
                                    <div
                                        class="letter"
                                        classList={{
                                            green: word.colors[li] === Color.GREEN,
                                            yellow: word.colors[li] === Color.YELLOW,
                                            active:
                                                wi() === active.word &&
                                                li === active.letter,
                                        }}
                                    >
                                        <span>
                                            {((l: Letter | null) =>
                                                l !== null
                                                    ? toChar(l).toUpperCase()
                                                    : '')(word.letters[li])}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </For>
                </div>
            </section>
            <section id="second-section">
                <button id="search" onclick={updateResults}>
                    Search
                </button>
                <Show when={error() !== ''}>
                    <div id="error">{error()}</div>
                </Show>
                <div id="results">
                    {results().map(s => (
                        <span class="result-item">{s}</span>
                    ))}
                    <Show when={overflow() !== 0}>
                        <span id="result-overflow">{overflow()} more words...</span>
                    </Show>
                </div>
            </section>
            <Show when={mismatches.length != 0}>
                <section id="mismatches">
                    <span>Debugging</span>
                    <span>Solution</span>
                    <span>Guess</span>
                    <For each={mismatches}>
                        {([solution, guess]) => {
                            return (
                                <>
                                    <span>{solution.map(toChar).join('')}</span>
                                    <div>
                                        <For each={indices5}>
                                            {i => (
                                                <span
                                                    classList={{
                                                        green:
                                                            guess.colors[i] ===
                                                            Color.GREEN,
                                                        yellow:
                                                            guess.colors[i] ===
                                                            Color.YELLOW,
                                                    }}
                                                >
                                                    {guess.letters[i] !== null
                                                        ? toChar(guess.letters[i])
                                                        : '_'}
                                                </span>
                                            )}
                                        </For>
                                    </div>
                                </>
                            );
                        }}
                    </For>
                </section>
            </Show>
        </>
    );
}

function readLetter(ev: KeyboardEvent): Letter | undefined {
    // filter out control keys
    if (/^[\x00-\x7f]{2,}$/.test(ev.key)) return;

    const letters = [...ev.key.normalize('NFKD')]
        .map(s => s.toLowerCase())
        .filter(isAsciiLowercaseChar)
        .map(toLetter);
    // console.log(letters.map(toChar).join(''));
    return letters[0];
}
