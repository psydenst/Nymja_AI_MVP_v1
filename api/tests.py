import requests
from pprint import pprint
import uuid

# URL da sua API Django

id = uuid.UUID('5dfc6aef-8fb5-4288-887b-fa3437c05650')  # Substitua pelo UUID real

# 5dfc6aef-8fb5-4288-887b-fa3437c05650 conversa TESTE 2
# dfa735eb-3723-4b17-b235-cfeae9562e00 conversa VASCO
message_id = uuid.UUID('a26c802f-d6cf-4abe-913d-6087eb115bc4')


#url = f'/api/conversations/{id}/messages/send/'

url = f'/api/messages/{message_id}'

#url = '/api/conversations/create/'



# Token JWT (substitua com o token real obtido no login)
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzM0ODI4NzU0LCJpYXQiOjE3MzQ4MjY5NTQsImp0aSI6IjRhMzA2NjRlZDJmODRhMjNiMTc1NWVmZWRmYTY2MjM5IiwidXNlcl9pZCI6IjY0MTJhYWM1LTQ5MTMtNDEwZi1iZjExLWU2NDhkZDYyN2YzZCJ9.LR2fsAMwfdvgEZmsiXpitnTOOURDBlLiZLQD74bC8JU'
# Cabeçalhos com o token JWT
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}

# Criar uma requisicao POST
# Dados a serem enviados

data = {
	"text": "Who is the president of Brazil?",
}

#response = requests.post(url, headers=headers, json=data)

# Criar uma requisicao GET

response = requests.get(url, headers=headers)

# Verificando a resposta
if response.status_code >= 200 and response.status_code < 204:
    # Caso a requisição tenha sido bem-sucedida, imprime os dados
	#users = response.text  # Supondo que a resposta seja em formato JSON
	users = response.json()
	print("=================================================================")
	pprint(users)
	print("=================================================================")
else:
	# Caso ocorra um erro
	pprint(f'Erro {response.status_code}: {response.reason}')

