import { Pool } from 'pg'
import BookingForm from './BookingForm'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const shopResult = await pool.query('SELECT * FROM shops WHERE slug = $1', [slug])
  const shop = shopResult.rows[0]

  if (!shop) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Shop not found</div>
  }

  const barbersResult = await pool.query(
    'SELECT id, name FROM users WHERE shop_id = $1 AND role = $2',
    [shop.id, 'barber']
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{shop.name}</h1>
              <p className="text-sm text-slate-600 mt-1">📍 {shop.phone}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                ✓ Available Today
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Quick Info</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Barbers</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{barbersResult.rows.length}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold">Duration</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">30 minutes</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Confirmation</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">Instant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 lg:p-10">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Book Your Appointment</h2>
                <p className="text-slate-600">Select your preferred barber and time slot below</p>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <BookingForm shopId={shop.id} barbers={barbersResult.rows} shopName={shop.name} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
