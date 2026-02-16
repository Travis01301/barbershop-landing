const { Pool } = require('pg');
const { Resend } = require('resend');

// Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/barbershop_db'
});

const resend = new Resend(process.env.RESEND_API_KEY);

async function runReminderWorkflow() {
  const startTime = new Date();
  const results = {
    found: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    // Calculate time window: 23.5-24.5 hours from now
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    console.log(`[${new Date().toISOString()}] Starting reminder workflow`);
    console.log(`Time window: ${lowerBound.toISOString()} to ${upperBound.toISOString()}`);

    // Query: Find appointments in 24h window, confirmed, not yet reminded
    const query = `
      SELECT 
        a.id,
        a.start_time,
        a.customer_id,
        a.barber_id,
        a.status,
        a.reminder_sent_at,
        a.service_type,
        c.email as customer_email,
        c.name as customer_name,
        b.name as barber_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN barbers b ON a.barber_id = b.id
      WHERE 
        a.start_time >= $1
        AND a.start_time <= $2
        AND a.status = 'confirmed'
        AND a.reminder_sent_at IS NULL
      ORDER BY a.start_time ASC
    `;

    const res = await pool.query(query, [lowerBound, upperBound]);
    results.found = res.rows.length;

    console.log(`Found ${results.found} eligible appointments`);

    // Send reminders
    for (const appointment of res.rows) {
      try {
        const appointmentTime = new Date(appointment.start_time);
        const timeStr = appointmentTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: 'Barbershop <noreply@barbershop.app>',
          to: appointment.customer_email,
          subject: `Appointment Reminder: ${timeStr}`,
          html: `
            <h2>Your Appointment Tomorrow</h2>
            <p>Hi ${appointment.customer_name},</p>
            <p>This is a reminder about your appointment with <strong>${appointment.barber_name}</strong>.</p>
            ${appointment.service_type ? `<p><strong>Service:</strong> ${appointment.service_type}</p>` : ''}
            <p><strong>Time:</strong> ${timeStr}</p>
            <p>Please arrive 5-10 minutes early. If you need to reschedule or cancel, reply to this email.</p>
            <p>Thanks!</p>
          `
        });

        if (emailResponse.id) {
          // Update reminder_sent_at timestamp
          await pool.query(
            'UPDATE appointments SET reminder_sent_at = NOW() WHERE id = $1',
            [appointment.id]
          );
          
          // Log to audit table
          await pool.query(
            `INSERT INTO appointment_reminders 
             (appointment_id, customer_email, sent_at, status) 
             VALUES ($1, $2, NOW(), $3)`,
            [appointment.id, appointment.customer_email, 'sent']
          );
          
          results.sent++;
          console.log(`✓ Reminder sent to ${appointment.customer_email} (appt ID: ${appointment.id})`);
        } else {
          results.failed++;
          results.errors.push(`Failed to send email for appointment ${appointment.id}: no response ID`);
          console.log(`✗ Failed to send reminder for appointment ${appointment.id}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Appointment ${appointment.id}: ${error.message}`);
        console.error(`✗ Error processing appointment ${appointment.id}:`, error.message);
        
        // Log failed reminder to audit table
        try {
          await pool.query(
            `INSERT INTO appointment_reminders 
             (appointment_id, customer_email, sent_at, status, error_message) 
             VALUES ($1, $2, NOW(), $3, $4)`,
            [appointment.id, appointment.customer_email, 'failed', error.message]
          );
        } catch (auditErr) {
          console.error('Failed to log audit entry:', auditErr.message);
        }
      }
    }

    const elapsed = Math.round((new Date() - startTime) / 1000);
    console.log(`\n[${new Date().toISOString()}] Workflow completed in ${elapsed}s`);

    return results;
  } catch (error) {
    console.error('Fatal error in reminder workflow:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  } finally {
    await pool.end();
  }
}

// Run and output summary
runReminderWorkflow().then(results => {
  console.log('\n=== REMINDER WORKFLOW SUMMARY ===');
  console.log(`Found:  ${results.found}`);
  console.log(`Sent:   ${results.sent}`);
  console.log(`Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  process.exit(results.failed > 0 && results.sent === 0 ? 1 : 0);
});
