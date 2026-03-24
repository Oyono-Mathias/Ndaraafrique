# 💳 Mécanique du Wallet Ndara Afrique v2.5

Le système financier de Ndara Afrique repose sur une architecture de "Triple Solde" pour garantir la sécurité et la traçabilité des flux.

## 1. Les trois types de soldes (Firestore: users/{uid})

| Champ | Usage | Type de fonds |
|-------|-------|---------------|
| `balance` | Achats de cours | Fonds déposés par l'utilisateur (Réel) |
| `affiliateBalance` | Gains retirables | Commissions validées (Ambassadeur/Expert) |
| `pendingAffiliateBalance` | Gains sous séquestre | Commissions en attente de validation (14j) |
| `virtualBalance` | Marketing / Demo | Crédits fictifs pour publicités (Ads Factory) |

## 2. Procédure Utilisateur : Recharge (Deposit)
1. **Accès** : L'utilisateur navigue vers `student/wallet`.
2. **Configuration** : Sélection du pays et de l'opérateur (MTN, Orange, etc.).
3. **Initiation** : Saisie du montant et du numéro de téléphone.
4. **Validation GSM** : Appel à `initiateMeSombPayment`. L'utilisateur reçoit un prompt USSD sur son terminal.
5. **Webhook** : `/api/webhooks/mesomb` reçoit la confirmation de succès du réseau GSM.
6. **Crédit Live** : `paymentProcessor.ts` effectue une opération `FieldValue.increment(amount)` sur le champ `balance`. Le solde s'affiche en temps réel grâce au listener `onSnapshot`.

## 3. Procédure Utilisateur : Achat (Purchase)
1. **Checkout** : Au moment de payer un cours, l'utilisateur choisit le provider `wallet`.
2. **Vérification** : Le système vérifie instantanément si `user.balance >= course.price`.
3. **Transaction Atomique** : 
   - Déduction du montant de `user.balance`.
   - Création du document `payment` avec le statut `completed`.
   - Création de l'inscription `enrollment`.
4. **Répartition** : Le processeur calcule et distribue la part Instructeur et la part Plateforme.

## 4. Retraits (Withdrawals)
- Les gains d'affiliation sont gelés 14 jours pour prévenir la fraude.
- Un retrait peut être demandé vers Mobile Money dès que le seuil de 5 000 XOF est atteint.
- L'administrateur valide la demande depuis le Cockpit et effectue le transfert.

---
"Bara ala, Tonga na ndara." - La technologie au service de la liberté financière.
