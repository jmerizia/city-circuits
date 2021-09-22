import Fuse from 'fuse.js';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { debounce } from 'debounce';


type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};

function usePrevious<T>(value: T) {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}


function App() {
    const [query, setQuery] = useState('');
    const [examples, setExamples] = useState<readonly string[] | null>(null);
    const [fuse, setFuse] = useState<Fuse<string> | null>(null);
    const [results, setResults] = useState<Fuse.FuseResult<string>[]>([]);
    const [selectedExample, setSelectedExample] = useState<string | null>(null);
    const [boxes, setBoxes] = useState<readonly Box[]>([]);
    const [hovering, setHovering] = useState<number>(-1);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const prevHovering = usePrevious(hovering);

    const search = useMemo(() => debounce(async (query: string) => {
        if (!fuse) {
            return;
        }
        const results = fuse.search(query);
        setResults(results);
    }, 200), [fuse]);

    useEffect(() => {
        (async () => {
            const res = await fetch('/examples.json')
            const examples = await res.json();
            setExamples(examples);
        })();
    }, []);

    useEffect(() => {
        if (examples) {
            const fuse = new Fuse(examples, { includeMatches: true });
            setFuse(fuse);
        }
    }, [examples]);

    useEffect(() => {
        if (query) {
            search(query);
        } else {
            setResults([]);
        }
    }, [query, search]);

    useEffect(() => {
        const boxes: Box[] = [];
        const size = 5;
        const padding = 1;
        for (let i = 0; i < 80; i++) {
            for (let j = 0; j < 80; j++) {
                boxes.push({
                    x: i * size + padding,
                    y: j * size + padding,
                    width: size - padding * 2,
                    height: size - padding * 2,
                });
            }
        }
        setBoxes(boxes);
    }, []);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'black';
                let cnt = 0;
                for (const box of boxes) {
                    ctx.fillRect(box.x, box.y, box.width, box.height);
                    cnt++;
                }
                console.log('Rendered', cnt, 'items');
            }
        }
    }, [canvasRef, boxes]);

    return (
        <div className='container'>
            <div className='left'>
                <p>
                    Loaded {examples ? examples.length : '...'} prompts.
                </p>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ width: '80%', padding: 5, margin: 5 }}
                />
                <div className='results-box'>
                    <p>Found {results.length} results. Showing top 50:</p>
                    {results.slice(0, 10).map((result, idx) => {
                        return <div
                            key={idx}
                            className='result'
                            style={{
                                fontWeight: selectedExample === result.item ? 'bold' : undefined,
                            }}
                            onClick={() => setSelectedExample(result.item)}
                        >
                            {result.item}
                        </div>;
                    })}
                </div>
            </div>
            <div className='right' style={{ overflow: 'scroll' }}>
                <canvas
                    ref={canvasRef}
                    // style={{
                    //     width: '100%',
                    //     height: '100%',
                    // }}
                    width={500}
                    height={500}
                    style={{ border: 'thin solid black' }}
                    onMouseMove={e => {
                        // compute local coordinates
                        if (!canvasRef.current) return;
                        const rect = canvasRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        // find the box that contains the point
                        const idx = boxes.findIndex(b => {
                            return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
                        });
                        if (idx !== hovering) {
                            setHovering(idx);
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default App;
