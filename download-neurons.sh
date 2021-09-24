mkdir -p data

aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/neurons000.json ./data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/neurons001.json ./data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/neurons002.json ./data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/neurons003.json ./data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/neurons004.json ./data