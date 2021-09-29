import React, { useEffect, useRef, useState } from 'react';
import FastScatter from './components/FastScatter';
import { getClusterData } from './utils';


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
    const containerRef = React.useRef<HTMLDivElement>(null);

    // load the data
    useEffect(() => {
        (async () => {
            const data = await getClusterData();
            setClusterData(data);
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

    if (!data) {
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
                    onChangeSelectedIdx={(idx) => {
                        setSelectedIdx(idx);
                    }}
                />
            </div>
            <div className='cluster-right'>
                {selectedIdx}
            </div>
        </div>
    );
}

export default Cluster;
