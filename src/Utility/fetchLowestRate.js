/* ------------------------------------------------------------------ */
/* 🗺️ BOOKING DB COUNTRY NAME → RATE CARD DOCUMENT KEY               */
/* ------------------------------------------------------------------ */
const COUNTRY_NAME_MAP = {
  "United Kingdom": "UK",
  "United States of America": "USA",
  "Canada": "CANADA",
  "Singapore": "SINGAPORE",
  "United Arab Emirates": "UAE",
  "Malaysia": "MALAYSIA",
  "Australia": "AUSTRALIA",
  "New Zealand": "NEW ZEALAND",
  "China": "CHINA",
  "Germany": "GERMANY",
  "France": "FRANCE",
  "Austria": "AUSTRIA",
  "Belgium": "BELGIUM",
  "Bulgaria": "BULGARIA",
  "Croatia": "CROATIA",
  "Czechia": "CZECH REPUBLIC",
  "Denmark": "DENMARK",
  "Estonia": "ESTONIA",
  "Finland": "FINLAND",
  "Greece": "GREECE",
  "Hong Kong": "HONG KONG",
  "Hungary": "HUNGARY",
  "Ireland": "IRELAND",
  "Italy": "ITALY",
  "Japan": "JAPAN",
  "Latvia": "LATVIA",
  "Lithuania": "LITHUANIA",
  "Luxembourg": "LUXEMBOURG",
  "Mauritius": "MAURITIUS",
  "Netherlands": "NETHERLANDS",
  "Philippines": "PHILIPPINES",
  "Poland": "POLAND",
  "Portugal": "PORTUGAL",
  "Romania": "ROMANIA",
  "Slovakia": "SLOVAKIA",
  "Slovenia": "SLOVENIA",
  "Spain": "SPAIN",
  "Sri Lanka": "SRI LANKA",
  "Sweden": "SWEDEN",
};

/* ------------------------------------------------------------------ */
/* ⚖️  ACTUAL WEIGHT (kg number) → RATE CARD WEIGHT SLAB              */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* 🔧 SERVICE NAME NORMALISER                                         */
/* ------------------------------------------------------------------ */
export function normaliseService(service) {
  if (!service) return service;
  if (service.trim().toLowerCase() === "duty free") return "EcoDutyFree";
  return service;
}

export function getWeightSlab(kg, service) {
  const w = parseFloat(kg);
  if (isNaN(w)) return null;
  const isDutyFree = normaliseService(service) === "EcoDutyFree";
  if (isDutyFree && w >= 1 && w <= 5) return "5.1 to 8 Kg";
  if (w <= 1)  return "1 Kg FLAT";
  if (w <= 2)  return "2 Kg FLAT";
  if (w <= 3)  return "3 Kg FLAT";
  if (w <= 4)  return "4 Kg FLAT";
  if (w <= 5)  return "5 Kg FLAT";
  if (w <= 8)  return "5.1 to 8 Kg";
  if (w <= 10) return "8.1 to 10 Kg";
  if (w <= 20) return "10.1 to 20 Kg";
  if (w <= 30) return "20.1 to 30 Kg";
  return "30+ Kg";
}

/** Returns the actual weight slab WITHOUT duty-free upsell */
export function getActualWeightSlab(kg) {
  const w = parseFloat(kg);
  if (isNaN(w)) return null;
  if (w <= 1)  return "1 Kg FLAT";
  if (w <= 2)  return "2 Kg FLAT";
  if (w <= 3)  return "3 Kg FLAT";
  if (w <= 4)  return "4 Kg FLAT";
  if (w <= 5)  return "5 Kg FLAT";
  if (w <= 8)  return "5.1 to 8 Kg";
  if (w <= 10) return "8.1 to 10 Kg";
  if (w <= 20) return "10.1 to 20 Kg";
  if (w <= 30) return "20.1 to 30 Kg";
  return "30+ Kg";
}

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
export async function fetchLowestRate(country, service, weight) {
  try {
    const { db, doc, getDoc } = await loadFirestore();

    const rateCardKey = COUNTRY_NAME_MAP[country] ?? country.toUpperCase();
    const docRef = doc(db, "rateCards", rateCardKey);
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
