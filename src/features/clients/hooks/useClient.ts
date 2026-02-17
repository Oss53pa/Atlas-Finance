import { useState, useEffect } from 'react';
import { ClientDetail, Facture, Paiement } from '../types/client.types';
import { clientService } from '../services/clientService';

export const useClientDetail = (clientId: string) => {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getClient(clientId);
        setClient(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement client');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  return { client, loading, error };
};

export const useClientFactures = (clientId: string) => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFactures = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getFactures(clientId);
        setFactures(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement factures');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchFactures();
    }
  }, [clientId]);

  return { factures, loading, error };
};

export const useClientPaiements = (clientId: string) => {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaiements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getPaiements(clientId);
        setPaiements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement paiements');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchPaiements();
    }
  }, [clientId]);

  return { paiements, loading, error };
};