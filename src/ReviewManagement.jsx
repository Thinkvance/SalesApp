import { useState } from "react";
import Nav from "./Nav";

// Star rating component (for reusability)
function StarRating({ value }) {
  const fullStars = Math.floor(value);
  return (
    <div className="text-yellow-500 text-xl">
      {"★".repeat(fullStars)}
      {"☆".repeat(5 - fullStars)}
    </div>
  );
}

function ReviewDashboard() {
  const [stats, setStats] = useState({
    totalReviews: 10000,
    averageRating: 4.0,
    ratingDistribution: [
      { star: 5, count: 2000, color: "bg-emerald-500" },
      { star: 4, count: 1000, color: "bg-purple-500" },
      { star: 3, count: 500, color: "bg-yellow-500" },
      { star: 2, count: 200, color: "bg-orange-400" },
      { star: 1, count: 0, color: "bg-blue-400" },
    ],
    reviews: [
      {
        name: "Towhidur Rahman",
        PickupBookedBy: "mouli",
        pickupExecutive: "sathish",
        LogisticCost: "1000",
        Tshirt: "Yes",
        OnTime: "No",
        rating: 2,
        date: "24-10-2022",
        comment:
          "My first and only mala ordered on Etsy, and I'm beyond delighted! I requested a custom mala based on two stones I was called to invite together in this kind of creation. The fun and genuine joy.",
      },
      {
        name: "Ayesha Siddique",
        PickupBookedBy: "sana",
        pickupExecutive: "sathish",
        LogisticCost: "2000",
        Tshirt: "No",
        OnTime: "No",
        rating: 2,
        date: "12-08-2022",
        comment:
          "Superb service and prompt delivery. Loved the packaging and the behavior of the delivery team was professional.",
      },
    ],
  });

  const totalRatingCount = stats.ratingDistribution.reduce(
    (sum, r) => sum + r.count,
    0
  );

  return (
    <div>
      <Nav />

      <div className="min-h-screen bg-white px-4 md:px-8 lg:px-16 py-6 font-sans max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800">Reviews</h1>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-purple-100 rounded-xl border p-5 shadow-md flex flex-col justify-around">
            <p className="text-sm text-purple-600 font-bold">Total Reviews</p>
            <div className="flex items-baseline gap-2 flex-col">
              <h2 className="text-2xl font-bold text-gray-800">
                {(stats.totalReviews / 1000).toFixed(1)}k
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mt-2">
                Growth in reviews on this year
              </p>
            </div>
          </div>

          <div className="bg-purple-100 rounded-xl border p-5 shadow-md flex flex-col justify-around">
            <p className="text-sm text-purple-600 font-bold">Average Rating</p>
            <div className="flex items-baseline flex-col">
              <h2 className="text-2xl font-bold text-gray-800">
                {stats.averageRating.toFixed(1)}
              </h2>
              <StarRating value={stats.averageRating} />
              <p className="text-gray-500 text-sm leading-relaxed mt-2">
                Average rating on this year
              </p>
            </div>
          </div>

          <div className="bg-purple-100 rounded-xl border p-5 shadow-md">
            {stats.ratingDistribution.map(({ star, count, color }) => (
              <div key={star} className="flex items-center gap-2 text-sm mb-1">
                <span className="w-2 text-gray-600 font-bold text-[12px]">
                  {star}
                </span>
                <div className="flex-1 h-1 rounded-full bg-white overflow-hidden">
                  <div
                    className={`${color} h-1`}
                    style={{
                      width: `${(count / totalRatingCount) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="w-12 text-right text-gray-600 font-medium text-xs">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {stats?.reviews?.map((review, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Info Section */}
                <div className="md:col-span-4 md:border-r-2 md:pr-4">
                  <h3 className="text-xl font-bold text-purple-700 mb-4">
                    {review.name}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">
                        Total Logistics Cost
                      </span>
                      <span className="text-purple-600 font-semibold">
                        Rs {review.LogisticCost}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">
                        Pickup Booked By
                      </span>
                      <span className="text-purple-600 font-semibold">
                        {review.PickupBookedBy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">
                        Pickup Executive
                      </span>
                      <span className="text-purple-600 font-semibold">
                        {review.pickupExecutive}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">T-shirt</span>
                      <span className="text-purple-600 font-semibold">
                        {review.Tshirt}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">
                        On Time ?
                      </span>
                      <span className="text-purple-600 font-semibold">
                        {review.OnTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Section */}
                <div className="md:col-span-8 flex flex-col">
                  <div className="flex justify-between items-start">
                    <StarRating value={review.rating} />
                    <span className="text-sm text-gray-400">{review.date}</span>
                  </div>
                  <p className="mt-4 text-gray-700 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReviewDashboard;
