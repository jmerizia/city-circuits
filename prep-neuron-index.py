# The purpose of this is to break up the neuron records into many smaller files
# that can easily be loaded by the browser.

from collections import defaultdict
import os
import json
from encoder import get_encoder
from tqdm import tqdm
import jsonlines


assert os.path.exists('data/neurons.jsonl'), 'Missing data/neurons.jsonl! Did you run download-neurons.sh first?'


def iter_neuron_records():
    with jsonlines.open(f'data/neurons.jsonl') as reader:
        for obj in reader:
            yield obj

def iter_neurons():
    for l in range(48):
        for f in range(1600*4):
            yield l, f

with open('public/dataset-with-tokens.json', 'r') as f:
    dataset = json.loads(f.read())

enc = get_encoder()

base_path = 'data/index'

if not os.path.exists(base_path):
    os.makedirs(base_path, exist_ok=True)

num_examples = len(dataset)

print(f'Generating example-level indices into the {base_path} folder...')
neuron_records = iter_neuron_records()
for idx in tqdm(range(num_examples)):
    example = dataset[idx]
    neuron_record = next(neuron_records)
    with open(os.path.join(base_path, f'example-{idx:05}.json'), 'w') as f:
        f.write(json.dumps({
            'example': example,
            'activations': neuron_record['activations'],
            'logits': neuron_record['logits'],
            'tokens': [enc.decode([t]) for t in enc.encode(example['text'])]
        }))

print(f'Generating neuron-level indices into the {base_path} folder...')
neuron_to_example_indices = defaultdict(list)
neuron_records = iter_neuron_records()
for idx in tqdm(range(num_examples)):
    example = dataset[idx]
    neuron_record = next(neuron_records)
    for record in neuron_record['activations']:
        mx = max(record['a'])
        if mx >= 2:
            neuron_to_example_indices[(record['l'], record['f'])].append({ 'activations': record['a'], 'exampleIdx': idx })

for k in neuron_to_example_indices.keys():
    neuron_to_example_indices[k] = list(sorted(neuron_to_example_indices[k], key=lambda e: max(e['activations']), reverse=True))

for (l, f) in iter_neurons():
    if (l, f) in neuron_to_example_indices:
        with open(os.path.join(base_path, f'neuron-{l}-{f}.json'), 'w') as file:
            file.write(json.dumps(neuron_to_example_indices[(l, f)]))

print('deallocating...')