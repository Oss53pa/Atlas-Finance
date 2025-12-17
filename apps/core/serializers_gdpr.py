"""
Serializers pour GDPR
"""

from rest_framework import serializers
from .gdpr import DataErasureRequest


class DataErasureRequestSerializer(serializers.ModelSerializer):
    """Serializer pour DataErasureRequest"""

    user_username = serializers.CharField(source='user.username', read_only=True)
    processed_by_username = serializers.CharField(source='processed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = DataErasureRequest
        fields = [
            'id',
            'user_username',
            'reason',
            'status',
            'requested_at',
            'processed_at',
            'completed_at',
            'records_deleted',
            'records_anonymized',
            'error_message',
            'processed_by_username',
            'report'
        ]
        read_only_fields = fields
