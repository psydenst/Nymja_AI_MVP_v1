# Usa uma imagem Python base
FROM python:3.9

# Define o diretório de trabalho no container
WORKDIR /app

# Copia o arquivo de dependências
COPY requirements.txt .

# Instala as dependências
RUN pip install -r requirements.txt

RUN pip install whitenoise

RUN pip install gunicorn

COPY . /app/

# Expõe a porta do Django
EXPOSE 8000

# Define o script de inicialização
ENTRYPOINT ["./backend/entrypoint.sh"]
