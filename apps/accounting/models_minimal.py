"""
Minimal accounting models for WiseBook startup
"""
from django.db import models
from apps.core.models import TimeStampedModel


class Company(TimeStampedModel):
    """Société/Entreprise"""
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'companies'
        verbose_name_plural = 'Companies'
    
    def __str__(self):
        return self.name


class ChartOfAccounts(TimeStampedModel):
    """Plan comptable"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='charts')
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'chart_of_accounts'
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(TimeStampedModel):
    """Écriture comptable"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='entries')
    reference = models.CharField(max_length=50)
    date = models.DateField()
    description = models.TextField()
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'journal_entries'
    
    def __str__(self):
        return f"{self.reference} - {self.description[:50]}"