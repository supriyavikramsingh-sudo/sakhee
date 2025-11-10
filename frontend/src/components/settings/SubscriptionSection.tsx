import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Alert, Modal, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlanName } from '../../config/pricingConfig';
import subscriptionApi from '../../services/subscriptionApi';
import { useAuthStore } from '../../store/authStore';
import type { SubscriptionData, SubscriptionPlan } from '../../types/subscription.type';

const SubscriptionSection = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: any = await subscriptionApi.getSubscription(user.uid);
      if (response.success) {
        setSubscriptionData(response.data);
      } else {
        setError('Failed to load subscription data');
      }
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      setError(err.message || 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Modal.confirm({
      title: 'Cancel Subscription?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            Your Sakhee Pro subscription will remain active until{' '}
            <strong>
              {subscriptionData?.next_billing_date
                ? new Date(subscriptionData.next_billing_date).toLocaleDateString()
                : 'the end of your billing cycle'}
            </strong>
            .
          </p>
          <p className="mt-2">
            After that, you'll be switched to the Free plan. You can reactivate anytime before then.
          </p>
        </div>
      ),
      okText: 'Confirm Cancellation',
      okType: 'danger',
      cancelText: 'Keep Subscription',
      onOk: async () => {
        await cancelSubscription();
      },
    });
  };

  const cancelSubscription = async () => {
    if (!user?.uid) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response: any = await subscriptionApi.cancel({ userId: user.uid });
      if (response.success) {
        setSubscriptionData(response.data);
        Modal.success({
          title: 'Subscription Canceled',
          content: `You'll continue to have Pro access until ${
            response.data.subscription_end_date
              ? new Date(response.data.subscription_end_date).toLocaleDateString()
              : 'your billing cycle ends'
          }.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to cancel subscription:', err);
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user?.uid) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response: any = await subscriptionApi.reactivate({ userId: user.uid });
      if (response.success) {
        setSubscriptionData(response.data);
        Modal.success({
          title: 'Subscription Reactivated',
          content: 'Your Sakhee Pro subscription has been reactivated!',
        });
      }
    } catch (err: any) {
      console.error('Failed to reactivate subscription:', err);
      setError(err.message || 'Failed to reactivate subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = () => {
    navigate('/pricing');
  };

  const handleUpgradeToPro = () => {
    navigate('/pricing');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <Alert
          type="error"
          message="Failed to load subscription data"
          description={error || 'Please try again later'}
          showIcon
        />
      </div>
    );
  }

  const currentPlan: SubscriptionPlan = subscriptionData.subscription_plan;
  const isFree = currentPlan === 'free';
  const isPro = currentPlan === 'pro';
  const isCanceled = subscriptionData.subscription_status === 'canceled';

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Subscription & Billing</h2>
        <p className="text-gray-600 mt-1">Manage your plan and billing information</p>
      </div>

      {/* Error Message */}
      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Cancellation Warning Banner */}
      {isCanceled && subscriptionData.subscription_end_date && (
        <Alert
          type="warning"
          message={
            <div>
              <p className="font-semibold">Your subscription is canceled</p>
              <p className="mt-1">
                Your Sakhee Pro subscription will end on{' '}
                <strong>
                  {new Date(subscriptionData.subscription_end_date).toLocaleDateString()}
                </strong>
                . You'll continue to have access until then. You can reactivate anytime before this
                date.
              </p>
            </div>
          }
          showIcon
          className="mb-6"
        />
      )}

      {/* Subscription Details */}
      <div className="space-y-6">
        {/* Current Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Plan</label>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                isFree ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {getPlanName(currentPlan)}
            </span>
            {isPro && subscriptionData.billing_cycle && (
              <span className="text-sm text-gray-600">
                ({subscriptionData.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'})
              </span>
            )}
          </div>
        </div>

        {/* Pro Subscription Details */}
        {isPro && (
          <>
            {/* Subscription Start Date */}
            {subscriptionData.subscription_start_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Start Date
                </label>
                <p className="text-gray-800">
                  {new Date(subscriptionData.subscription_start_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Next Billing Date */}
            {subscriptionData.next_billing_date && !isCanceled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Billing Date
                </label>
                <p className="text-gray-800">
                  {subscriptionData.billing_cycle === 'yearly' ? 'Annual renewal on ' : ''}
                  {new Date(subscriptionData.next_billing_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Billing Cycle */}
            {subscriptionData.billing_cycle && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Cycle
                </label>
                <p className="text-gray-800">
                  {subscriptionData.billing_cycle === 'monthly'
                    ? 'Monthly (₹500/month)'
                    : 'Yearly (₹5,000/year)'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        {isFree && (
          <button
            onClick={handleUpgradeToPro}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primaryDark transition"
          >
            Upgrade to Pro
          </button>
        )}

        {isPro && !isCanceled && (
          <div className="flex gap-4">
            <button onClick={handleChangePlan} className="btn-primary px-6 py-3">
              Change Plan
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-500 hover:text-white transition disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Cancel Subscription'}
            </button>
          </div>
        )}

        {isPro && isCanceled && (
          <button
            onClick={handleReactivateSubscription}
            disabled={isProcessing}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primaryDark transition disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Reactivate Subscription'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSection;
