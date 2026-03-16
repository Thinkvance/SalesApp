export default function shouldSendInvoice(paymentMode) {
  return paymentMode !== "Cash";
}
