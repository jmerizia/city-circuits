mkdir -p data
aws s3 cp s3://gpt2-neurons/wikipedia-first-lines/index2.zip ./data/
unzip -q ./data/index2.zip -d ./data/