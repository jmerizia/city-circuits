import { useEffect, useRef } from 'react';


export function usePrevious<T>(value: T) {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

export function getBaseStaticUrl(): string {
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:8001/build/city-circuits/';
    } else {
        return '/';
    }
}

export function countMatches(query: string, text: string): number {
    const words = query.split(/\s+/).filter(w => w.length > 0);
    return words.filter(word => text.toLowerCase().includes(word.toLowerCase())).length;
}

export function getNameFromUrl(url: string): string {
    return decodeURI(url.split('/').pop() || '');
}

export function range(a: number, b: number) {
    const arr = [];
    for (let i = a; i < b; i++) {
        arr.push(i);
    }
    return arr;
}

export function zip<T, U>(a: T[], b: U[]): [T, U][] {
    const out: [T, U][] = [];
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        out.push([a[i], b[i]]);
    }
    return out;
}

export type Example = {
    url: string;
    text: string;
    tokens: string[];
};

export type NeuronActivation = {
    l: number;
    f: number;
    a: number[];
}

export type Logit = {
    tok: string;
    prob: number;
}

export type NeuronData = {
    example: Example;
    activations: NeuronActivation[];
    logits: Logit[][][];  // [layer][seq][k]
    tokens: string[];
}

export type NeuronIdentifier = {
    l: number;
    f: number;
};

export type NeuronMatches = {
    exampleIdx: number;
    activations: number[];
};

export async function getNeuronData(exampleIdx: number): Promise<NeuronData> {
    const n = exampleIdx.toString().padStart(5, '0');
    const res = await fetch(`${getBaseStaticUrl()}/neurons-index/example-${n}.json`);
    const j = await res.json();
    return j;
}

export async function getNeuronMatches(l: number, f: number): Promise<NeuronMatches[]> {
    const neuron = l.toString() + '-' + f.toString();
    const res = await fetch(`${getBaseStaticUrl()}/neurons-index/neuron-${neuron}.json`);
    const j = await res.json();
    return j;
}

export async function getDataset(): Promise<Example[]> {
    const res = await fetch(`/dataset-with-tokens.json`)
    const dataset = await res.json();
    return dataset;
}
