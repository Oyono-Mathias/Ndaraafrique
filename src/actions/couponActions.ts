'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Coupon } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour la gestion des coupons de réduction.
 */

const CouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().regex(/^[A-Z0-9_-]+$/, "Code invalide"),
  courseId: z.string().min(1, "Cours requis"),
  courseTitle: z.string(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive(),
  expiresAt: z.date(),
});

export async function createCouponAction(formData: any, instructorId: string) {
  const validated = CouponSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  try {
    const db = getAdminDb();
    const couponRef = db.collection('course_coupons').doc(validated.data.code);
    const existing = await couponRef.get();
    
    if (existing.exists) {
      return { success: false, error: { code: ["Ce code promo existe déjà."] } };
    }

    await couponRef.set({
      ...validated.data,
      id: validated.data.code,
      instructorId,
      usedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(validated.data.expiresAt),
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCouponAction(code: string, instructorId: string) {
  try {
    const db = getAdminDb();
    const couponRef = db.collection('course_coupons').doc(code);
    const doc = await couponRef.get();
    
    if (!doc.exists || doc.data()?.instructorId !== instructorId) {
      return { success: false, error: "Non autorisé" };
    }

    await couponRef.delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function validateCouponAction(code: string, courseId: string) {
  try {
    const db = getAdminDb();
    const couponRef = db.collection('course_coupons').doc(code.toUpperCase());
    const docSnap = await couponRef.get();

    if (!docSnap.exists) {
      return { success: false, error: "Code promo invalide." };
    }

    const coupon = docSnap.data() as Coupon;

    if (coupon.courseId !== courseId) {
      return { success: false, error: "Ce code n'est pas applicable à ce cours." };
    }

    const now = Timestamp.now();
    if ((coupon.expiresAt as Timestamp).seconds < now.seconds) {
      return { success: false, error: "Ce code promo a expiré." };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { success: false, error: "Limite d'utilisations atteinte." };
    }

    return { 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    };
  } catch (e: any) {
    return { success: false, error: "Erreur de validation." };
  }
}
