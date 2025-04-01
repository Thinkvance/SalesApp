import React, { useEffect, useState } from "react";
import utilityFunctions from "./Utility/utilityFunctions";

const DataTable = ({ data }) => {
  if (!data || !data.length) {
    return <div className="text-gray-500">No data available</div>;
  }

  // Extract headers and values from the first entry
  const countryData = data[0].data[0]["COUNTRY/ZONE"];
  const weightCategories = data[0].data.slice(1);

  return (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse border border-gray-300 w-full text-sm text-left text-gray-500">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="border border-gray-300 px-4 py-2">COUNTRY/ZONE</th>
            {weightCategories.map((category, index) => (
              <th key={index} className="border border-gray-300 px-4 py-2">
                {Object.keys(category)[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countryData.map((country, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">{country}</td>
              {weightCategories.map((category, colIndex) => (
                <td key={colIndex} className="border border-gray-300 px-4 py-2">
                  {category[Object.keys(category)[0]][rowIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const VendorRatesTable = ({ data, selectedVendor }) => {
  const [filteredData, setFilteredData] = useState(null);
  useEffect(() => {
    if (data?.length) {
      const vendorData = data.find((d) => d.id === selectedVendor);
      setFilteredData(vendorData ? [vendorData] : null);
    }
  }, [data, selectedVendor]);
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">
        {selectedVendor} Shipping Rates
      </h1>
      {filteredData ? (
        <DataTable data={filteredData} />
      ) : (
        <div className="text-gray-500">No data available</div>
      )}
    </div>
  );
};

export default VendorRatesTable;