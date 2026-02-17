'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface LoyaltyBalance {
  points: number;
  redeemedValue: number;
}

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  activeReferrals: number;
  totalRewardEarned: number;
}

interface LoyaltyDisplayProps {
  customerId: number;
}

export default function LoyaltyDisplay({ customerId }: LoyaltyDisplayProps) {
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReferralCode, setShowReferralCode] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
  }, [customerId]);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      // Fetch loyalty balance
      const balanceResponse = await fetch(`/api/loyalty?customerId=${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (balanceResponse.ok) {
        const data = await balanceResponse.json();
        setBalance(data.balance);
      }

      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch loyalty data';
      logger.error('Error fetching loyalty data', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          action: 'generate',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate referral code');
      }

      const data = await response.json();
      logger.info('Referral code generated', { code: data.code });

      // Fetch updated stats
      const statsResponse = await fetch(`/api/referral?code=${data.code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      setShowReferralCode(true);
    } catch (err) {
      logger.error('Error generating referral code', err);
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading loyalty data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Loyalty Points Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💳 Loyalty Points</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{balance?.points || 0}</div>
            <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">Points</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              ${(balance?.redeemedValue || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">Redeemable Value</div>
          </div>
        </div>

        <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-800">
          <strong>How it works:</strong> Earn 1 point per dollar spent. Redeem 10 points for $1 off.
        </div>
      </div>

      {/* Referral Program Section */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">🤝 Referral Program</h3>

        {stats?.referralCode ? (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 dark:text-slate-400 mb-2">Your Referral Code</div>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-gray-100 dark:bg-slate-800 p-3 rounded font-mono text-lg font-bold text-gray-800">
                  {stats.referralCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(stats.referralCode || '');
                    logger.info('Referral code copied');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalReferrals}</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Total Referrals</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.activeReferrals}</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Pending</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.totalRewardEarned.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Rewards Earned</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-700 dark:text-slate-300 mb-4">Generate your referral code and start earning rewards!</p>
            <button
              onClick={generateReferralCode}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Generate Referral Code
            </button>
          </div>
        )}

        <div className="bg-green-100 rounded-lg p-3 text-sm text-green-800 mt-4">
          <strong>How it works:</strong> Share your code with friends. When they book, you both get $5 credit!
        </div>
      </div>

      {/* Share Section */}
      {stats?.referralCode && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">📢 Share Your Code</h3>

          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              📱 Share on WhatsApp
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium">
              📧 Share via Email
            </button>
            <button className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium">
              🔗 Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
