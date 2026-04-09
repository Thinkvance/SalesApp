import { doc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Append an agent-discount stats write to an existing Firestore WriteBatch.
 * Using a batch keeps the pickup update and the agent stats update atomic —
 * either both commit or neither does, so we never leave half-cooked data.
 *
 * Uses setDoc(..., { merge: true }) with increment() so the same call works
 * whether the agent doc exists or not (no get+write race, single round-trip).
 *
 * @param {import("firebase/firestore").WriteBatch} batch
 * @param {string} name - agent name (e.g. "jaga")
 * @param {number} discountGiven - amount discounted off the rate card (>= 0)
 * @param {number} recovered - extra margin charged above the rate card (>= 0)
 */
export function appendAgentDiscountToBatch(
  batch,
  name,
  discountGiven = 0,
  recovered = 0,
) {
  const ref = doc(db, "sales_executive_discounts", name);
  const net = discountGiven - recovered;

  batch.set(
    ref,
    {
      name,
      netDiscount: increment(net),
      totalRecovered: increment(recovered),
      totalDiscountsGiven: increment(discountGiven),
      totalShipments: increment(1),
      lastTransactionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
