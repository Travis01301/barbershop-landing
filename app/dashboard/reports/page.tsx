'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ReportData {
  success: boolean
  reportType: string
  [key: string]: any
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('revenue')
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

  useEffect(() => {
    fetchReport()
  }, [reportType, period])

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const shopSlug = localStorage.getItem('shopSlug') || 'default'
      
      if (!token) {
        router.push('/login')
        return
      }

      setLoading(true)
      const response = await fetch(
        `/api/analytics/reports/${shopSlug}?type=${reportType}&period=${period}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return
    
    let csv = ''
    const timestamp = new Date().toISOString().split('T')[0]
    
    if (reportType === 'revenue' && data.monthly) {
      csv = 'Date,Transactions,Deposits,Tips,Total Revenue\n'
      data.monthly.forEach((row: any) => {
        csv += `${row.month},${row.total_transactions},${row.deposits},${row.tips},${row.total_revenue}\n`
      })
    } else if (reportType === 'tax' && data.monthly) {
      csv = 'Period,Card Deposits,Card Tips,Wallet Deposits,Wallet Tips,Gross Revenue,Refunds\n'
      data.monthly.forEach((row: any) => {
        csv += `${row.period},${row.card_deposits},${row.card_tips},${row.wallet_deposits},${row.wallet_tips},${row.gross_revenue},${row.refunds}\n`
      })
    }
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-${reportType}-${timestamp}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
          <p className="text-slate-600">Tax-ready reports, payment reconciliation, and customer insights</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="revenue">Revenue Report</option>
              <option value="tax">Tax Report</option>
              <option value="customer">Customer Report</option>
              <option value="payment">Payment Report</option>
              <option value="cancellation">Cancellation Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={!data}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-75 animate-pulse"></div>
              </div>
            </div>
            <p className="text-slate-600 mt-4">Loading report...</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8">
            {/* Revenue Report */}
            {reportType === 'revenue' && data.summary && (
              <>
                {/* Summary Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-slate-900">${(data.summary.total_revenue || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">{data.summary.total_transactions} transactions</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Deposits</p>
                    <p className="text-3xl font-bold text-slate-900">${(data.summary.total_deposits || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">Confirmed bookings</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Tips</p>
                    <p className="text-3xl font-bold text-slate-900">${(data.summary.total_tips || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">from {data.summary.unique_customers} customers</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Avg per Transaction</p>
                    <p className="text-3xl font-bold text-slate-900">${(data.summary.total_revenue / data.summary.total_transactions || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">per booking</p>
                  </div>
                </div>

                {/* Monthly Revenue Chart */}
                {data.monthly && data.monthly.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Monthly Revenue Trend</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={data.monthly.reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
                        <Legend />
                        <Line type="monotone" dataKey="deposits" stroke="#3b82f6" name="Deposits" />
                        <Line type="monotone" dataKey="tips" stroke="#f59e0b" name="Tips" />
                        <Line type="monotone" dataKey="total_revenue" stroke="#10b981" name="Total" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {/* Tax Report */}
            {reportType === 'tax' && data.summary && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Gross Revenue</p>
                    <p className="text-3xl font-bold text-slate-900">${data.summary.gross_revenue.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">Before refunds</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Refunds</p>
                    <p className="text-3xl font-bold text-slate-900">${data.summary.refunds.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">Total returned</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Taxable Income</p>
                    <p className="text-3xl font-bold text-slate-900">${data.summary.net_revenue.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">For tax reporting</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Total Tips Reported</p>
                    <p className="text-3xl font-bold text-slate-900">${data.summary.tips.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">Tip income</p>
                  </div>
                </div>

                {/* Tax table */}
                {data.monthly && data.monthly.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6 overflow-x-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Monthly Breakdown</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Period</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900">Deposits</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900">Tips</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900">Gross Revenue</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900">Refunds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.monthly.reverse().map((row: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">{new Date(row.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                            <td className="text-right py-3 px-4 font-semibold">${row.card_deposits.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 font-semibold">${row.card_tips.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 font-semibold text-green-600">${row.gross_revenue.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 font-semibold text-red-600">${row.refunds.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Customer Report */}
            {reportType === 'customer' && data.metrics && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Total Customers</p>
                    <p className="text-3xl font-bold text-slate-900">{data.metrics.total_customers}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">New This Period</p>
                    <p className="text-3xl font-bold text-slate-900">{data.metrics.new_customers}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Repeat Customers</p>
                    <p className="text-3xl font-bold text-slate-900">{data.metrics.repeat_customers}</p>
                    <p className="text-xs text-slate-500 mt-2">{data.metrics.repeat_customer_percentage}% of total</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Avg Customer Value</p>
                    <p className="text-3xl font-bold text-slate-900">${(data.lifetimeValue?.avg_customer_value || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Top Customers */}
                {data.topCustomers && data.topCustomers.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6 overflow-x-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Top Customers</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-900">Bookings</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-900">Total Spent</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Last Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topCustomers.map((customer: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{customer.name}</td>
                            <td className="text-center py-3 px-4 text-slate-600">{customer.total_bookings}</td>
                            <td className="text-center py-3 px-4 font-semibold text-green-600">${customer.total_spent.toFixed(2)}</td>
                            <td className="py-3 px-4 text-slate-600 text-xs">{new Date(customer.last_booking).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Payment Report */}
            {reportType === 'payment' && data.paymentMethods && (
              <>
                {/* Payment Method Pie Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Payment Methods</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={data.paymentMethods}
                        dataKey="total"
                        nameKey="payment_method"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label
                      >
                        {data.paymentMethods.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Payment Stats */}
                {data.failedPayments && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                      <p className="text-slate-600 text-sm font-semibold mb-1">Failed Payments</p>
                      <p className="text-3xl font-bold text-slate-900">{data.failedPayments.failed_count}</p>
                      <p className="text-xs text-slate-500 mt-2">${data.failedPayments.failed_amount.toFixed(2)} in failed transactions</p>
                    </div>
                    {data.refunds && (
                      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                        <p className="text-slate-600 text-sm font-semibold mb-1">Refund Rate</p>
                        <p className="text-3xl font-bold text-slate-900">{data.refunds.refund_rate}%</p>
                        <p className="text-xs text-slate-500 mt-2">{data.refunds.refund_count} refunds total</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Cancellation Report */}
            {reportType === 'cancellation' && data.stats && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Total Cancellations</p>
                    <p className="text-3xl font-bold text-slate-900">{data.stats.total_cancellations}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Cancellation Rate</p>
                    <p className="text-3xl font-bold text-slate-900">{data.stats.cancellation_rate}%</p>
                    <p className="text-xs text-slate-500 mt-2">of all bookings</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-slate-600 text-sm font-semibold mb-1">Avg Days Before</p>
                    <p className="text-3xl font-bold text-slate-900">{data.stats.avg_days_before_cancellation}</p>
                    <p className="text-xs text-slate-500 mt-2">before appointment</p>
                  </div>
                </div>

                {/* Cancellation by Day */}
                {data.byDayOfWeek && data.byDayOfWeek.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Cancellations by Day of Week</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.byDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cancellations" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
