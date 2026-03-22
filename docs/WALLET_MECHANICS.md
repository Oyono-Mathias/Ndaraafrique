# 💳 Mécanique du Wallet Ndara Afrique v2.5

Le système financier de Ndara Afrique repose sur une architecture de "Triple Solde" pour garantir la sécurité et la traçabilité des flux.

## 1. Les trois types de soldes (Firestore: users/{uid})

| Champ | Usage | Type de fonds |
|-------|-------|---------------|
| `balance` | Achats de cours | Fonds déposés par l'utilisateur (Réel) |
| `affiliateBalance` | Gains retirables | Commissions validées (Ambassadeur/Expert) |
| `pendingAffiliateBalance` | Gains sous séquestre | Commissions en attente de validation (14j) |
| `virtualBalance` | Marketing / Demo | Crédits fictifs pour publicités (Ads Factory) |

## 2. Flux de Recharge (Deposit)
1. L'utilisateur initie une demande via `initiateMeSombPayment`.
2. Le serveur de paiement traite la demande GSM.
3. **Webhook Entry Point** : `/api/webhooks/mesomb` reçoit la confirmation.
4. **Processing** : `paymentProcessor.ts` vérifie l'existence de la transaction.
5. **Action** : `FieldValue.increment(amount)` sur le champ `balance` de l'utilisateur.

## 3. Flux d'Achat (Purchase)
1. Au checkout, le client choisit `provider: 'wallet'`.
2. Le frontend vérifie le solde localement.
3. Le serveur effectue la soustraction atomique.
4. `processNdaraPayment` répartit les fonds :
   - Part Instructeur -> Ajouté à son `balance`.
   - Part Ambassadeur -> Ajouté à son `pendingAffiliateBalance`.
   - Part Plateforme -> Reste sur le compte Ndara Officiel.

## 4. Sécurité P2P & Fraude
- **Idempotence** : Chaque transaction a un `gatewayTransactionId` unique. Si le webhook est envoyé deux fois, le processeur ignore le second appel.
- **Shadow Blocking** : Les administrateurs peuvent bloquer les discussions ou geler les soldes suspectés de fraude via le Cockpit Monitoring.
- **Arbitrage** : Le rachat direct par Ndara (`buyoutStatus`) transfère tous les futurs revenus d'un cours vers le compte `NDARA_OFFICIAL`.

---
"Bara ala, Tonga na ndara." - La technologie au service de la liberté financière.
