# api/managers.py

from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _

class NymUserManager(BaseUserManager):
    """
    Custom manager para NymUser. Ele deve esperar receber `mnemonic_phrase`
    e fazer hash via `self.model.hash_phrase(...)` sem importar `NymUser` diretamente.
    """

    def create_user(self, username: str, password: str, mnemonic_phrase: str, **extra_fields):
        if not username:
            raise ValueError(_("The Username must be set"))
        if not mnemonic_phrase:
            raise ValueError(_("A BIP-39 mnemonic_phrase is required"))
        if not password:
            raise ValueError(_("A password must be provided"))

        # Em vez de `NymUser.hash_phrase(...)`, usamos `self.model.hash_phrase(...)`
        hashed = self.model.hash_phrase(mnemonic_phrase)

        # Verifica se já existe alguém com esse hash de mnemonic
        if self.model.objects.filter(mnemonic_hash=hashed).exists():
            raise ValueError(_("That mnemonic_phrase (or its hash) is already in use"))

        # Cria a instância: note que self.model refere-se a NymUser
        user = self.model(
            username=username,
            mnemonic_hash=hashed,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username: str, password: str, mnemonic_phrase: str, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(username, password, mnemonic_phrase, **extra_fields)
