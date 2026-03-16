import { collection, query, where, getDocs } from "firebase/firestore";

export default async function getPaymentRequestTemplate(Source, companyName) {
  try {
    // If not B To C → always receipt
    if (Source !== "B To C") {
      return "paymentrequestedreceipt_final";
    }

    // If no company name → receipt
    if (!companyName) {
      return "paymentrequestedreceipt_final";
    }

    const q = query(
      collection(db, "ClientOnboarding"),
      where("companyName", "==", companyName),
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const companyData = snapshot.docs[0].data();

      if (companyData.needGST === true) {
        return "paymentrequestedinvoice_final";
      }
    }

    return "paymentrequestedreceipt_final";
  } catch (error) {
    console.log("Template check error:", error);
    return "paymentrequestedreceipt_final";
  }
}
