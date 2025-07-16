# api/managers.py

from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _

class NymUserManager(BaseUserManager):
    """
    Custom manager for NymUser. Expects `mnemonic_hash` (SHA256 hex digest)
    instead of the raw mnemonic phrase.
    """

    def create_user(self, username: str, password: str, mnemonic_hash: str, **extra_fields):
        if not username:
            raise ValueError(_("The Username must be set"))
        if not mnemonic_hash:
            raise ValueError(_("A mnemonic_hash is required"))
        if not password:
            raise ValueError(_("A password must be provided"))

        # Ensure mnemonic_hash is unique
        if self.model.objects.filter(mnemonic_hash=mnemonic_hash).exists():
            raise ValueError(_("That mnemonic_hash is already in use"))

        # Build and save the user
        user = self.model(
            username=username,
            mnemonic_hash=mnemonic_hash,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username: str, password: str, mnemonic_hash: str, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(username, password, mnemonic_hash, **extra_fields)
