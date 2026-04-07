import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @param {string} name - agent name (e.g. "jaga")
 * @param {number} discountAmount - positive = discount given, negative = recovered
 */
export async function updateAgentDiscount(name, discountAmount) {
  const ref = doc(db, "sales_executive_discounts", name);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      netDiscount: increment(discountAmount),
      totalRecovered: increment(discountAmount < 0 ? Math.abs(discountAmount) : 0),
      totalDiscountsGiven: increment(discountAmount > 0 ? discountAmount : 0),
      lastTransactionAt: serverTimestamp(),
      totalShipments: increment(1),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      name,
      netDiscount: discountAmount,
      totalRecovered: discountAmount < 0 ? Math.abs(discountAmount) : 0,
      totalDiscountsGiven: discountAmount > 0 ? discountAmount : 0,
      lastTransactionAt: serverTimestamp(),
      totalShipments: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
