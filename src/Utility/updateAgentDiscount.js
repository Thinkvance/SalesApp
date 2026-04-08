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
 * @param {number} discountGiven - amount discounted off the rate card (>= 0)
 * @param {number} recovered - extra margin charged above the rate card (>= 0)
 */
export async function updateAgentDiscount(name, discountGiven = 0, recovered = 0) {
  const ref = doc(db, "sales_executive_discounts", name);
  const snap = await getDoc(ref);

  const net = discountGiven - recovered;

  if (snap.exists()) {
    await updateDoc(ref, {
      netDiscount: increment(net),
      totalRecovered: increment(recovered),
      totalDiscountsGiven: increment(discountGiven),
      lastTransactionAt: serverTimestamp(),
      totalShipments: increment(1),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      name,
      netDiscount: net,
      totalRecovered: recovered,
      totalDiscountsGiven: discountGiven,
      lastTransactionAt: serverTimestamp(),
      totalShipments: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
