# models.py
from django.db import models
from .managers import NymUserManager
from django.contrib.auth.models import AbstractBaseUser
import uuid
import hashlib
from cryptography.fernet import Fernet
from os import getenv

CRYPTO_KEY = getenv("CRYPTO_KEY")

def load_key():
    return CRYPTO_KEY

key = load_key()
cipher = Fernet(key)

# Create your models here.
def generate_default_mnemonic_hash():
    # This will run once per row at migration‐time,
    # producing a unique SHA256 of a random UUID.
    return hashlib.sha256(uuid.uuid4().hex.encode()).hexdigest()

class NymUser(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # We keep username required and unique
    username = models.CharField(max_length=100, unique=True)

    # Instead of forcing a default, we'll let the manager override this field
    # by hashing the real BIP-39 phrase. But if someone calls .create() directly
    # without a phrase, generate_default_mnemonic_hash() will fill in something.
    mnemonic_hash = models.CharField(
        max_length=64,
        unique=True,
        default=generate_default_mnemonic_hash,
        help_text="SHA256 hash of the user’s BIP-39 mnemonic"
    )

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = []   # (we don’t require email in this example)

    objects = NymUserManager()

    @staticmethod
    def hash_phrase(phrase: str) -> str:
        """
        Given a plain-text BIP-39 mnemonic phrase, return its SHA256 hex digest.
        """
        return hashlib.sha256(phrase.encode('utf-8')).hexdigest()

    def __str__(self):
        return f"{self.username} (created {self.created_at:%Y-%m-%d})"

class NymConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(NymUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversation of {self.user.username} - {self.create_at:%Y-%m-%d}"


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
