import { Pool } from 'pg'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

async function getSignups() {
  const result = await pool.query('SELECT * FROM signups ORDER BY created_at DESC')
  return result.rows
}

export default async function AdminDashboard() {
  const signups = await getSignups()

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-black">Admin Dashboard</h1>
          <p className="text-gray-600 mb-8">Total Sign-ups: {signups.length}</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {signups.map((signup) => (
                  <tr key={signup.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{signup.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{signup.shop_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{signup.owner_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a href={`mailto:${signup.email}`} className="text-blue-600 hover:underline">
                        {signup.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a href={`tel:${signup.phone}`} className="text-blue-600 hover:underline">
                        {signup.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(signup.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {signups.length === 0 && (
            <p className="text-center text-gray-500 py-8">No sign-ups yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
