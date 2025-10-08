from rest_framework import serializers
from .models import Exercise, ClotureMensuelle, ClotureAnnuelle, HistoriqueCloture


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'


class ClotureMensuelleSerializer(serializers.ModelSerializer):
    progression = serializers.SerializerMethodField()
    exercice_libelle = serializers.CharField(source='exercice.libelle', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    valide_par_nom = serializers.CharField(source='valide_par.get_full_name', read_only=True)

    class Meta:
        model = ClotureMensuelle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_progression(self, obj):
        return obj.get_progression()


class ClotureAnnuelleSerializer(serializers.ModelSerializer):
    progression = serializers.SerializerMethodField()
    exercice_detail = ExerciseSerializer(source='exercice', read_only=True)
    responsable_nom = serializers.CharField(source='responsable_cloture.get_full_name', read_only=True)

    class Meta:
        model = ClotureAnnuelle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_progression(self, obj):
        return obj.get_progression()


class HistoriqueClotureSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True)

    class Meta:
        model = HistoriqueCloture
        fields = '__all__'