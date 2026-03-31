/* ------------------------------------------------------------------ */
/* 🔥 SAFE LAZY FIRESTORE LOADER                                      */
/* ------------------------------------------------------------------ */
const loadFirestore = async () => {
  const { db } = await import("../firebase");
  const firestore = await import("firebase/firestore");

  return {
    db,
    doc: firestore.doc,
    getDoc: firestore.getDoc,
  };
};

/* ------------------------------------------------------------------ */
/* ✅ FETCH RATE BY COUNTRY + SERVICE + WEIGHT                        */
/* ------------------------------------------------------------------ */
export async function fetchRate(country, service, weight) {
  try {
    const { db, doc, getDoc } = await loadFirestore();

    const docRef = doc(db, "rateCards", country);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`No rate card found for country: ${country}`);
      return null;
    }

    const entries = docSnap.data().entries || [];

    // 🔍 Find matching weight slab
    const entry = entries.find((item) => item.Weight_slab === weight);

    if (!entry) {
      console.warn(`No entry found for weight slab: ${weight}`);
      return null;
    }

    // 🔍 Get service rate dynamically
    const rateValue = entry?.[service];

    if (!rateValue || rateValue === "-" || !rateValue.startsWith("₹")) {
      console.warn(`Invalid or missing rate for service: ${service}`);
      return null;
    }

    // 💰 Convert to number
    const amount = parseInt(rateValue.replace("₹", "").replace(/,/g, ""), 10);

    return {
      country,
      service,
      weight,
      amount,
    };
  } catch (error) {
    console.error("Error fetching rate:", error);
    return null;
  }
}
