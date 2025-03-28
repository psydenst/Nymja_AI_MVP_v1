import json
import http.client
from .models import NymConversation, NymMessage
from rest_framework import status

### Function to get lhama3 response ####

def getBotResponse(user_message, conversation_id):
    api_host = "ollama"  
    api_port = 11434
    api_endpoint = "/api/generate"

    # Fetch the last 10 messages in chronological order (oldest first)
    messages = NymMessage.objects.filter(conversation=conversation_id).order_by('-created_at')[:30]
    # Optionally, reverse the list to maintain chronological order:
    messages = list(messages)[::-1]

    # Build the conversation history without excluding the current message
    history = ""
    for msg in messages:
        text = msg.decrypt_text()
        history += f"{msg.sender}: {text}\n"
    
    # Append the current user question
    context = (
        "You're a helpful AI assistant"
        "Answer the user's query"
        "Use the conversation history as context to answer the question"
        "Conversation history:\n"
        f"{history}\n\n"
        "Don't mention past commands."
        "Pretend you're responding directly to the user."
        "User's query: {user_message}"
    )

    payload = {
        "model": "llama3.2:1b",
        "prompt": context,
        "stream": False,
    }

    payload_data = json.dumps(payload)
    
    conn = http.client.HTTPConnection(api_host, api_port, timeout=200)
    conn.request("POST", api_endpoint, body=payload_data, headers={"Content-Type": "application/json"})
    response = conn.getresponse()

    response_data = response.read().decode("utf-8")
        
    response_json = json.loads(response_data)

    text = response_json['response']

    return text

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
