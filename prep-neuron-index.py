import os
import json
from encoder import get_encoder


assert os.path.exists('neurons.json'), 'Missing neurons.json! Did you run download-neurons.py first?'

with open('neurons.json', 'r') as f:
    neurons = json.loads(f.read())

with open('public/dataset.json', 'r') as f:
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

print('done!')
