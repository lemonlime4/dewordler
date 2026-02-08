import { For, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import './App.css';

import type { Letter } from './word-search';
import { charCodeIsLetter, Color, Word } from './word-search';

export default App;

function makeStoreWord() {
    return createStore(new Word())[0];
}
function App() {
    const [words, setWords] = createStore([
        makeStoreWord(),
        makeStoreWord(),
        makeStoreWord(),
    ]);
    // globalThis.words = words;
    const [active, setActive] = createStore({
        word: 0,
        letter: 0,
    });

    const listener = (ev: KeyboardEvent) => {
        if (ev.key === 'Tab') {
            ev.preventDefault();
        } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
            let offset = ev.key === 'ArrowUp' ? -1 : 1;
            setActive('word', wi => Math.max(0, Math.min(words.length - 1, wi + offset)));
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            let offset = ev.key === 'ArrowLeft' ? -1 : 1;
            setActive('letter', li => Math.max(0, Math.min(4, li + offset)));
        } else if (ev.key === 'Backspace' && ev.ctrlKey) {
            setWords(active.word, 'letters', [0, 1, 2, 3, 4], null);
            setActive('letter', 0);
        } else if (ev.key === 'Backspace') {
            if (words[active.word]?.letters[active.letter]) {
                // keep active letter where it is
            } else if (active.letter > 0) {
                setActive('letter', li => li - 1);
            } else if (active.word > 0) {
                setActive('letter', 4);
                setActive('word', wi => wi - 1);
            }
            setWords(active.word, 'letters', active.letter, null);
        } else if (ev.key === ' ' || ev.key === '-' || ev.key === '=') {
            const color =
                ev.key === '-'
                    ? Color.YELLOW
                    : ev.key === '='
                      ? Color.GREEN
                      : Color.BLANK;
            setWords(
                active.word,
                'colors',
                produce(cs => (cs[active.letter] = color)),
            );
        } else {
            const letter = readLetter(ev);
            if (letter) {
                setWords(active.word, 'letters', active.letter, letter);

                // advance selection
                if (
                    active.word < words.length - 1 &&
                    words[active.word]?.letters.every(l => l !== null)
                ) {
                    setActive('word', wi => wi + 1);
                    setActive('letter', 0);
                } else if (active.letter != 4) {
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

    function readLetter(ev: KeyboardEvent): Letter | undefined {
        if (ev.key.normalize('NFKC').length !== 1) return;
        console.log('NFKDed input:', [...ev.key.normalize('NFKD')]);
        return [...ev.key.normalize('NFKD')]
            .map(s => s.toLowerCase().charCodeAt(0) ?? 0)
            .filter(charCodeIsLetter)[0];
    }

    return (
        <>
            <h1>What the</h1>
            <div id="input">
                <For each={words}>
                    {(word, wi) => (
                        <div class="word" classList={{ active: wi() === active.word }}>
                            {[0, 1, 2, 3, 4].map(li => (
                                <div
                                    class="letter"
                                    classList={{
                                        green: word.colors[li] === Color.GREEN,
                                        yellow: word.colors[li] === Color.YELLOW,
                                        active:
                                            wi() === active.word && li === active.letter,
                                    }}
                                >
                                    <span>{letterToString(word.letters[li])}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </For>
            </div>
        </>
    );
}

function letterToString(letter: Letter | null | undefined): string {
    // console.log(letter);
    return letter ? String.fromCharCode(letter - 32) : '';
}
