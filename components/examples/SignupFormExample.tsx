/**
 * Example: Signup Form with Analytics
 * Demonstrates how to track signup events
 */

'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function SignupFormExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { trackSignUp, setUserId, setCustomDimensions } = useAnalytics();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // Track successful signup
        trackSignUp('email', true);

        // Set user ID for future tracking
        setUserId(data.userId);

        // Set custom dimensions for this user
        setCustomDimensions({
          user_type: data.userType, // 'shop_owner', 'barber', 'customer'
          plan_tier: 'free', // New users start on free tier
        });

        // Redirect or show success
        console.log('Signup successful');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Signup failed');

        // Track failed signup
        trackSignUp('email', false, errorData.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Track signup error
      trackSignUp('email', false, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
