function getCollection(location) {
  const franchiseLocation = location;
  const collectionName =
    franchiseLocation === "PONDY"
      ? "franchise_pondy"
      : franchiseLocation === "COIMBATORE"
      ? "franchise_coimbatore"
      : franchiseLocation === "CHENNAI"
      ? "pickup"
      : "default_collection";
  return collectionName;
}

function getFranchiseBasedAWb(location) {
  const franchiseLocation = location;
  const collectionName =
    franchiseLocation === "PONDY"
      ? 2000
      : franchiseLocation === "COIMBATORE"
      ? 3000
      : franchiseLocation === "CHENNAI"
      ? 1000
      : 1000;
  return collectionName;
}

export default {
  getCollection: getCollection,
  getFranchiseBasedAWb: getFranchiseBasedAWb,
};