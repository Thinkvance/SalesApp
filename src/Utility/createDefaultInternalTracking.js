import { Timestamp } from "firebase/firestore";

const datetime = Timestamp.now();
const createDefaultInternalTracking = (pickupDateTime_firebase_timestamp) => {
  return [
    {
      code: "PICKUP_SCHEDULED",
      label: "Pickup Scheduled",
      status: "COMPLETED",
      location: "Chennai",
      datetime: pickupDateTime_firebase_timestamp,
      updatedBy: "system",
      updatedAt: datetime,
      notes: "",
    },
    {
      code: "EXECUTIVE_ON_THE_WAY",
      label: "Executive On The Way",
      status: "PENDING",
      location: null,
      datetime: null,
      updatedBy: null,
      updatedAt: null,
      notes: "",
    },
    {
      code: "PACKED_WEIGHED",
      label: "Packed / Weighed",
      status: "PENDING",
      location: null,
      datetime: null,
      updatedBy: null,
      updatedAt: null,
      notes: "",
    },
    {
      code: "PAYMENT_RECEIVED",
      label: "Payment Received",
      status: "PENDING",
      location: null,
      datetime: null,
      updatedBy: null,
      updatedAt: null,
      notes: "",
    },
    {
      code: "SHIPMENT_CONNECTED",
      label: "Shipment Connected",
      status: "PENDING",
      location: null,
      datetime: null,
      updatedBy: null,
      updatedAt: null,
      notes: "",
    },
  ];
};

export default createDefaultInternalTracking;
