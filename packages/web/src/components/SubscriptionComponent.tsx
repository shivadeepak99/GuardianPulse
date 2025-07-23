import React, { useState, useEffect } from "react";
import api from "../services/api";

interface SubscriptionStatus {
  status: "FREE" | "PREMIUM";
  subscriptionEnd?: string;
  isActive: boolean;
}

export const SubscriptionComponent: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/subscription/status");
      setSubscription(response.data);
    } catch (err) {
      setError("Failed to load subscription status");
      console.error("Error loading subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUrl = window.location.origin;
      const response = await api.post("/subscription/checkout", {
        successUrl: `${currentUrl}/subscription/success`,
        cancelUrl: `${currentUrl}/subscription/cancel`,
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (err) {
      setError("Failed to start checkout process");
      console.error("Error creating checkout session:", err);
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUrl = window.location.origin;
      const response = await api.post("/subscription/portal", {
        returnUrl: `${currentUrl}/profile`,
      });

      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    } catch (err) {
      setError("Failed to open customer portal");
      console.error("Error creating portal session:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  if (loading && !subscription) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadSubscriptionStatus}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Subscription Plan
        </h3>

        {subscription && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscription.status === "PREMIUM"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {subscription.status === "PREMIUM"
                      ? "✨ Premium"
                      : "🆓 Free"}
                  </span>
                  {subscription.isActive && (
                    <span className="ml-2 text-sm text-green-600">Active</span>
                  )}
                </div>

                {subscription.subscriptionEnd && (
                  <p className="mt-2 text-sm text-gray-500">
                    {subscription.isActive
                      ? `Renews on ${new Date(subscription.subscriptionEnd).toLocaleDateString()}`
                      : `Expired on ${new Date(subscription.subscriptionEnd).toLocaleDateString()}`}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {subscription.status === "FREE" ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>🚀 Upgrade to Premium</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>⚙️ Manage Subscription</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {subscription.status === "FREE" && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <h4 className="text-sm font-medium text-blue-900">
                  Premium Features
                </h4>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Unlimited guardian connections</li>
                  <li>• Advanced incident detection</li>
                  <li>• Extended evidence storage</li>
                  <li>• Priority emergency response</li>
                  <li>• 24/7 customer support</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
