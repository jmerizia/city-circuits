import os
import json
from encoder import get_encoder
from tqdm import tqdm


assert os.path.exists('neurons000.json'), 'Missing neurons000.json! Did you run download-neurons.py first?'
assert os.path.exists('neurons001.json'), 'Missing neurons001.json! Did you run download-neurons.py first?'
assert os.path.exists('neurons002.json'), 'Missing neurons002.json! Did you run download-neurons.py first?'
assert os.path.exists('neurons003.json'), 'Missing neurons003.json! Did you run download-neurons.py first?'
assert os.path.exists('neurons004.json'), 'Missing neurons004.json! Did you run download-neurons.py first?'


def iter_neuron_records():
    for i in range(5):
        with open(f'neurons{i:03d}.json', 'r') as f:
            for record in json.load(f):
                yield record

with open('public/dataset-with-tokens.json', 'r') as f:
    dataset = json.loads(f.read())

enc = get_encoder()

if not os.path.exists('public/neurons-index'):
    os.mkdir('public/neurons-index')

print('Generating example-level indices into the public/neurons-index folder...')
# break this up into multiple files for lazier loading on the browser
neuron_records = iter_neuron_records()
num_examples = len(dataset)
for idx in tqdm(range(num_examples)):
    example = dataset[idx]
    neuron_record = next(neuron_records)
    with open(f'public/neurons-index/example-{idx:05}.json', 'w') as f:
        f.write(json.dumps({
            'example': example,
            'activations': neuron_record['activations'],
            'logits': neuron_record['logits'],
            'tokens': [enc.decode([t]) for t in enc.encode(example['text'])]
        }))

# determine keyword-level activations
print('Generating neuron-level indices into the public/neurons-index folder...')
neuron_to_keywords = {}
neuron_records = iter_neuron_records()
for idx in tqdm(range(num_examples)):
    example = dataset[idx]
    neuron_record = next(neuron_records)
    for record in neuron_record['activations']:
        for token, activation in zip(example['tokens'], record['a']):
            if activation >= 5:
                l, f = record['l'], record['f']
                neuron = f'{l}-{f}'
                if neuron not in neuron_to_keywords:
                    neuron_to_keywords[neuron] = set()
                neuron_to_keywords[neuron].add(token)

for k in neuron_to_keywords:
    neuron_to_keywords[k] = list(sorted(neuron_to_keywords[k]))

for l in range(48):
    for f in range(1600*4):
        neuron = f'{l}-{f}'
        if neuron in neuron_to_keywords:
            with open(f'public/neurons-index/neuron-{neuron}.json', 'w') as f:
                f.write(json.dumps(neuron_to_keywords[neuron]))

print('done!')
