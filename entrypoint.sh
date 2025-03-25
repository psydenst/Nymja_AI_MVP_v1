#!/bin/sh

# Executa as migrações

echo "Iniciando o processo de migração"
python manage.py makemigrations

echo "Aplicando as migrações"
python manage.py migrate

# Inicia o servidor Django

echo "Iniciando o servidor Django"

exec gunicorn --timeout 200 backend.wsgi:application --bind 0.0.0.0:8000 --log-level debug --access-logfile - --error-logfile -