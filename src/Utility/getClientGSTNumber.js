import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default async function getClientGSTNumber(companyName) {
  try {
    // If no company → unregistered
    if (!companyName) {
      return "-";
    }

    const q = query(
      collection(db, "ClientOnboarding"),
      where("companyName", "==", companyName),
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const client = snapshot.docs[0].data();

      if (client.needGST === true && client.GSTNumber) {
        return client.GSTNumber;
      }
    }

    return "-";
  } catch (error) {
    console.log("GST fetch error:", error);
    return "-";
  }
}