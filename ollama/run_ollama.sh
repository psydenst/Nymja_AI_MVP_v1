#!/bin/bash

echo "Starting Ollama server..."
ollama serve & sleep 1 &
ollama run llama3.2:1b

i = 0
echo "Waiting for Ollama server to be active..."
while [ "$(ollama list | grep 'NAME')" == "" ]; do
  sleep 1
  print(i++)
done

