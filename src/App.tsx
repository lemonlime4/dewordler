import { createEffect, createSignal, onCleanup } from 'solid-js';
import './App.css';

export default App;

function App() {
    const [letters, setLetters] = createSignal<string[]>([]);
    const boxes: HTMLElement[] = [];
    createEffect(() => {
        // console.log(letters);
    });
    let listener;
    window.addEventListener(
        'keydown',
        (listener = (ev: KeyboardEvent) => {
            if (ev.key === 'Tab') {
            } else if (ev.key === 'Delete' || (ev.key === 'Backspace' && ev.ctrlKey)) {
                setLetters([]);
            } else if (ev.key === 'Backspace') {
                setLetters(letters().slice(0, -1));
            } else {
                const letter = readLetter(ev);
                if (letter !== undefined) {
                    if (letters().length < 5) {
                        setLetters([...letters(), letter]);
                    }
                }
            }
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            // boxes[letters().length]?.focus();
        })
    );
    onCleanup(() => window.removeEventListener('keydown', listener));

    function readLetter(ev: KeyboardEvent): string | undefined {
        if (ev.key.normalize('NFKC').length !== 1) return;
        console.log([...ev.key.normalize('NFKD')]);
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
                <div class="word">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div ref={el => (boxes[i] = el)} class="letter">
                            <span>{letters()[i] ?? ''}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
