import os
import json
from encoder import get_encoder


assert os.path.exists('neurons.json'), 'Missing neurons.json! Did you run download-neurons.py first?'

with open('neurons.json', 'r') as f:
    neurons = json.loads(f.read())

with open('public/dataset-with-tokens.json', 'r') as f:
    dataset = json.loads(f.read())

assert len(dataset) == len(neurons)

enc = get_encoder()

if not os.path.exists('public/neurons-index'):
    os.mkdir('public/neurons-index')

print('Going to generate a lot of files! You can safely delete them by deleting the public/neurons-index folder')

# break this up into multiple files for lazier loading on the browser
for idx, (example, records) in enumerate(zip(dataset, neurons)):
    with open(f'public/neurons-index/example-{idx:05}.json', 'w') as f:
        f.write(json.dumps({
            'example': example,
            'records': records,
            'tokens': [enc.decode([t]) for t in enc.encode(example['text'])]
        }))

# determine keyword-level activations
neuron_to_keywords = {}
for idx, (example, records) in enumerate(zip(dataset, neurons)):
    for record in records:
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
