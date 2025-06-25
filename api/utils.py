import http.client
from django.conf import settings
from .models import NymConversation, NymMessage
from rest_framework import status
import os
import requests
import re
from asgiref.sync import sync_to_async
import httpx
import json

from asgiref.sync import sync_to_async
import httpx
import json
from django.conf import settings
from .models import NymMessage


from asgiref.sync import sync_to_async
import httpx
import json
from django.conf import settings
from .models import NymMessage

async def getBotResponse(user_message, conversation_id, model_key="deepseek"):
    print("🧠 [getBotResponse] Entrou na função.")

    # 1. Checa API KEY
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        print("❌ [getBotResponse] OPENROUTER_API_KEY não definida.")
        raise RuntimeError("OPENROUTER_API_KEY not set in settings")
    print("✅ [getBotResponse] API KEY encontrada.")

    # 2. Resolve o model_id
    try:
        model_id = settings.MODEL_MAP[model_key]
        print(f"✅ [getBotResponse] Modelo encontrado: {model_key} → {model_id}")
    except KeyError:
        print(f"❌ [getBotResponse] Model key inválido: {model_key}")
        raise ValueError(f"Unknown model key: {model_key}")

    # 3. Carrega histórico da conversa (ORM e decrypt_text async!)
    try:
        print("🔎 [getBotResponse] Buscando histórico de mensagens...")
        messages_qs = await sync_to_async(list)(
            NymMessage.objects.filter(conversation=conversation_id).order_by('-created_at')[:30]
        )
        print(f"✅ [getBotResponse] {len(messages_qs)} mensagens encontradas.")
        messages = messages_qs[::-1]
        chat_history = []
        for msg in messages:
            role = "assistant" if msg.sender == "bot" else "user"
            # Aqui pode acessar banco/disco, use sync_to_async!
            content = await sync_to_async(msg.decrypt_text)()
            chat_history.append({"role": role, "content": content})

        chat_history.append({"role": "user", "content": user_message})
        print("✅ [getBotResponse] Histórico preparado.")
    except Exception as e:
        print("❌ [getBotResponse] Erro montando histórico:", e)
        raise

    # 4. Prepara payload e headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_id,
        "messages": chat_history,
        "temperature": 0.7,
        "stream": True,
    }
    print("📦 [getBotResponse] Payload montado:", payload)

    # 5. Chama a API OpenRouter com streaming
    print("🌍 [getBotResponse] Enviando requisição para OpenRouter...")
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload) as response:
                print("📨 [getBotResponse] Resposta recebida da OpenRouter:", response.status_code)
                if response.status_code != 200:
                    text = await response.aread()
                    print("❌ [getBotResponse] Resposta inesperada:", text)
                    raise RuntimeError(f"OpenRouter HTTP {response.status_code}: {text.decode()}")
                async for line in response.aiter_lines():
                    print("🔹 [getBotResponse] Linha recebida:", line)
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            print("🏁 [getBotResponse] Streaming [DONE].")
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            if "content" in delta:
                                print("📤 [getBotResponse] Chunk gerado:", delta["content"])
                                yield delta["content"]
                        except json.JSONDecodeError:
                            print("❌ [getBotResponse] JSON inválido:", data_str)
                            continue
    except Exception as e:
        print("❌ [getBotResponse] Erro na chamada HTTPX/OpenRouter:", e)
        import traceback
        traceback.print_exc()
        raise


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
        "temperature": 0.7,
        "stream": False, 
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
