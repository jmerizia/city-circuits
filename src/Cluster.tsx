import React, { useEffect, useRef, useState } from 'react';
import FastScatter from './components/FastScatter';
import { Example, getClusterData, getDataset, getNeuronMatches, NeuronMatches, range, zip } from './utils';


type NeuronId = [number, number];

type ClusterData = {
    x: number[];
    y: number[];
    neurons: NeuronId[];
}

function Cluster() {
    const [data, setClusterData] = useState<ClusterData | null>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [neuronMatches, setNeuronMatches] = useState<NeuronMatches[]>([]);
    const [dataset, setDataset] = useState<Example[] | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // load the data
    useEffect(() => {
        (async () => {
            const data = await getClusterData();
            setClusterData(data);
            const dataset = await getDataset();
            setDataset(dataset);
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
                        setSelectedIdx(idx);
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
