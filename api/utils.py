import json
import http.client
from django.conf import settings
from .models import NymConversation, NymMessage
from rest_framework import status
import os
import requests


def getBotResponse(user_message, conversation_id):

    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in settings")

    api_url = "https://openrouter.ai/api/v1/chat/completions"

    # Fetch and sort the last 30 messages
    messages = NymMessage.objects.filter(conversation=conversation_id).order_by('-created_at')[:30]
    messages = list(messages)[::-1]  # chronological order

    # Convert to OpenAI-compatible "messages" format
    chat_history = []
    for msg in messages:
        role = "user" if msg.sender != "bot" else "assistant"
        chat_history.append({
            "role": role,
            "content": msg.decrypt_text()
        })

    # Add the current user message
    chat_history.append({
        "role": "user",
        "content": user_message
    })

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek/deepseek-r1:free",
        "messages": chat_history,
        "temperature": 0.7
    }

    response = requests.post(api_url, headers=headers, json=payload)

    if response.status_code != 200:
        print("API error:", response.text)
        return None

    return response.json()['choices'][0]['message']['content']

### validate user message ###

def ValidadeInputs(username, email):
	if not username or not email:
		return None
	return True
	
def conversationExists(conversation_id, user):
	if not conversation_id or not user:
		return None
	
	try:
		conversation = NymConversation.objects.filter(id=conversation_id, user=user).first()
		return conversation
	except NymConversation.DoesNotExist:
		return None
	
def decryptMessage(id):
	message = NymMessage.objects.filter(id=id).first()
	if not message:
		return None
	return message.decrypt_text()
