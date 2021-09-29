import React, { useEffect, useRef, useState } from 'react';
import FastScatter from './components/FastScatter';
import { Example, getClusterData, getDataset, getNeuronMatches, NeuronMatches, zip } from './utils';


type NeuronId = [number, number];

type ClusterData = {
    x: number[];
    y: number[];
    neurons: NeuronId[];
}

function hashNeuron(neuron: NeuronId) {
    return 10000 * neuron[0] + neuron[1];
}

function Cluster() {
    const [data, setClusterData] = useState<ClusterData | null>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [neuronMatches, setNeuronMatches] = useState<NeuronMatches[]>([]);
    const [dataset, setDataset] = useState<Example[] | null>(null);
    const neuronLookup = useRef<Map<number, number> | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const onUpdateNeuron = (neuron: [number, number] | null) => {
        const q = new URLSearchParams(window.location.search);
        if (neuron) {
            q.set('neuron', neuron[0].toString() + '-' + neuron[1].toString());
        } else {
            q.delete('neuron');
        }
        var newRelativePathQuery = window.location.pathname + '?' + q.toString();
        window.history.replaceState(null, '', newRelativePathQuery);
        if (!neuron) {
            setSelectedIdx(null);
        } else {
            if (neuronLookup.current) {
                const idx = neuronLookup.current.get(hashNeuron(neuron));
                if (idx !== undefined) {
                    setSelectedIdx(idx);
                } else {
                    setSelectedIdx(null);
                }
            }
        }
    };

    // load the data
    useEffect(() => {
        (async () => {
            const data = await getClusterData();
            setClusterData(data);
            neuronLookup.current = new Map();
            for (let i = 0; i < data.neurons.length; i++) {
                neuronLookup.current.set(hashNeuron(data.neurons[i]), i);
            }
            const dataset = await getDataset();
            setDataset(dataset);
            const neuron = new URLSearchParams(window.location.search).get('neuron');
            if (neuron) {
                const parts = neuron.split('-');
                if (parts.length === 2) {
                    const l = parseInt(parts[0]);
                    const f = parseInt(parts[1]);
                    if (!isNaN(l) && !isNaN(f)) {
                        const idx = neuronLookup.current.get(hashNeuron([l, f]));
                        if (idx !== undefined) {
                            setSelectedIdx(idx);
                        }
                    }
                }
            }
        })();
    }, []);

    useEffect(() => {
        // on resize
        const onResize = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                setWidth(width);
                setHeight(height);
            }
        }
        setTimeout(() => {
            onResize();
        }, 500);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, [containerRef]);

    const selectedNeuron = data && selectedIdx !== null && data.neurons[selectedIdx];

    useEffect(() => {
        (async () => {
            if (selectedNeuron) {
                const neuronMatches = await getNeuronMatches(selectedNeuron[0], selectedNeuron[1]);
                setNeuronMatches(neuronMatches);
            }
        })();
    }, [selectedNeuron]);

    if (!data || !dataset) {
        return <div>
            loading...
        </div>;
    }

    return (
        <div className='container'>
            <div className='cluster-left' ref={containerRef}>
                <FastScatter
                    x={data.x}
                    y={data.y}
                    width={width}
                    height={height}
                    marker={{
                        size: 0.25
                    }}
                    selectedIdx={selectedIdx}
                    onChangeSelectedIdx={(idx) => {
                        onUpdateNeuron(idx ? data.neurons[idx] : null);
                    }}
                />
            </div>
            <div className='cluster-right'>
                {selectedNeuron &&
                    <b>
                        Neuron: ({selectedNeuron[0]}, {selectedNeuron[1]})
                    </b>
                }
                <div className='matches'>
                    {selectedNeuron && neuronMatches && neuronMatches &&
                        neuronMatches
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
        </div>
    );
}

export default Cluster;
