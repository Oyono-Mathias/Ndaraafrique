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
2. **Validation GSM** : Le système valide le numéro selon l'opérateur (MTN: 67/68, Orange: 69).
3. **Initiation** : Saisie du montant et appel à `initiateMeSombPayment`. L'utilisateur reçoit un prompt USSD sur son terminal.
4. **Webhook** : `/api/webhooks/mesomb` reçoit la confirmation de succès du réseau GSM.
5. **Crédit Live** : `paymentProcessor.ts` effectue une opération `FieldValue.increment(amount)` sur le champ `balance`. Le solde s'affiche en temps réel grâce au listener `onSnapshot`.

## 3. Procédure Utilisateur : Achat (Purchase)
1. **Checkout** : Au moment de payer un cours, l'utilisateur peut choisir le provider `wallet`.
2. **Vérification** : Le système vérifie instantanément si `user.balance >= course.price`.
3. **Transaction Atomique** : 
   - Déduction du montant de `user.balance`.
   - Création du document `payment` avec le statut `completed`.
   - Création de l'inscription `enrollment`.
4. **Répartition** : Le processeur calcule et distribue la part Instructeur et la part Plateforme.

## 4. Sécurité
- **Idempotence** : Chaque transaction possède un ID unique empêchant les doubles débits.
- **Sanitisation** : Toutes les données vers Firestore sont nettoyées des valeurs `undefined` pour éviter les crashs.
- **Audit** : Chaque recharge admin est logguée dans `admin_audit_logs`.

---
"Bara ala, Tonga na ndara." - La technologie au service de la liberté financière.
