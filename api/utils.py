import json
import http.client
from django.conf import settings
from .models import NymConversation, NymMessage
from rest_framework import status
import os
import requests
import re

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

def getConversationName(conversation_id):
    """
    Uses the exact same OpenRouter payload as getBotResponse, but:
    - Only feeds the FIRST user message
    - Asks the model: "Reply ONLY with a plain title under 100 characters."
    - Strips markdown/prefixes
    - Truncates to 100 chars if needed
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in settings")

    api_url = "https://openrouter.ai/api/v1/chat/completions"

    # 1) Fetch only the very first user message
    msgs = list(
        NymMessage.objects
            .filter(conversation=conversation_id)
            .order_by('created_at')[:1]
    )
    if not msgs or msgs[0].sender != 'user':
        return None

    chat_history = [{
        "role": "user",
        "content": msgs[0].decrypt_text()
    }, {
        "role": "user",
        "content": (
            "Please reply with ONLY a single-line, plain-text title "
            "(no markdown, no labels like “Title:” or “Answer:”), "
            "and make it at most 50 characters long."
        )
    }]

    payload = {
        "model": "deepseek/deepseek-r1:free",
        "messages": chat_history,
        "temperature": 0.7
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(api_url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print("Error naming conv:", e)
        return None

    # 2) Clean out common markdown and prefixes
    title = raw
    # remove markdown emphasis
    title = re.sub(r"(\*\*|\*|__|`)", "", title)
    # drop any "Title:" or "Answer:" prefix
    title = re.sub(r'^(Title:|Answer:)\s*', '', title, flags=re.IGNORECASE).strip()
    # remove any trailing newlines or extraneous text after first line
    title = title.splitlines()[0].strip()

    # 3) Enforce 100-character limit
    if len(title) > 50:
        title = title[:47].rstrip() + "..."

    return title


### validate user message ###

def ValidadeInputs(username, password):
    if not username:
        raise ValueError("Username is required")
    if not password:
        raise ValueError("Password is required")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")

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
