# models.py
from django.db import models
from .managers import NymUserManager
from django.contrib.auth.models import AbstractBaseUser
import uuid
from cryptography.fernet import Fernet
from os import getenv

CRYPTO_KEY = getenv("CRYPTO_KEY")

def load_key():
    return CRYPTO_KEY

key = load_key()
cipher = Fernet(key)

# Create your models here.

class NymUser(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    objects = NymUserManager()

    def __str__(self):
        return f"Nome do usuario: {self.username} - Email: {self.email}"

class NymConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(NymUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversa de {self.user.username} - {self.create_at}"


class NymMessage(models.Model):
    SENDER_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.CharField(max_length=100, choices=SENDER_CHOICES)
    text = models.TextField()
    conversation = models.ForeignKey(NymConversation, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Criptografa o texto da mensagem antes de salvar
        self.text = cipher.encrypt(self.text.encode()).decode()
        super().save(*args, **kwargs)

    def decrypt_text(self):
        # Descriptografa o texto da mensagem
        return cipher.decrypt(self.text.encode()).decode()