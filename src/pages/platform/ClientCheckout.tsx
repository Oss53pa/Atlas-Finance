// @ts-nocheck

import React, { useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Smartphone, Building, FileText, ArrowLeft,
  CheckCircle, Phone, Shield, Zap, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const OPERATORS = [
  { code: 'orange', name: 'Orange Money', color: '#f97316' },
  { code: 'mtn', name: 'MTN MoMo', color: '#eab308' },
  { code: 'wave', name: 'Wave', color: '#06b6d4' },
  { code: 'moov', name: 'Moov Money', color: '#3b82f6' },
];

const ClientCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { solutionCode } = useParams();
  const { tenant } = useOutletContext<any>();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'virement' | 'bon_commande'>('mobile_money');
  const [operator, setOperator] = useState('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [processing, setProcessing] = useState(false);

  const { data: solution } = useQuery({
    queryKey: ['solution', solutionCode],
    queryFn: async () => {
      const { data } = await supabase.from('solutions').select('*').eq('code', solutionCode).single();
      return data;
    },
    enabled: !!solutionCode,
  });

  const price = solution
    ? billing === 'monthly' ? solution.price_monthly_xof : solution.price_yearly_xof
    : 0;
  const priceEur = solution
    ? billing === 'monthly' ? solution.price_monthly_eur : solution.price_yearly_eur
    : 0;

  const handlePayment = async () => {
    if (!solution || !tenant) return;
    setProcessing(true);

    try {
      // 1. Créer la subscription
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          organization_id: tenant.id,
          solution_id: solution.id,
          status: paymentMethod === 'mobile_money' ? 'incomplete' : 'active',
          payment_method: paymentMethod,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (billing === 'yearly' ? 365 : 30) * 86400000).toISOString(),
        }, { onConflict: 'organization_id,solution_id' })
        .select()
        .single();

      if (subError) throw new Error(subError.message);

      // 2. Créer la facture
      await supabase.from('invoices').insert({
        tenant_id: tenant.id,
        subscription_id: sub.id,
        amount: price,
        currency: tenant.currency || 'XOF',
        status: paymentMethod === 'mobile_money' ? 'pending' : 'pending',
        payment_method: paymentMethod,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(Date.now() + (billing === 'yearly' ? 365 : 30) * 86400000).toISOString().split('T')[0],
      });

      // 3. Sync feature flags
      await supabase.from('feature_flags').upsert({
        tenant_id: tenant.id,
        module: solution.code,
        enabled: true,
      }, { onConflict: 'tenant_id,module' });

      // 4. Log audit
      await supabase.from('audit_logs').insert({
        tenant_id: tenant.id,
        action: 'SUBSCRIPTION_CREATED',
        resource_type: 'subscription',
        resource_id: sub.id,
        metadata: { solution: solution.code, payment_method: paymentMethod, amount: price },
      });

      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-tenant'] });

      if (paymentMethod === 'mobile_money') {
        toast.success('Demande de paiement envoyée. Confirmez sur votre téléphone.');
      } else {
        toast.success(`${solution.name} activé !`);
      }

      navigate('/client');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  if (!solution) {
    return <div className="flex items-center justify-center min-h-[400px] text-gray-400">Chargement...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="text-xl font-bold text-[#171717]">Souscrire à {solution.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left — Options */}
        <div className="md:col-span-3 space-y-6">

          {/* Billing period */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm text-[#171717] mb-3">Période de facturation</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'monthly' as const, label: 'Mensuel', price: solution.price_monthly_xof },
                { key: 'yearly' as const, label: 'Annuel', price: solution.price_yearly_xof, badge: '-17%' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setBilling(opt.key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${billing === opt.key ? 'border-[#171717] bg-[#171717]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {opt.badge && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{opt.badge}</span>}
                  </div>
                  <div className="text-lg font-bold text-[#171717] mt-1">{opt.price.toLocaleString('fr-FR')} FCFA</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm text-[#171717] mb-3">Mode de paiement</h3>
            <div className="space-y-3">
              {[
                { key: 'mobile_money' as const, label: 'Mobile Money', desc: 'Orange, MTN, Wave, Moov', icon: Smartphone },
                { key: 'virement' as const, label: 'Virement bancaire', desc: 'RIB Atlas Studio', icon: Building },
                { key: 'bon_commande' as const, label: 'Bon de commande', desc: 'Upload du bon signé', icon: FileText },
              ].map(m => (
                <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === m.key ? 'border-[#171717] bg-[#171717]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <m.icon className="w-5 h-5 text-gray-500 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#171717]">{m.label}</div>
                    <div className="text-xs text-gray-500">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Money details */}
          {paymentMethod === 'mobile_money' && (
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm text-[#171717]">Détails Mobile Money</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Opérateur</label>
                <div className="grid grid-cols-2 gap-2">
                  {OPERATORS.map(op => (
                    <button key={op.code} onClick={() => setOperator(op.code)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium text-center transition-all ${operator === op.code ? 'border-[#171717] bg-[#171717]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      {op.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+225 07 00 00 00 00" className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Virement details */}
          {paymentMethod === 'virement' && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-sm text-[#171717]">Coordonnées bancaires Atlas Studio</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                <div><span className="text-gray-500">Banque :</span> <strong>SGBCI</strong></div>
                <div><span className="text-gray-500">IBAN :</span> <strong>CI93 0000 0000 0000 0000 0000 000</strong></div>
                <div><span className="text-gray-500">BIC :</span> <strong>SGBCCIAB</strong></div>
                <div><span className="text-gray-500">Référence :</span> <strong>AS-{tenant?.slug || 'xxx'}-{new Date().getFullYear()}</strong></div>
              </div>
              <p className="text-xs text-gray-500">Votre accès sera activé dès réception du virement (24-48h).</p>
            </div>
          )}
        </div>

        {/* Right — Récapitulatif */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border p-5 sticky top-6">
            <h3 className="font-semibold text-sm text-[#171717] mb-4">Récapitulatif</h3>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{solution.name}</span>
                <span className="font-medium">{price.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Période</span>
                <span className="font-medium">{billing === 'monthly' ? '1 mois' : '1 an'}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-[#171717]">Total</span>
                <div className="text-right">
                  <div className="font-bold text-lg text-[#171717]">{price.toLocaleString('fr-FR')} FCFA</div>
                  <div className="text-xs text-gray-400">{priceEur}€</div>
                </div>
              </div>
            </div>

            <button onClick={handlePayment} disabled={processing || (paymentMethod === 'mobile_money' && !phoneNumber)}
              className="w-full py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {processing ? 'Traitement...' : (
                <><Shield className="w-4 h-4" /> Payer {price.toLocaleString('fr-FR')} FCFA</>
              )}
            </button>

            <div className="mt-4 space-y-2">
              {['Paiement sécurisé', 'Annulation à tout moment', 'Support 7j/7'].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCheckout;
