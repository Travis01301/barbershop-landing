'use client'

import { useState, useEffect } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_HOURS = [
  { start: '09:00', end: '17:00' }, // Sunday
  { start: '09:00', end: '17:00' }, // Monday
  { start: '09:00', end: '17:00' }, // Tuesday
  { start: '09:00', end: '17:00' }, // Wednesday
  { start: '09:00', end: '17:00' }, // Thursday
  { start: '09:00', end: '17:00' }, // Friday
  { start: '10:00', end: '16:00' }, // Saturday
]

interface Schedule {
  id: number
  barberId: number
  day: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

interface TimeOffRequest {
  id: number
  barberId: number
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'denied'
  requestedAt: string
}

export default function SchedulingPage() {
  const [tab, setTab] = useState<'schedules' | 'time-off'>('schedules')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [barbers, setBarbers] = useState<{ id: number; name: string }[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [creating, setCreating] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    const auth = localStorage.getItem('token')
    if (!auth) {
      // Redirect to login
      window.location.href = '/login'
      return
    }
    setToken(auth)
    fetchData(auth)
  }, [])

  async function fetchData(authToken: string) {
    try {
      setLoading(true)
      
      // Fetch barbers
      const barbersRes = await fetch('/api/barbers', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (barbersRes.ok) {
        const data = await barbersRes.json()
        setBarbers(data.barbers || [])
      }

      // Fetch schedules
      const schedRes = await fetch('/api/schedules', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (schedRes.ok) {
        const data = await schedRes.json()
        setSchedules(data.schedules || [])
      }

      // Fetch time-off requests
      const offRes = await fetch('/api/time-off?status=pending', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (offRes.ok) {
        const data = await offRes.json()
        setTimeOffRequests(data.requests || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  async function handleSaveSchedule() {
    if (!editingSchedule || !token) return

    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barberId: editingSchedule.barberId,
          dayOfWeek: editingSchedule.dayOfWeek,
          startTime: editingSchedule.startTime,
          endTime: editingSchedule.endTime,
          isActive: editingSchedule.isActive
        })
      })

      if (response.ok) {
        fetchData(token)
        setEditingSchedule(null)
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
    }
  }

  async function handleApproveTimeOff(requestId: number, approve: boolean) {
    if (!token) return

    try {
      const response = await fetch(`/api/time-off/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: approve ? 'approved' : 'denied'
        })
      })

      if (response.ok) {
        fetchData(token)
      }
    } catch (error) {
      console.error('Error updating request:', error)
    }
  }

  async function handleCreateDefaultSchedules() {
    if (!token || barbers.length === 0) return

    setCreating(true)
    try {
      // Create schedules for all barbers
      for (const barber of barbers) {
        for (let day = 0; day < 7; day++) {
          const { start, end } = DEFAULT_HOURS[day]
          await fetch('/api/schedules', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              barberId: barber.id,
              dayOfWeek: day,
              startTime: start,
              endTime: end,
              isActive: true
            })
          })
        }
      }
      // Refresh data
      fetchData(token)
    } catch (error) {
      console.error('Error creating default schedules:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-600">Loading scheduling system...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Staff Scheduling 📅</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setTab('schedules')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              tab === 'schedules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Schedules
          </button>
          <button
            onClick={() => setTab('time-off')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              tab === 'time-off'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Time-Off Requests ({timeOffRequests.filter(r => r.status === 'pending').length})
          </button>
        </div>

        {/* Schedules Tab */}
        {tab === 'schedules' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Weekly Work Schedules</h2>
              
              {/* Schedules Grid */}
              {schedules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Schedules Configured</h3>
                  <p className="text-slate-600 mb-6">Set up default work schedules for your barbers to get started.</p>
                  
                  {barbers.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700">
                        No barbers found. Please add barbers first before creating schedules.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateDefaultSchedules}
                      disabled={creating}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-lg transition inline-flex items-center gap-2"
                    >
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating Schedules...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Default Schedules for {barbers.length} Barber{barbers.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">Barber</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">Day</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">Start Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">End Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((schedule) => (
                        <tr key={schedule.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-600 font-medium">Barber #{schedule.barberId}</td>
                          <td className="py-3 px-4 text-slate-600">{schedule.day}</td>
                          <td className="py-3 px-4 text-slate-600">{schedule.startTime}</td>
                          <td className="py-3 px-4 text-slate-600">{schedule.endTime}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setEditingSchedule(schedule)}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Edit Modal */}
            {editingSchedule && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
                    Edit {editingSchedule.day} Schedule
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={editingSchedule.startTime}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={editingSchedule.endTime}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingSchedule.isActive}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, isActive: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm font-medium text-slate-700">Active</label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSaveSchedule}
                      className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Time-Off Tab */}
        {tab === 'time-off' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Time-Off Requests</h2>

              {timeOffRequests.length === 0 ? (
                <p className="text-slate-600">No time-off requests</p>
              ) : (
                <div className="space-y-4">
                  {timeOffRequests.map((request) => (
                    <div key={request.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">Barber #{request.barberId}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-slate-600 mt-1">Reason: {request.reason}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleApproveTimeOff(request.id, true)}
                            className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproveTimeOff(request.id, false)}
                            className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700"
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
