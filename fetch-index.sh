mkdir -p data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/index.zip ./data/
unzip -q ./data/index.zip -d ./data/