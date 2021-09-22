import React, { useEffect, useState, useMemo } from 'react';
import { debounce } from 'debounce';


const NUM_LAYERS = 48;

function countMatches(query: string, text: string): number {
    const words = query.split(/\s+/).filter(w => w.length > 0);
    return words.filter(word => text.toLowerCase().includes(word.toLowerCase())).length;
}

function getNameFromUrl(url: string): string {
    return decodeURI(url.split('/').pop() || '');
}

function range(a: number, b: number) {
    const arr = [];
    for (let i = a; i < b; i++) {
        arr.push(i);
    }
    return arr;
}

type Example = {
    url: string;
    text: string;
    tokens: string[];
};

type Record = {
    l: number;
    f: number;
    a: number[];
}

type NeuronData = {
    example: Example;
    records: Record[];
    tokens: string[];
}

type Neuron = {
    l: number;
    f: number;
};

async function getNeuronData(exampleIdx: number): Promise<NeuronData> {
    const n = exampleIdx.toString().padStart(5, '0');
    const res = await fetch(`${process.env.PUBLIC_URL}/neurons-index/example-${n}.json`);
    const j = await res.json();
    return j;
}

async function getNeuronKeywords(l: number, f: number): Promise<string[]> {
    const neuron = l.toString() + '-' + f.toString();
    const res = await fetch(`${process.env.PUBLIC_URL}/neurons-index/neuron-${neuron}.json`);
    const j = await res.json();
    return j;
}

async function getDataset(): Promise<Example[]> {
    const res = await fetch(`${process.env.PUBLIC_URL}/dataset-with-tokens.json`)
    const dataset = await res.json();
    return dataset;
}


function App() {
    const [query, setQuery] = useState('');
    const [dataset, setDataset] = useState<Example[] | null>(null);
    const [results, setResults] = useState<number[]>([]);
    const [selectedExample, setSelectedExample] = useState<number>(-1);
    const [neuronData, setNeuronData] = useState<NeuronData | null>(null);
    const [selectedNeuron, setSelectedNeuron] = useState<Neuron | null>(null);
    const [selectedToken, setSelectedToken] = useState<number>(0);
    const [keywords, setKeywords] = useState<string[]>([]);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const canvasContainerRef = React.useRef<HTMLDivElement>(null);

    const search = useMemo(() => debounce(async (query: string) => {
        if (!dataset) {
            return;
        }
        const results = dataset
            .map((e, idx): [Example, number] => [e, idx])
            .sort(([e_a, idx_a], [e_b, idx_b]) => {
                // compare url
                const name_a_matches = countMatches(query, getNameFromUrl(e_a.url));
                const name_b_matches = countMatches(query, getNameFromUrl(e_b.url));
                if (name_a_matches > 0 || name_b_matches > 0) {
                    return name_b_matches - name_a_matches;
                } else {
                    // compare text
                    const text_a_matches = countMatches(query, e_a.tokens.join(''));
                    const text_b_matches = countMatches(query, e_b.tokens.join(''));
                    if (text_a_matches > 0 || text_b_matches > 0) {
                        return text_b_matches - text_a_matches;
                    } else {
                        // compare idx
                        return idx_a - idx_b;
                    }
                }
            })
            .filter(([e, idx]) => {
                // filter out results that don't match at all
                const name_matches = countMatches(query, getNameFromUrl(e.url));
                const text_matches = countMatches(query, e.tokens.join(''));
                return name_matches > 0 || text_matches > 0;
            })
            .map(([e, idx]) => idx);
        setResults(results);
    }, 200), [dataset]);

    useEffect(() => {
        (async () => {
            const dataset = await getDataset();
            setDataset(dataset);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (selectedNeuron) {
                const keywords = await getNeuronKeywords(selectedNeuron.l, selectedNeuron.f);
                setKeywords(keywords);
            }
        })();
    }, [selectedNeuron]);

    useEffect(() => {
        if (query) {
            search(query);
        } else {
            setResults([]);
        }
    }, [query, search]);

    useEffect(() => {
        (async () => {
            if (selectedExample > -1) {
                const data = await getNeuronData(selectedExample);
                setNeuronData(data);
            }
        })();
    }, [selectedExample]);

    useEffect(() => {
        if (canvasRef.current && canvasContainerRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.canvas.width = canvasContainerRef.current.clientWidth;
                ctx.canvas.height = canvasContainerRef.current.clientHeight;
            }
        }
    }, [canvasRef, canvasContainerRef]);

    if (!dataset) {
        return <div>Loading...</div>;
    }

    return (
        <div className='container'>
            <div className='left'>
                <div className='top-left'>
                    <p>
                        Search for a city that has population over 100k:
                    </p>
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{ width: '80%', padding: 5, margin: 5 }}
                    />
                </div>
                <div className='bottom-left'>
                    <div className='results'>
                        <p>{results.length} results:</p>
                        {results.slice(0, 100).map((result, idx) => {
                            return <div
                                key={idx}
                                className='result'
                                style={{
                                    backgroundColor: selectedExample === result ? 'lightblue' : undefined,
                                }}
                                onClick={() => setSelectedExample(result)}
                            >
                                <b>{getNameFromUrl(dataset[result].url)}:</b>{' '}
                                {dataset[result].tokens.map((token, tokenIdx) => {
                                    return <span
                                        key={tokenIdx}
                                        style={{
                                            textDecoration: selectedToken === tokenIdx ? 'underline' : undefined,
                                            fontStyle: selectedToken === tokenIdx ? 'italic' : undefined,
                                        }}
                                    >
                                        {token}
                                    </span>;
                                })}
                            </div>;
                        })}
                    </div>
                </div>
            </div>
            <div className='center'>
                <div className='top-center'>
                    <div
                        className='layers'
                    >
                        <b> Activations per layer: </b>
                        {neuronData && range(0, NUM_LAYERS).map(layerIdx => {
                            return <div className='layer' key={layerIdx}>
                                <b style={{ marginRight: '5px' }}>{layerIdx}</b>
                                {neuronData.records
                                    .filter(r => r.l === layerIdx)
                                    .sort((a, b) => a.f - b.f)
                                    .map((r, idx) => {
                                        const selected = selectedNeuron && selectedNeuron.l === layerIdx && selectedNeuron.f === r.f;
                                        const a = r.a[selectedToken]; // roughly between -1 and 15
                                        const normed = Math.min(1, Math.max(0, (a + 1) / 15));
                                        const color = `rgba(0, 255, 0, ${normed})`;
                                        return <div
                                            className='neuron'
                                            key={idx}
                                            style={{
                                                backgroundColor: color,
                                                outline: selected ? 'thin solid black' : undefined
                                            }}
                                            onClick={() => {
                                                if (selected) {
                                                    setSelectedNeuron(null);
                                                } else {
                                                    setSelectedNeuron({ l: layerIdx, f: r.f });
                                                }
                                            }}
                                        >
                                            {r.f}
                                            {/* {Math.round(r.a[selectedToken] * 10) / 10} */}
                                        </div>;
                                    })
                                }
                            </div>;
                        })}
                    </div>
                </div>
                <div className='bottom-center'>
                    {neuronData && selectedExample > -1 &&
                        <input
                            type='range'
                            min={0}
                            max={dataset[selectedExample].tokens.length - 1}
                            value={selectedToken}
                            style={{  width: '100%' }}
                            onChange={e => {
                                e.preventDefault();
                                setSelectedToken(parseInt(e.target.value));
                            }}
                        />
                    }
                </div>
            </div>
            <div className='right'>
                <div className='keywords'>
                    {selectedNeuron &&
                        <p>
                            Tokens that activate neuron <b>{selectedNeuron.l}, {selectedNeuron.f}</b>:
                        </p>
                    }
                    {keywords
                        .slice(0, 100)
                        .map((keyword, idx) => {
                            return <span key={idx} className='keyword'>{keyword}</span>;
                        })
                    }
                </div>
            </div>
        </div>
    );
}

export default App;
