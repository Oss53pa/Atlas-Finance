// Dictionnary for multi-language support
export const DICTIONNARY = {
  VoulezVousVraimentSupprimé: {
    fr: "Voulez-vous vraiment supprimer cet élément ?",
    en: "Do you really want to delete this item?"
  },
  VoulezVousVraimentEnregistré: {
    fr: "Voulez-vous vraiment enregistrer ces modifications ?",
    en: "Do you really want to save these changes?"
  },
  Yes: {
    fr: "Oui",
    en: "Yes"
  },
  Cancel: {
    fr: "Annuler",
    en: "Cancel"
  },
  SuppressionEffectueAvecSucces: {
    fr: "Suppression effectuée avec succès",
    en: "Successfully deleted"
  },
  EnregistrementEffectueAvecSucces: {
    fr: "Enregistrement effectué avec succès",
    en: "Successfully saved"
  },
  AnErrorOccurredDuringRegistration: {
    fr: "Une erreur s'est produite lors de l'enregistrement",
    en: "An error occurred during registration"
  }
} as const;

export const useLanguage = () => {
  // Default to French, can be extended later
  return { language: 'fr' };
};