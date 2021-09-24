import React, { useEffect, useState, useMemo } from 'react';
import ReactTooltip from 'react-tooltip';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { debounce } from 'debounce';
import {
    countMatches,
    Example,
    getDataset,
    getNameFromUrl,
    getNeuronData,
    getNeuronMatches,
    NeuronData,
    NeuronIdentifier,
    NeuronMatches,
    range,
    zip
} from './utils';


function App() {
    const [query, setQuery] = useState('');
    const [dataset, setDataset] = useState<Example[] | null>(null);
    const [results, setResults] = useState<number[]>([]);
    const [selectedExample, setSelectedExample] = useState<number>(-1);
    const [neuronData, setNeuronData] = useState<NeuronData | null>(null);
    const [selectedNeuron, setSelectedNeuron] = useState<NeuronIdentifier | null>(null);
    const [selectedToken, setSelectedToken] = useState<number>(0);
    const [neuronMatches, setNeuronMatches] = useState<NeuronMatches[]>([]);

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
                const neuronMatches = await getNeuronMatches(selectedNeuron.l, selectedNeuron.f);
                setNeuronMatches(neuronMatches);
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

    const plotY = (selectedNeuron && neuronData && selectedToken > -1) ? 
        neuronData.activations.find(r => r.l === selectedNeuron.l && r.f === selectedNeuron.f)?.a :
        undefined;

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
                        <b>Logits/Activations per layer: </b>
                        {neuronData && range(0, 48).map(layerIdx => {
                            const topLogit = neuronData.logits[layerIdx][selectedToken][0];
                            const logits = neuronData.logits[layerIdx][selectedToken];
                            const tooltipText = `${logits.map(l => `${l.tok.replace(' ', '␣')} - ${Math.round(l.prob*100)}%`).join('<br />')}`;
                            return <div className='layer' key={layerIdx}>
                                <b style={{ marginRight: '5px' }}>{layerIdx}</b>
                                <ReactTooltip
                                    id='logit-tooltip'
                                    place='right'
                                    multiline={true}
                                />
                                <div className='logit' data-for='logit-tooltip' data-tip={tooltipText}>
                                    {topLogit.tok.replace(' ', '␣')}
                                </div>
                                {neuronData.activations
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
                                        </div>;
                                    })
                                }
                            </div>;
                        })}
                        <div style={{ flex: 1, height: '10px' }} />
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
                <div className='top-right'>
                    <div className='matches'>
                        {selectedNeuron &&
                            <p>
                                Prompts that activate neuron <b>{selectedNeuron.l}, {selectedNeuron.f}</b>:
                            </p>
                        }
                        {selectedNeuron && neuronMatches
                            .slice(0, 30)
                            .map((neuronMatch, idx) => {
                                return <span key={idx} className='match'>
                                    {zip(
                                        dataset[neuronMatch.exampleIdx].tokens,
                                        neuronMatch.activations
                                    ).map(([tok, a], idx) => {
                                        const normed = Math.min(1, Math.max(0, (a + 1) / 15));
                                        const color = `rgba(0, 255, 0, ${normed})`;
                                        return <span style={{ backgroundColor: color }} key={idx}>{tok}</span>;
                                    })}
                                </span>;
                            })
                        }
                    </div>
                </div>
                <div className='bottom-right'>
                    <div className='plot'>
                        {plotY && selectedNeuron && neuronData && selectedExample > -1 &&
                            <ResponsiveContainer width='100%' aspect={1}>
                                <LineChart
                                    data={zip(plotY, dataset[selectedExample].tokens).map(([y, tok]) => ({ y, tok }))}
                                >
                                    <Line type="monotone" dataKey='y' stroke="#8884d8" />
                                    <XAxis dataKey="tok" angle={-45} textAnchor="end" interval={0} />
                                    <YAxis />
                                    <Tooltip />
                                </LineChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
