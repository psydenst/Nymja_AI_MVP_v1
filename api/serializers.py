# api/serializers.py

from rest_framework import serializers
from . import models
from mnemonic import Mnemonic


class RegisterSerializer(serializers.Serializer):
    """
    - accepts username & password
    - generates a 24-word BIP-39 phrase
    - calls your custom manager to save mnemonic_hash + password
    - returns the plain recovery_phrase so the frontend can show it once
    """
    username = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        # 1) generate 24-word phrase
        mnemo = Mnemonic("english")
        phrase = mnemo.generate(strength=256)

        # 2) create user via your manager
        user = models.NymUser.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            mnemonic_phrase=phrase
        )

        # 3) attach plain-text for the view
        user.recovery_phrase = phrase
        return user


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.NymUser
        fields = ['id', 'username', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NymConversation
        fields = ['id', 'user', 'name', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NymMessage
        fields = ['id', 'conversation', 'text', 'sender', 'created_at']
        read_only_fields = ['created_at']



