# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import MessageSerializer, UserSerializer, ConversationSerializer, RegisterSerializer
from .models import NymUser, NymConversation, NymMessage
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.permissions import AllowAny
from .erros import print_error
from rest_framework_simplejwt.tokens import RefreshToken
from .utils import getBotResponse, ValidadeInputs, conversationExists, decryptMessage, getConversationName
from .permissions import isNymAdmin
from mnemonic import Mnemonic
import hashlib
from django.http import StreamingHttpResponse
import json
from asgiref.sync import async_to_sync, sync_to_async
import functools
print = functools.partial(print, flush=True)
from .utils import CANCEL_FLAGS, CANCEL_FLAGS_LOCK

########## ADMIN ROUTES ##########

@api_view(['GET'])
@permission_classes([IsAuthenticated, isNymAdmin])
def GetAllUsers(request):
	
	if request.method == 'GET':
		try:
			users = NymUser.objects.all().order_by('-created_at')
			serializer = UserSerializer(users, many=True)
			if len(serializer.data) == 0:
				return Response(status=status.HTTP_204_NO_CONTENT)
			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated, isNymAdmin])
def GetAllConversations(request):
	if request.method == 'GET':
		try:
			conversations = NymConversation.objects.all().order_by('user')
			serializer = ConversationSerializer(conversations, many=True)
			if len(serializer.data) == 0:
				return Response(status=status.HTTP_204_NO_CONTENT)
			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)

########## USERS AUTEHTICATION ROUTER ##########

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def LogoutNymUser(request):
    response = Response({"detail": "Logged out"}, status=status.HTTP_200_OK)
    # Instruct the browser to delete the cookie
    response.delete_cookie('accessToken', path='/')
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def LoginNymUser(request):
    if request.method == 'POST':
        try:
            data = request.data
            username = data.get('username')
            password = data.get('password')

            user = authenticate(username=username, password=password)

            if user:
                if user.is_active:
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)

                    # build the JSON payload
                    payload = {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "username": user.username,
                    }

                    # create the response and set cookies
                    response = Response(payload, status=status.HTTP_200_OK)
                    # HttpOnly cookies, Secure and Lax for sameSite
                    response.set_cookie(
                        'accessToken',
                        access_token,
                        httponly=True,
                        secure=True,     # requires HTTPS
                        samesite='Lax',
                        path='/',
                        max_age=60 * 60  # match your token lifetime
                    )
                    response.set_cookie(
                        'refreshToken',
                        refresh_token,
                        httponly=True,
                        secure=True,
                        samesite='Lax',
                        path='/',
                        max_age=7 * 24 * 60 * 60  # e.g. one week
                    )
                    return response

                else:
                    return Response(
                        {"detail": "User is not active"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {"detail": "Invalid username or password"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        except Exception as e:
            print_error(e, True)
            return Response(
                {"detail": "An error occurred while logging in"},
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET'])
@permission_classes([AllowAny])
def GenerateMnemonic(request):
    """
    Step 1: No DB write yet. Generate a fresh 24-word BIP-39 phrase
    and return it as JSON. The client must display this phrase once
    (and store it securely) before calling the second step.
    Response: { "mnemonic_phrase": "abandon abandon …" }
    """
    try:
        mnemo = Mnemonic("english")
        phrase = mnemo.generate(strength=256)  # 24 words (256 bits of entropy)
        return Response({"mnemonic_phrase": phrase}, status=status.HTTP_200_OK)
    except Exception as e:
        # Log the exception if you want:
        print_error(e, True)
        return Response(
            {"detail": "Could not generate mnemonic at this time."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def CompleteRegister(request):
    """
    Step 2: Client posts { username, password, mnemonic_phrase }.
    We call NymUser.objects.create_user(...), which will:
      - SHA256( mnemonic_phrase ) → mnemonic_hash
      - set_password(password)
      - save(username, mnemonic_hash, password)
    Return the serialized user (id & username & created_at).
    """
    data = request.data
    username = data.get("username")
    password = data.get("password")
    mnemonic_phrase = data.get("mnemonic_phrase")

    # 1) Basic presence check:
    if not username or not password or not mnemonic_phrase:
        return Response(
            {"detail": "username, password and mnemonic_phrase are all required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 2) Check if username is already taken
    if NymUser.objects.filter(username=username).exists():
        return Response(
            {"username": ["This username is already in use."]},
            status=status.HTTP_409_CONFLICT
        )

    # 3) Compute SHA256 of provided phrase and check uniqueness of mnemonic_hash
    hashed = hashlib.sha256(mnemonic_phrase.encode("utf-8")).hexdigest()
    if NymUser.objects.filter(mnemonic_hash=hashed).exists():
        return Response(
            {"mnemonic_phrase": ["This mnemonic_phrase has already been used."]},
            status=status.HTTP_409_CONFLICT
        )

    try:
        # 4) Create the new user via your manager
        user = NymUser.objects.create_user(
            username=username,
            password=password,
            mnemonic_phrase=mnemonic_phrase
        )
    except Exception as exc:
        # If your manager raises ValueError, capture it here to send back as 400.
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 5) Return the newly created user’s basic info
    serialized = UserSerializer(user)
    return Response(serialized.data, status=status.HTTP_201_CREATED)

# api/views.py


@api_view(['POST'])
@permission_classes([AllowAny])
def ChangeCredentials(request):
    """
    POST { mnemonic_phrase, username, new_password }
    Finds the user by mnemonic_hash, then:
      - If username differs, ensures it's unique and updates it
      - If new_password differs from old, updates it
    Returns the updated user (id, username, etc).
    """
    data = request.data
    mnemonic = data.get('mnemonic_phrase')
    new_username = data.get('username')
    new_password = data.get('new_password')

    # 1) Basic presence check
    if not (mnemonic and new_username and new_password):
        return Response(
            {"detail": "mnemonic_phrase, username and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 2) Lookup by mnemonic_hash
    hashed = hashlib.sha256(mnemonic.encode('utf-8')).hexdigest()
    try:
        user = NymUser.objects.get(mnemonic_hash=hashed)
    except NymUser.DoesNotExist:
        return Response(
            {"detail": "Invalid mnemonic_phrase."},
            status=status.HTTP_404_NOT_FOUND
        )

    # 3) Change username if different
    if new_username != user.username:
        if NymUser.objects.filter(username=new_username).exclude(id=user.id).exists():
            return Response(
                {"detail": "Username already taken."},
                status=status.HTTP_409_CONFLICT
            )
        user.username = new_username

    # 4) Change password if different
    if new_password and not user.check_password(new_password):
        user.set_password(new_password)

    # 5) Save and return
    user.save()
    serialized = UserSerializer(user)
    return Response(serialized.data, status=status.HTTP_200_OK)


########## CONVERSATION ROUTES ##########

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def CreateConversation(request):
	
	if request.method == 'POST':
		try:
			data = request.data

			nameConversation = data.get('name')

			if not nameConversation:
				nameConversation = 'Blank'


			conversation_body = {
				"user": request.user.id,
				"name": nameConversation
			}

			serializer = ConversationSerializer(data=conversation_body)

			if serializer.is_valid():
				serializer.save()
				return Response(serializer.data, status=status.HTTP_201_CREATED)
			else:
				print_error(serializer.errors, False)
				return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def RenameConversation(request, conversation_id):
    try:
        conv = NymConversation.objects.get(id=conversation_id, user=request.user)
    except NymConversation.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    new_name = request.data.get('name')
    if not new_name:
        return Response({"detail": "Name is required."}, status=status.HTTP_400_BAD_REQUEST)

    conv.name = new_name
    conv.save()

    serializer = ConversationSerializer(conv)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def NameConversation(request, conversation_id):
    # 1) load the conversation into `conv`
    try:
        conv = NymConversation.objects.get(id=conversation_id, user=request.user)
    except NymConversation.DoesNotExist:
        return Response({"detail":"Not found"}, status=404)

    # 2) generate the title
    title = getConversationName(conversation_id)
    if not title:
        return Response({"detail":"Could not generate name"}, status=502)

    conv.name = title
    conv.save()

    serializer = ConversationSerializer(conv)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetUserConversation(request):
	if request.method == 'GET':
		try:
			conversation = NymConversation.objects.filter(user=request.user).order_by('-created_at')
			serializer = ConversationSerializer(conversation, many=True)

			if not conversation.exists():
				return Response(status=status.HTTP_204_NO_CONTENT)
			
			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
		
####### MESSAGES ROUTES ##########

@permission_classes([IsAuthenticated])
@api_view(['POST'])
def SaveMessage(request, conversation_id):
	try:
		data = request.data

		if not conversation_id:
			return Response({"detail": "Conversation ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        

		conversation = conversationExists(conversation_id, request.user)

		if conversation is None:
			return Response({"detail": "Conversation not found or does not belong to the user."}, status=status.HTTP_404_NOT_FOUND)
		
		user_message = data.get('text')
		if not user_message:
			return Response({"detail": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)
		sender = data.get('sender', 'user')
		message_body = {
			"sender": sender,
			"text": user_message,
			"conversation": conversation_id
		}

		message = MessageSerializer(data=message_body)

		if message.is_valid():
			message.save()
			front = message.data
			front['text'] = decryptMessage(message.data['id'])
			return Response(front, status=status.HTTP_201_CREATED)
		return Response({"detail": "Error creating message."}, status=status.HTTP_400_BAD_REQUEST)
	except Exception as e:
		print_error(e, True)
		return Response(status=status.HTTP_400_BAD_REQUEST)

class BotResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        print(f"📥 Incoming POST for message_id: {message_id}")
        return async_to_sync(self.handle_async)(request, message_id)

    async def handle_async(self, request, message_id):
        try:
            print("🔍 Fetching message from DB...")
            orig = await sync_to_async(get_object_or_404)(NymMessage, id=message_id)
            print("✅ Message found.")

            plaintext = orig.decrypt_text()
            print("🔓 Message decrypted:", plaintext)

            model_key = request.data.get("model", "gemma")
            print("🧠 Model key received:", model_key)

            orig_conversation_id = await sync_to_async(lambda o: o.conversation.id)(orig)

            async def generate_stream():
                try:
                    print("🚀 Starting stream generator...")
                    bot_text_chunks = []

                    async for chunk in getBotResponse(plaintext, orig.conversation.id, model_key, message_id):
                        print("📤 Chunk received:", chunk)
                        bot_text_chunks.append(chunk)
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"

                    complete_text = ''.join(bot_text_chunks)
                    print("🧩 Full response assembled:", complete_text)

                    payload = {
                        "sender": "bot",
                        "text": complete_text,
                        "conversation": orig_conversation_id,
                    }

                    serializer = MessageSerializer(data=payload)
                    is_valid = await sync_to_async(serializer.is_valid)()

                    if is_valid:
                        saved = await sync_to_async(serializer.save)()
                        data = serializer.data
                        data["text"] = await sync_to_async(decryptMessage)(saved.id)
                        print("💾 Message saved.")
                        yield f"data: {json.dumps({'complete': True, 'message': data}, default=str)}\n\n"
                    else:
                        print("⚠️ Serializer invalid:", serializer.errors)
                        yield f"data: {json.dumps({'error': 'Error saving message'})}\n\n"

                except Exception as inner_exc:
                    print("❌ Exception inside stream:", inner_exc)
                    yield f"data: {json.dumps({'error': 'Internal stream error'})}\n\n"

            response = StreamingHttpResponse(
                generate_stream(),
                content_type='text/event-stream'
            )
            response['Cache-Control'] = 'no-cache'
            response['Connection'] = 'keep-alive'
            response['X-Accel-Buffering'] = 'no'

            print("✅ Response streaming initiated.")
            return response

        except ValueError as e:
            print("❗ ValueError:", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            print("BotResponse error:", exc)
            traceback.print_exc()
            return Response({"detail": str(exc)}, status=status.HTTP_417_EXPECTATION_FAILED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_stream(request, message_id):
    # Seta o flag de cancelamento para o message_id
    with CANCEL_FLAGS_LOCK:
        CANCEL_FLAGS[message_id] = True
    return Response({"cancelled": True})

class LastBotMessageIdView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        # Busca a última mensagem do bot na conversa (ordem decrescente)
        last_bot_message = (
            NymMessage.objects
            .filter(conversation_id=conversation_id, sender='bot')
            .order_by('-created_at')
            .first()
        )
        if last_bot_message:
            return Response({"id": last_bot_message.id})
        else:
            return Response({"id": None}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetConversationMessages(request, conversation_id):
	if request.method == 'GET':
		try:
			conversation = conversationExists(conversation_id, request.user)
			if not conversation:
				return Response({"detail": "Conversation not found or does not belong to the user."}, status=status.HTTP_404_NOT_FOUND)
			
			messages = NymMessage.objects.filter(conversation=conversation_id).order_by('created_at')

			for msg in messages:
				msg.text = msg.decrypt_text()

			serializer = MessageSerializer(messages, many=True)

			if not messages.exists():
				return Response(status=status.HTTP_204_NO_CONTENT)
			
			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

# CRUD MESSAGES

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def CrudMessage(request, message_id):
	if request.method == 'GET':
		try:
			message = NymMessage.objects.filter(id=message_id).first()
			if not message:
				return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
			
			message.text = message.decrypt_text()

			serializer = MessageSerializer(message)

			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	if request.method == 'PUT':
		try:
			message = NymMessage.objects.filter(id=message_id).first()
			if not message:
				return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
			
			data = request.data

			message.text = data.get('text')

			message.save()

			message.text = message.decrypt_text()

			serializer = MessageSerializer(message)

			return Response(serializer.data, status=status.HTTP_200_OK)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	if request.method == 'DELETE':
		try:
			message = NymMessage.objects.filter(id=message_id).first()
			if not message:
				return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
			
			message.delete()

			return Response(status=status.HTTP_204_NO_CONTENT)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)
	return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
		
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def DeleteConversation(request, conversation_id):
    try:
        # Ensure the conversation exists and belongs to the requesting user.
        conversation = conversationExists(conversation_id, request.user)
        if not conversation:
            return Response(
                {"detail": "Conversation not found or does not belong to the user."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete the conversation.
        conversation.delete()  # Cascade deletion will automatically remove associated messages.
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        print_error(e, True)
        return Response(status=status.HTTP_400_BAD_REQUEST)
