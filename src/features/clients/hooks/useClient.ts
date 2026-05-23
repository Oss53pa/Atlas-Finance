import { useState, useEffect } from 'react';
import { ClientDetail, Facture, Paiement } from '../types/client.types';
import { clientService } from '../services/clientService';
import { useData } from '../../../contexts/DataContext';

export const useClientDetail = (clientId: string) => {
  const { adapter } = useData();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getClient(adapter, clientId);
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
  }, [adapter, clientId]);

  return { client, loading, error };
};

export const useClientFactures = (clientId: string) => {
  const { adapter } = useData();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFactures = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getFactures(adapter, clientId);
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
  }, [adapter, clientId]);

  return { factures, loading, error };
};

export const useClientPaiements = (clientId: string) => {
  const { adapter } = useData();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaiements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await clientService.getPaiements(adapter, clientId);
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
  }, [adapter, clientId]);

  return { paiements, loading, error };
};