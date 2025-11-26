import { useEffect, useState } from "react";
import Nav from "./Nav";
import axios from "axios";

function StarRating({ value }) {
  const fullStars = Math.round(value || 0);
  return (
    <div className="text-yellow-500 text-xl flex">
      {"★".repeat(fullStars)}
      {"☆".repeat(5 - fullStars)}
    </div>
  );
}

function ReviewDashboard() {
  const [stats, setStats] = useState({});

  function formatFirestoreTimestamp(timestamp) {
    const date = new Date(timestamp?._seconds * 1000);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  useEffect(() => {
    axios
      .post(
        "https://reviewbackend.shiphit.in/api/v1/getReviewDashboardData",
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((result) => {
        console.log("result.data", result.data);
        setStats(result.data);
      })
      .catch((error) => {
        console.log("error", error);
      });
  }, []);

  const totalRatingCount = stats?.ratingDistribution?.reduce(
    (sum, r) => sum + r.count,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-purple-800">
            Reviews Dashboard
          </h1>
        </div>

        {/* Stats Section */}
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Reviews */}
          <div className="bg-white border rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-200">
            <p className="text-sm text-purple-600 font-semibold">
              Total Reviews
            </p>

            <h2 className="text-4xl font-bold mt-4 text-gray-900 tracking-tight">
              {stats?.totalReviews}
            </h2>

            <p className="text-gray-500 text-xs mt-3">
              Growth in reviews this year
            </p>
          </div>

          {/* Average Rating */}
          <div className="bg-white border rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-200">
            <p className="text-sm text-purple-600 font-semibold">
              Average Rating
            </p>

            <h2 className="text-4xl font-bold mt-4 text-gray-900 tracking-tight">
              {stats?.averageRatings?.toFixed(1) || "0.0"}
            </h2>

            <StarRating value={stats?.averageRatings || 0} className="mt-1" />

            <p className="text-gray-500 text-xs mt-3">
              Average rating this year
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="bg-white border rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-200">
            <h3 className="text-sm text-purple-600 font-semibold mb-4">
              Rating Breakdown
            </h3>

            {stats?.ratingDistribution?.map(({ star, count, color }) => {
              const safeTotal = totalRatingCount || 1; // prevents divide-by-zero
              const percentage = (count / safeTotal) * 100;

              return (
                <div
                  key={star}
                  className="flex items-center gap-3 text-sm mb-3"
                >
                  <span className="w-6 text-gray-700 font-semibold">
                    {star}★
                  </span>

                  {/* Progress Bar */}
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <span className="w-10 text-right text-gray-600 text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {stats?.reviews?.length > 0 ? (
            stats.reviews.map((review, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Info Section */}
                  <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6">
                    <h3 className="text-2xl font-semibold text-purple-700 mb-5">
                      {review.name}
                    </h3>

                    <div className="space-y-4 text-sm">
                      <Item label="AWB Number" value={review.awbNumber} />

                      <Item
                        label="Total Logistics Cost"
                        value={
                          review.logisticCost == null ? (
                            <span className="text-yellow-600 font-medium">
                              Pending
                            </span>
                          ) : (
                            `Rs ${review.logisticCost}`
                          )
                        }
                      />

                      <Item
                        label="Pickup Booked By"
                        value={review.pickupBookedBy}
                      />
                      <Item
                        label="Pickup Executive"
                        value={review.pickUpPersonName}
                      />

                      <Item label="T-shirt" value={review.ratings.dressCode} />
                      <Item
                        label="On Time?"
                        value={review.ratings.timeliness}
                      />
                    </div>
                  </div>

                  {/* Review Section */}
                  <div className="md:col-span-8 flex flex-col">
                    <div className="flex justify-between items-start">
                      <StarRating value={review.ratings.overallRating} />

                      <span className="text-xs text-gray-400 font-medium">
                        {formatFirestoreTimestamp(review.reviewCreatedAt)}
                      </span>
                    </div>

                    <p className="mt-5 text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {review.reviewText}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 font-medium text-sm py-6">
              No reviews available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-purple-700 font-semibold">{value}</span>
    </div>
  );
}

export default ReviewDashboard;
