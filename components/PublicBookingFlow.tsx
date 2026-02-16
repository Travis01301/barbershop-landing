'use client';

import { useState } from 'react';
import { BarberSelector } from './BarberSelector';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ServiceSelector } from './ServiceSelector';
import { CustomerForm } from './CustomerForm';
import { PaymentForm } from './PaymentForm';
import { ConfirmationScreen } from './ConfirmationScreen';
import { ShopDisplay } from './ShopDisplay';

type Step = 'barber' | 'service' | 'time' | 'customer' | 'payment' | 'confirmation';

interface PublicBookingFlowProps {
  shopSlug: string;
  shopId: number;
}

export function PublicBookingFlow({ shopSlug, shopId }: PublicBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('barber');
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [bookingToken, setBookingToken] = useState<string>('');

  const handleBarberSelect = (barber: any) => {
    setSelectedBarber(barber);
    setCurrentStep('service');
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setCurrentStep('time');
  };

  const handleTimeSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStep('customer');
  };

  const handleCustomerInfo = (info: any) => {
    setCustomerInfo(info);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (booking: any, token: string) => {
    setBooking(booking);
    setBookingToken(token);
    setCurrentStep('confirmation');
  };

  const handleReschedule = () => {
    setCurrentStep('barber');
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setCustomerInfo(null);
    setBooking(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <ShopDisplay shopSlug={shopSlug} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentStep === 'barber' && (
          <BarberSelector
            shopSlug={shopSlug}
            shopId={shopId}
            onSelect={handleBarberSelect}
          />
        )}

        {currentStep === 'service' && selectedBarber && (
          <ServiceSelector
            shopSlug={shopSlug}
            shopId={shopId}
            barberId={selectedBarber.id}
            onSelect={handleServiceSelect}
            onBack={() => setCurrentStep('barber')}
          />
        )}

        {currentStep === 'time' && selectedBarber && selectedService && (
          <TimeSlotPicker
            shopSlug={shopSlug}
            barberId={selectedBarber.id}
            serviceId={selectedService.id}
            onSelect={handleTimeSelect}
            onBack={() => setCurrentStep('service')}
          />
        )}

        {currentStep === 'customer' && (
          <CustomerForm
            onSubmit={handleCustomerInfo}
            onBack={() => setCurrentStep('time')}
            defaultEmail=""
          />
        )}

        {currentStep === 'payment' && customerInfo && (
          <PaymentForm
            shopSlug={shopSlug}
            barberId={selectedBarber.id}
            serviceId={selectedService.id}
            scheduledDate={selectedDate}
            customerInfo={customerInfo}
            onSuccess={handlePaymentSuccess}
            onBack={() => setCurrentStep('customer')}
          />
        )}

        {currentStep === 'confirmation' && booking && (
          <ConfirmationScreen
            booking={booking}
            bookingToken={bookingToken}
            barber={selectedBarber}
            service={selectedService}
            shopSlug={shopSlug}
            onReschedule={handleReschedule}
          />
        )}
      </div>
    </div>
  );
}
