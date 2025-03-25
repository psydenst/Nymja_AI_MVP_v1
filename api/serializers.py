# api/serializers.py

from rest_framework import serializers
from . import models

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NymUser
        fields = ['id' ,'username', 'email', 'password', 'created_at']  # Explicit fields are better than __all__

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = models.NymUser(**validated_data)
        if password is not None:
            user.set_password(password)  # This will hash the password
        user.save()
        return user

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NymConversation
        fields = ['id','user', 'name', 'created_at']
        
class MessageSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.NymMessage
		fields = ['id', 'conversation', 'text', 'sender', 'created_at']
		read_only_fields = ['create_at']



