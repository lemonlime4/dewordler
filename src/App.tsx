import { For, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import './App.css';

export default App;

type Letter = string;

const Color = {
    BLANK: 0,
    YELLOW: 1,
    GREEN: 2,
} as const;

type Color = (typeof Color)[keyof typeof Color];

type Word = {
    letters: [Letter | null, Letter | null, Letter | null, Letter | null, Letter | null];
    colors: [Color, Color, Color, Color, Color];
};

function makeWord(letters: Word['letters'] = [null, null, null, null, null]): Word {
    const b = Color.BLANK;
    return {
        letters,
        colors: [b, b, b, b, b],
    };
}

function App() {
    const [words, setWords] = createStore([makeWord(), makeWord(), makeWord()]);
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
        } else if (ev.key === 'Delete' || (ev.key === 'Backspace' && ev.ctrlKey)) {
            // console.log(`delete all word ${active.word}`);
            setWords(active.word, 'letters', [0, 1, 2, 3, 4], null);
            setActive('letter', 0);
        } else if (ev.key === 'Backspace') {
            if (active.word === words.length - 1 && active.letter === 4) {
                // do nothing
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
            if (letter !== undefined) {
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

    function readLetter(ev: KeyboardEvent): string | undefined {
        if (ev.key.normalize('NFKC').length !== 1) return;
        // console.log([...ev.key.normalize('NFKD')]);
        return [...ev.key.normalize('NFKD')]
            .map(s => s.toUpperCase())
            .find(s => {
                const n = s.codePointAt(0) ?? 0;
                return 65 <= n && n <= 90;
            });
    }

    return (
        <>
            <h1>What the</h1>
            <div id="input">
                <For each={words}>
                    {({ letters, colors }, wi) => (
                        <div class="word" classList={{ active: wi() === active.word }}>
                            {[0, 1, 2, 3, 4].map(li => (
                                <div
                                    class="letter"
                                    classList={{
                                        green: colors[li] === Color.GREEN,
                                        yellow: colors[li] === Color.YELLOW,
                                        active:
                                            wi() === active.word && li === active.letter,
                                    }}
                                >
                                    <span>{letters[li] ?? ''}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </For>
            </div>
        </>
    );
}
