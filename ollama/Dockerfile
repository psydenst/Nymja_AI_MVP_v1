FROM ollama/ollama

WORKDIR /app

COPY ./run_ollama.sh /app/run_ollama.sh


RUN chmod +x run_ollama.sh

EXPOSE 11434

ENTRYPOINT ["./run_ollama.sh"]