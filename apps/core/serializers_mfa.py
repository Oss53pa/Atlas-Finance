"""
Serializers pour MFA
"""

from rest_framework import serializers
from .mfa import MFAMethod, MFAChallenge


class MFAMethodSerializer(serializers.ModelSerializer):
    """Serializer pour MFAMethod"""

    class Meta:
        model = MFAMethod
        fields = [
            'id',
            'method_type',
            'name',
            'is_active',
            'is_verified',
            'created_at',
            'last_used_at',
            'use_count'
        ]
        read_only_fields = fields


class MFAChallengeSerializer(serializers.ModelSerializer):
    """Serializer pour MFAChallenge"""

    class Meta:
        model = MFAChallenge
        fields = [
            'challenge_code',
            'action_type',
            'created_at',
            'expires_at',
            'attempts',
            'max_attempts',
            'is_expired'
        ]
        read_only_fields = fields

    is_expired = serializers.SerializerMethodField()

    def get_is_expired(self, obj):
        return obj.is_expired()
