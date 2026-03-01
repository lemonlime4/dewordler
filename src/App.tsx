import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import './App.css';

import type { Letter, Word } from './word-search';
import {
    Color,
    Constraints,
    intRange5,
    isAsciiLowercaseChar,
    searchWords,
    toChar,
    toLetter,
    WordGuess,
    WordleInputError,
} from './word-search';

export default App;

function App() {
    const makeStoreWord = () => createStore(new WordGuess())[0];
    const [guesses, setGuesses] = createStore([
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
    ]);
    Object.assign(globalThis, { guesses });

    {
        const g = JSON.parse(
            localStorage.getItem('wordleinputstate') ?? '',
        ) as WordGuess[];

        // '[{"colors":[0,0,0,2,2],"letters":[2,11,20,4,3]},{"colors":[0,0,1,2,2],"letters":[19,0,12,4,3]},{"colors":[1,0,0,2,2],"letters":[12,14,21,4,3]}]',
        for (let i = 0; i < g.length; i++) {
            const gi = g[i] as WordGuess;
            setGuesses(i, 'letters', gi.letters);
            setGuesses(i, 'colors', gi.colors);
        }
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
        if (ev.ctrlKey) {
            return;
        } else if (ev.key === 'Tab') {
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
            setGuesses(active.word, 'letters', [0, 1, 2, 3, 4], null);
            setActive('letter', 0);
        } else if (ev.key === 'Backspace') {
            if (guesses[active.word]?.letters[active.letter]) {
                // keep active letter where it is
            } else if (active.letter > 0) {
                setActive('letter', li => li - 1);
            } else if (active.word > 0) {
                setActive('letter', 4);
                setActive('word', wi => wi - 1);
            }
            setGuesses(active.word, 'letters', active.letter, null);
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
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };
    window.addEventListener('keydown', listener);
    onCleanup(() => window.removeEventListener('keydown', listener));

    const MAX_RESULTS_COUNT = 10;
    const [results, setResults] = createSignal<string[]>([]);
    const [overflow, setOverflow] = createSignal(0);
    const [error, setError] = createSignal('');

    const [mismatches, setMismatches] = createStore<[Word, WordGuess][]>([]);
    // setMismatches(
    //     produce(mm =>
    //         mm.push(
    //             [[0, 1, 2, 3, 4], guesses[0] as WordGuess],
    //             [[5, 6, 7, 8, 9], guesses[1] as WordGuess],
    //             [[10, 11, 12, 13, 14], guesses[2] as WordGuess],
    //         ),
    //     ),
    // );

    function updateResults() {
        console.log('updating results');
        // debug
        // const individualGuesses = guesses.map(
        //     g => [Object.assign(new WordGuess(), g), new Constraints([g])] as const,
        // );
        const mm: [Word, WordGuess][] = [];
        try {
            const results: string[] = [];
            let n = 0;
            for (const word of searchWords(new Constraints(guesses))) {
                n += 1;
                if (results.length < MAX_RESULTS_COUNT) {
                    results.push(word.map(toChar).join('').toLowerCase());

                    // debug
                    for (const g of guesses) {
                        // if (!cons.satisfiedBy(word)) {
                        console.log();
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
            <section id="mismatches">
                <span>Search debug</span>
                <span>Solution</span>
                <span>Guess</span>
                <For each={mismatches}>
                    {([solution, guess]) => {
                        // let [solution, guess] = accessor();
                        return (
                            <>
                                <span>{solution.map(toChar).join('')}</span>
                                <div>
                                    <For each={intRange5}>
                                        {i => (
                                            <span
                                                classList={{
                                                    green:
                                                        guess.colors[i] === Color.GREEN,
                                                    yellow:
                                                        guess.colors[i] === Color.YELLOW,
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
            <section>
                <h1>What the</h1>
                <div id="input">
                    <For each={guesses}>
                        {(word, wi) => (
                            <div
                                class="word"
                                classList={{ active: wi() === active.word }}
                            >
                                {intRange5.map(li => (
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

                <button onclick={updateResults}>Search</button>
                <Show when={error() !== ''}>
                    <div id="error">{error()}</div>
                </Show>
                <div id="results">
                    {results().map(s => (
                        <span class="result">{s}</span>
                    ))}
                    <Show when={overflow() !== 0}>
                        <span class="result-overflow">{overflow()} more words...</span>
                    </Show>
                </div>
            </section>
        </>
    );
}

function readLetter(ev: KeyboardEvent): Letter | undefined {
    // filter out control keys
    if (/[\x00-\x7f]{2,}/.test(ev.key)) return;

    const letters = [...ev.key.normalize('NFKD')]
        .map(s => s.toLowerCase())
        .filter(isAsciiLowercaseChar)
        .map(toLetter);
    // console.log(letters.map(toChar).join(''));
    return letters[0];
}
