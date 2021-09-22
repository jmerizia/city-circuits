import json
from encoder import get_encoder

# this is temporary until I fix it properly in the colab notebook


enc = get_encoder()

new_dataset = []
with open('public/dataset.json', 'r') as f:
    dataset = json.loads(f.read())
    for example in dataset:
        tokens = enc.encode(example['text'])[:15]
        tokens = [enc.decode([t]) for t in tokens]
        example['tokens'] = tokens
        new_dataset.append(example)

with open('public/dataset-with-tokens.json', 'w') as f:
    f.write(json.dumps(new_dataset))
