import { useEffect, useState } from "react";
import Nav from "./Nav";
import axios from "axios";

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
  const [stats, setStats] = useState({});

  function formatFirestoreTimestamp(timestamp) {
    const date = new Date(timestamp._seconds * 1000); // Convert seconds to milliseconds
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  useEffect(() => {
    axios
      .post(
        "https://review-management-ujtg.onrender.com/api/v1/getReviewDashboardData",
        {}, // empty body (if required)
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((result) => {
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
    <div>
      <Nav />
      <div className="h-fit bg-white px-4 md:px-8 lg:px-16 py-6 font-sans max-w-5xl mx-auto">
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
                {stats?.totalReviews}
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
                {stats?.averageRatings}
              </h2>
              <StarRating value={stats.averageRating} />
              <p className="text-gray-500 text-sm leading-relaxed mt-2">
                Average rating on this year
              </p>
            </div>
          </div>

          <div className="bg-purple-100 rounded-xl border p-5 shadow-md">
            {stats?.ratingDistribution?.map(({ star, count, color }) => (
              <div key={star} className="flex items-center gap-2 text-sm mb-1">
                <span className="w-2 text-gray-600 font-bold text-[12px]">
                  {star}
                </span>
                <div className="flex-1 h-1 rounded-full bg-white overflow-hidden">
                  {console.log((count / totalRatingCount) * 100)}
                  <div
                    className={`${color} h-1`}
                    style={{
                      width: `${
                        totalRatingCount === 0
                          ? 0
                          : (count / totalRatingCount) * 100
                      }%`,
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
          {stats?.reviews?.length > 0 ? (
            stats.reviews.map((review, idx) => (
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
                          {review.logisticCost == null
                            ? "Pending"
                            : `Rs ${review.logisticCost}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Pickup Booked By
                        </span>
                        <span className="text-purple-600 font-semibold">
                          {review.pickupBookedBy}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Pickup Executive
                        </span>
                        <span className="text-purple-600 font-semibold">
                          {review.pickUpPersonName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          T-shirt
                        </span>
                        <span className="text-purple-600 font-semibold">
                          {review.ratings.dressCode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          On Time ?
                        </span>
                        <span className="text-purple-600 font-semibold">
                          {review.ratings.timeliness}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Review Section */}
                  <div className="md:col-span-8 flex flex-col">
                    <div className="flex justify-between items-start">
                      <StarRating value={review.ratings.overallRating} />
                      <span className="text-sm text-gray-400">
                        {formatFirestoreTimestamp(review.reviewCreatedAt)}
                      </span>
                    </div>
                    <p className="mt-4 text-gray-700 text-sm leading-relaxed">
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

export default ReviewDashboard;
