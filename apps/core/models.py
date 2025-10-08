"""
Minimal core models for WiseBook startup
"""
from django.db import models
from django.contrib.auth.models import User
import uuid


class TimeStampedModel(models.Model):
    """Abstract model with created_at and updated_at fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract model with UUID primary key."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Abstract model combining UUID and timestamps."""
    
    class Meta:
        abstract = True


class Societe(BaseModel):
    """Société - Modèle minimal pour démarrage"""
    nom = models.CharField(max_length=255, verbose_name="Raison sociale")
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'core_companies'
        verbose_name = 'Société'
        verbose_name_plural = 'Sociétés'
        ordering = ['nom']

    def __str__(self):
        return self.nom


# Alias for compatibility
Company = Societe


class Devise(BaseModel):
    """Devise - Modèle pour les devises"""
    code = models.CharField(max_length=3, unique=True, verbose_name="Code ISO")
    nom = models.CharField(max_length=100, verbose_name="Nom")
    symbole = models.CharField(max_length=10, verbose_name="Symbole")
    taux_change = models.DecimalField(max_digits=10, decimal_places=6, default=1.0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_devise'
        verbose_name = 'Devise'
        verbose_name_plural = 'Devises'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.nom}"