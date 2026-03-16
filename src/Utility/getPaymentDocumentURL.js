import { collection, query, where, getDocs } from "firebase/firestore";

export default async function getPaymentDocumentURL(
  Source,
  companyName,
  gstURL,
  receiptURL,
) {
  try {
    // If not B To C → always receipt
    if (Source !== "B To C") {
      return receiptURL;
    }

    // If no company → receipt
    if (!companyName) {
      return receiptURL;
    }

    const q = query(
      collection(db, "ClientOnboarding"),
      where("companyName", "==", companyName),
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const company = snapshot.docs[0].data();

      if (company.needGST === true) {
        return gstURL;
      }
    }

    return receiptURL;
  } catch (error) {
    console.log("Document URL decision error:", error);
    return receiptURL;
  }
}