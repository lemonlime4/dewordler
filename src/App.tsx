import './App.css';

function App() {
    // const [count, setCount] = createSignal(0);

    return (
        <>
            <h1>What the fuck</h1>
            <WordInput />
        </>
    );
}

export default App;

function WordInput() {
    return (
        <div class="word-input">
            <LetterInput />
            <LetterInput />
            <LetterInput />
            <LetterInput />
            <LetterInput />
        </div>
    );
}

function LetterInput() {
    // function handleInput(event: InputEvent) {
    //     if (!event.target) throw new Error('Input event has no target');
    //     if (!event.data) return;
    //     let letters = [...event.data.normalize('NFKD')].filter((c) => {
    //         let n = c.charCodeAt(0);
    //         return (96 < n && n < 123) || (64 < n && n < 91);
    //     });
    //     event.target.value = letters.at(-1);
    // }
    function handleInput(event: KeyboardEvent) {
        event.preventDefault();
        console.log(event.key);

        // navigation
        if (event.key === 'ArrowLeft') {
        }
        if (event.key === 'ArrowRight') {
        }
        if (event.key === 'Tab') {
        }
    }
    return <input onkeydown={handleInput} class="letter-input" />;
}
