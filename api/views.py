# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import MessageSerializer, UserSerializer, ConversationSerializer
from .models import NymUser, NymConversation, NymMessage
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.permissions import AllowAny
from .erros import print_error
from rest_framework_simplejwt.tokens import RefreshToken
from .utils import getBotResponse, ValidadeInputs, conversationExists, decryptMessage
from .permissions import isNymAdmin

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

@api_view(['POST'])
@permission_classes([AllowAny])
def LoginNymUser(request):
	if request.method == 'POST':
		try:
			data = request.data
			username = data.get('username')
			password = data.get('password')
			
			if ValidadeInputs(username, password) is None:
				return Response({"detail": "Username or password not provided"}, status=status.HTTP_400_BAD_REQUEST)
			
			user = authenticate(username=username, password=password)
			
			if user:
					if user.is_active:
						refresh = RefreshToken.for_user(user)
						access_token = refresh.access_token
						return Response({
							"access_token": str(access_token),
							"refresh_token": str(refresh),
							"username": user.username,
							"email": user.email,
						}, status=status.HTTP_200_OK)
					else:
						return Response({"detail": "User is not active"}, status=status.HTTP_403_FORBIDDEN)
			else:
				return Response({"detail": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
		except Exception as e:
			print_error(e, True)
			return Response({"detail": "An error occurred while logging in"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def RegisterNymUser(request):

	if request.method == 'POST':
		try:

			data = request.data

			username = data.get('username')
			email = data.get('email')

			if ValidadeInputs(username, email) is None:
				return Response({"detail": "Username or email not provided"}, status=status.HTTP_400_BAD_REQUEST)

			user = NymUser.objects.filter(username=username, email=email).first()

			if user:
				return Response({"detail": "Username or email is already registered"}, status=status.HTTP_409_CONFLICT)
			
			serializer = UserSerializer(data=data)

			if serializer.is_valid():
				serializer.save()
				return Response(serializer.data, status=status.HTTP_201_CREATED)
			else:
				print_error(serializer.errors, False)
				return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			print_error(e, True)
			return Response(status=status.HTTP_400_BAD_REQUEST)

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def BotResponse(request, message_id):
	if request.method == 'POST':
		try:
			message = NymMessage.objects.filter(id=message_id).first()

			if not message:
				return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
			
			message_decrypt = message.decrypt_text()

			bot_response = getBotResponse(message_decrypt, message.conversation.id)

			if not bot_response:
				return Response({"detail": "Error getting bot response."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
			
			message_body = {
				"sender": "bot",
				"text": bot_response,
				"conversation": message.conversation.id
			}

			message = MessageSerializer(data=message_body)

			if message.is_valid():
				message.save()
				front = message.data
				front['text'] = decryptMessage(message.data['id'])
				return Response(front, status=status.HTTP_201_CREATED)
			return Response({"detail": "Error creating message."}, status=status.HTTP_400_BAD_REQUEST)

		except Exception as e:
			print(e)
			return Response(status=status.HTTP_417_EXPECTATION_FAILED)


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
