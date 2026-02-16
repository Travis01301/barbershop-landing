import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const log = logger.createChild('api.public.bookings.create');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    const body = await request.json();
    const {
      slug,
      barberId,
      serviceId,
      scheduledDate,
      customerEmail,
      customerPhone,
      customerName,
      stylingNotes,
      stylePhotoUrl,
      firstTimeCustomer,
      promoCode,
      addOns,
    } = body;

    // Get shop
    const shopResult = await query(
      'SELECT id, name, phone, address FROM shops WHERE portal_slug = $1 AND portal_enabled = true',
      [slug]
    );

    if (shopResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    const shop = shopResult.rows[0];

    // Validate barber
    const barberResult = await query(
      'SELECT id, name FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, shop.id, 'barber']
    );

    if (barberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Barber not found' },
        { status: 404 }
      );
    }

    // Validate service
    const serviceResult = await query(
      'SELECT id, price_cents, duration_minutes FROM barber_services WHERE id = $1 AND shop_id = $2',
      [serviceId, shop.id]
    );

    if (serviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    const service = serviceResult.rows[0];
    const depositAmountCents = 1000; // $10 deposit
    let totalAmountCents = service.price_cents;

    // Apply promo code if provided
    let promoCodeId: number | null = null;
    let discountPercent = 0;

    if (promoCode) {
      const promoResult = await query(
        `SELECT id, discount_percent, max_uses, used_count, expires_at, is_active
         FROM promo_codes
         WHERE code = $1 AND is_active = true`,
        [promoCode.toUpperCase()]
      );

      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];
        if (new Date(promo.expires_at) > new Date() && (!promo.max_uses || promo.used_count < promo.max_uses)) {
          promoCodeId = promo.id;
          discountPercent = promo.discount_percent;
          totalAmountCents = Math.ceil(service.price_cents * (1 - discountPercent / 100));
        }
      }
    }

    // Generate booking token
    const bookingToken = uuidv4().substring(0, 32);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create payment intent for deposit
    let paymentIntentId: string | null = null;
    if (depositAmountCents > 0) {
      try {
        const intent = await stripe.paymentIntents.create({
          amount: depositAmountCents,
          currency: 'usd',
          metadata: {
            shop_id: shop.id.toString(),
            customer_email: customerEmail,
          },
          receipt_email: customerEmail,
        });
        paymentIntentId = intent.id;
      } catch (error) {
        log.error('Failed to create payment intent', error);
        return NextResponse.json(
          { success: false, error: 'Payment setup failed' },
          { status: 500 }
        );
      }
    }

    // Create portal booking
    const bookingResult = await query(
      `INSERT INTO portal_bookings (
        shop_id, customer_email, customer_phone, customer_name,
        barber_id, service_id, scheduled_date, estimated_duration_minutes,
        deposit_amount_cents, total_amount_cents, payment_status,
        stripe_payment_intent_id, styling_notes, first_time_customer,
        style_photo_url, booking_token, token_expires_at,
        created_from_ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        shop.id,
        customerEmail,
        customerPhone,
        customerName,
        barberId,
        serviceId,
        new Date(scheduledDate),
        service.duration_minutes,
        depositAmountCents,
        totalAmountCents,
        'pending',
        paymentIntentId,
        stylingNotes || null,
        firstTimeCustomer,
        stylePhotoUrl || null,
        bookingToken,
        tokenExpiresAt,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
        request.headers.get('user-agent') || null,
      ]
    );

    const portalBooking = bookingResult.rows[0];

    // Increment promo code usage if applied
    if (promoCodeId) {
      await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promoCodeId]);
    }

    // Send confirmation email
    try {
      const scheduledTime = new Date(scheduledDate);
      const dateStr = scheduledTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = scheduledTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      await resend.emails.send({
        from: 'noreply@barbershop.com',
        to: customerEmail,
        subject: `Booking Confirmation - ${shop.name}`,
        html: `
          <h2>Booking Confirmed!</h2>
          <p>Hi ${customerName},</p>
          <p>Your appointment has been confirmed at <strong>${shop.name}</strong>.</p>
          
          <h3>Appointment Details:</h3>
          <ul>
            <li><strong>Date:</strong> ${dateStr}</li>
            <li><strong>Time:</strong> ${timeStr}</li>
            <li><strong>Barber:</strong> ${barberResult.rows[0].name}</li>
            <li><strong>Service:</strong> ${service.name}</li>
            <li><strong>Location:</strong> ${shop.address}</li>
          </ul>
          
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-bookings?token=${bookingToken}">
              Manage Your Booking
            </a>
          </p>
          
          <p>Questions? Call us at ${shop.phone}</p>
        `,
      });
    } catch (error) {
      log.warn('Failed to send confirmation email', error);
    }

    // Track analytics
    await query(
      `INSERT INTO portal_analytics (shop_id, event_type, session_id, step_name)
       VALUES ($1, $2, $3, $4)`,
      [shop.id, 'checkout_completed', bookingToken, 'payment']
    );

    log.info('Portal booking created', {
      portalBookingId: portalBooking.id,
      shopId: shop.id,
      customerId: customerEmail,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: portalBooking.id,
        token: bookingToken,
        paymentIntentId,
        depositAmount: depositAmountCents / 100,
        totalAmount: totalAmountCents / 100,
        clientSecret: paymentIntentId, // Will be fetched via Stripe
      },
    });
  } catch (error) {
    log.error('Failed to create booking', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
