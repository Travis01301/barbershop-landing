'use client'
import { useState, useEffect } from 'react'
import { PaymentForm } from './PaymentForm'
import { ReviewForm } from '../../components/ReviewForm'

export default function BookingForm({ shopId, barbers, shopName }: { shopId: number, barbers: Array<{ id: number, name: string }>, shopName: string }) {
  const [formData, setFormData] = useState({
    barberId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    date: '',
    time: '',
    timeISO: '' // Store the actual ISO time for submission
  })
  const [existingCustomer, setExistingCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<Array<{ display: string; iso: string }>>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [appointment, setAppointment] = useState<any>(null)
  const [managementToken, setManagementToken] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [barberName, setBarberName] = useState('')

  // Check for existing customer profile when email changes
  useEffect(() => {
    if (formData.customerEmail && formData.customerEmail.includes('@')) {
      checkExistingCustomer(formData.customerEmail)
    } else {
      setExistingCustomer(null)
    }
  }, [formData.customerEmail])

  // Fetch available slots when barber or date changes
  useEffect(() => {
    if (formData.barberId && formData.date) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [formData.barberId, formData.date])

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const response = await fetch(
        `/api/available-slots?shopId=${shopId}&barberId=${formData.barberId}&date=${formData.date}`
      )
      const data = await response.json()
      if (data.success && data.availableSlots) {
        // Convert to readable format with ISO backup
        const slots = data.availableSlots.map((slot: any) => {
          const time = new Date(slot.startTime)
          return {
            display: time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            iso: slot.startTime
          }
        })
        setAvailableSlots(slots)
        // Clear selected time if it's no longer available
        if (formData.timeISO && !slots.find((s: { display: string; iso: string }) => s.iso === formData.timeISO)) {
          setFormData(prev => ({ ...prev, time: '', timeISO: '' }))
        }
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const checkExistingCustomer = async (email: string) => {
    setCheckingEmail(true)
    try {
      const response = await fetch(`/api/customers/by-email?shopId=${shopId}&email=${encodeURIComponent(email)}`)
      const data = await response.json()
      if (data.success && data.customer) {
        setExistingCustomer(data.customer)
        // Pre-fill with existing customer data
        setFormData(prev => ({
          ...prev,
          customerName: prev.customerName || data.customer.name,
          customerPhone: prev.customerPhone || data.customer.phone,
        }))
      } else {
        setExistingCustomer(null)
      }
    } catch (error) {
      console.error('Error checking customer:', error)
      setExistingCustomer(null)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Convert ISO time back to readable format for the book API
      const selectedSlot = availableSlots.find(s => s.iso === formData.timeISO)
      const timeStr = selectedSlot?.display || formData.time

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          shopId,
          time: timeStr,
          timeISO: undefined // Don't send internal state
        })
      })

      const data = await response.json()
      if (data.success) {
        setAppointment(data.appointment)
        setManagementToken(data.managementToken)
        // Get barber name from selected barber
        const selectedBarber = barbers.find(b => b.id === parseInt(formData.barberId))
        setBarberName(selectedBarber?.name || 'Barber')
        setSubmitted(true)
      } else {
        alert('Booking failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error creating booking')
    } finally {
      setLoading(false)
    }
  }

  // Generate Google Calendar link
  const getGoogleCalendarLink = () => {
    if (!appointment) return '#'
    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    const formatTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const title = `Appointment at ${shopName}`
    const description = `Barber appointment. Customer: ${appointment.customer_name}`
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      dates: `${formatTime(startDate)}/${formatTime(endDate)}`,
      location: shopName,
    })
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  // Generate Apple Calendar (iCal) download
  const getiCalData = () => {
    if (!appointment) return ''
    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop//Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${appointment.id}@barbershop
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Appointment at ${shopName}
DESCRIPTION:Barber appointment. Customer: ${appointment.customer_name}
LOCATION:${shopName}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`
    
    return ical
  }

  if (submitted && appointment) {
    const appointmentDate = new Date(appointment.start_time)
    const dateStr = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const timeStr = appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    
    const handleDownloadIcal = () => {
      const ical = getiCalData()
      const blob = new Blob([ical], { type: 'text/calendar' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `barbershop-appointment-${appointment.id}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-10 rounded-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-emerald-900 mb-2">All Set!</h2>
          <p className="text-lg text-emerald-700 mb-8">Your appointment has been confirmed</p>
          
          <div className="bg-white rounded-xl p-8 mb-8 border border-emerald-100">
            <h3 className="font-bold text-slate-900 mb-6 text-lg">Appointment Details</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Date & Time</p>
                <p className="text-lg font-bold text-slate-900 mt-2">{dateStr}</p>
                <p className="text-xl font-bold text-blue-600">{timeStr}</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">With</p>
                <p className="text-lg font-bold text-slate-900 mt-2">{appointment.barber_id}</p>
                <p className="text-slate-600 text-sm mt-1">Professional Barber</p>
              </div>
              <div className="border-l-4 border-pink-500 pl-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Duration</p>
                <p className="text-lg font-bold text-slate-900 mt-2">30 Minutes</p>
              </div>
              <div className="border-l-4 border-amber-500 pl-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Location</p>
                <p className="text-lg font-bold text-slate-900 mt-2">{shopName}</p>
              </div>
            </div>
          </div>

          {showPayment ? (
            <div className="bg-white border-2 border-blue-200 p-8 rounded-xl">
              <h3 className="font-bold text-slate-900 mb-2 text-xl">Secure Deposit</h3>
              <p className="text-slate-600 mb-6">Complete payment to confirm your booking</p>
              
              {paymentError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                  <p className="text-red-700 font-semibold">{paymentError}</p>
                </div>
              )}
              
              <PaymentForm
                appointmentId={appointment.id}
                amount={1000} // $10 deposit
                email={appointment.customer_email}
                shopSlug={shopName.toLowerCase().replace(/\s+/g, '-')}
                onSuccess={() => {
                  setShowPayment(false)
                  setShowReview(true)
                }}
                onError={setPaymentError}
              />
            </div>
          ) : showReview && appointment ? (
            <div className="bg-white border-2 border-blue-200 p-8 rounded-xl">
              <h3 className="font-bold text-slate-900 mb-2 text-xl">⭐ Share Your Experience</h3>
              <p className="text-slate-600 mb-6">Help us improve by rating your appointment (you can do this now or later)</p>
              
              <ReviewForm
                appointmentId={appointment.id}
                customerId={appointment.customer_id || 0}
                barberId={parseInt(formData.barberId)}
                shopId={shopId}
                barberName={barberName}
                onSuccess={() => setShowReview(false)}
              />
            </div>
          ) : (
            <>
            <button
              type="button"
              onClick={() => setShowPayment(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 px-6 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pay $10 Deposit to Confirm
            </button>

            <div className="space-y-4">
            <p className="text-slate-700 font-semibold text-sm">Add to your calendar:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href={getGoogleCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                Google Calendar
              </a>
              <button
                type="button"
                onClick={handleDownloadIcal}
                className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0 0V8m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Download (.ics)
              </button>
            </div>
          </div>

        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="text-xl">🔗</span> Manage Your Appointment
          </h3>
          <p className="text-sm text-slate-700 mb-4">
            Need to reschedule or cancel? Use your personal management link anytime.
          </p>
          <a
            href={`/appointments/${appointment.id}?token=${encodeURIComponent(managementToken)}`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Manage Appointment
          </a>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center">
          <p className="text-sm text-slate-700">
            A confirmation email has been sent to <span className="font-bold text-slate-900">{appointment.customer_email}</span>
          </p>
          <p className="text-xs text-slate-600 mt-3">Check spam if you don't see it in your inbox</p>
        </div>
        </>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">Email Address</label>
        <input
          id="email"
          type="email"
          required
          value={formData.customerEmail}
          onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
          placeholder="you@example.com"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {checkingEmail && <p className="text-sm text-slate-500 mt-2">Checking...</p>}
        {existingCustomer && !checkingEmail && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 text-sm">👋 Welcome back, {existingCustomer.name}!</p>
            {existingCustomer.styling_notes && <p className="text-xs text-blue-800 mt-2">Notes: {existingCustomer.styling_notes}</p>}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="barber" className="block text-sm font-semibold text-slate-900 mb-2">Barber</label>
          <select id="barber" required value={formData.barberId} onChange={(e) => setFormData({...formData, barberId: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            <option value="">Choose a barber</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-slate-900 mb-2">Date</label>
          <input id="date" type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-3">Available Times</label>
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8 px-4 bg-slate-50 rounded-lg">
            <div className="relative w-5 h-5 mr-3">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-75 animate-pulse"></div>
            </div>
            <p className="text-slate-600 text-sm">Finding available times...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">No available times for this date.</p>
            <p className="text-xs text-amber-700 mt-1">Please select a different date or barber.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableSlots.map((slot) => (
              <button key={slot.iso} type="button" onClick={() => setFormData({...formData, time: slot.display, timeISO: slot.iso})} className={`py-3 px-3 border-2 rounded-lg text-sm font-semibold transition-all ${formData.timeISO === slot.iso ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>{slot.display}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-slate-900 mb-2">Full Name</label>
          <input id="fullName" type="text" required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} placeholder="John Smith" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-slate-900 mb-2">Phone Number</label>
          <input id="phone" type="tel" required value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} placeholder="(555) 000-0000" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
        </div>
      </div>

      <button type="submit" disabled={loading || checkingEmail || !formData.timeISO} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none">
        {loading ? (
          <span className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Confirming...
          </span>
        ) : 'Confirm Appointment'}
      </button>

      <p className="text-xs text-slate-500 text-center">We'll send a confirmation email with your appointment details</p>
    </form>
  )
}
