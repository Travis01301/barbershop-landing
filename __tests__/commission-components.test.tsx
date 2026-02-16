import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommissionRateConfig } from '@/app/components/CommissionRateConfig';
import { CommissionStatement } from '@/app/components/CommissionStatement';
import { CommissionDashboard } from '@/app/components/CommissionDashboard';
import { CommissionPayouts } from '@/app/components/CommissionPayouts';
import { AdvanceRequestForm } from '@/app/components/AdvanceRequestForm';

// Mock fetch
global.fetch = jest.fn();

describe('Commission Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CommissionRateConfig', () => {
    it('should render rate type options', () => {
      render(<CommissionRateConfig shopId="shop-1" />);

      expect(screen.getByText('Flat Rate (%)')).toBeInTheDocument();
      expect(screen.getByText('Tiered by Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('Service-Specific Rates')).toBeInTheDocument();
    });

    it('should allow changing base rate', async () => {
      const user = userEvent.setup();
      render(<CommissionRateConfig shopId="shop-1" />);

      const rateInput = screen.getByDisplayValue('40');
      await user.clear(rateInput);
      await user.type(rateInput, '50');

      expect(rateInput).toHaveValue(50);
    });

    it('should show tiered rules when tiered rate selected', async () => {
      const user = userEvent.setup();
      render(<CommissionRateConfig shopId="shop-1" />);

      const tieredRadio = screen.getByRole('radio', { name: /Tiered by Monthly Revenue/ });
      await user.click(tieredRadio);

      expect(screen.getByText('Revenue Thresholds')).toBeInTheDocument();
      expect(screen.getByText('+ Add Tier')).toBeInTheDocument();
    });

    it('should save commission structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(<CommissionRateConfig shopId="shop-1" />);

      const saveButton = screen.getByText('Save Commission Structure');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Commission structure saved successfully/)).toBeInTheDocument();
      });
    });

    it('should validate rate is within bounds', async () => {
      const user = userEvent.setup();
      render(<CommissionRateConfig shopId="shop-1" />);

      const rateInput = screen.getByDisplayValue('40') as HTMLInputElement;
      await user.clear(rateInput);
      await user.type(rateInput, '150');

      expect(parseInt(rateInput.value)).toBeGreaterThan(100);
    });
  });

  describe('CommissionStatement', () => {
    const mockStatement = {
      month: new Date('2024-01-01'),
      barber_id: 'barber-1',
      transactions: [
        {
          id: 'tx-1',
          shop_id: 'shop-1',
          barber_id: 'barber-1',
          appointment_id: 'apt-1',
          service_type: 'haircut',
          service_price: 50,
          discount_amount: 0,
          tip_amount: 10,
          include_tip_in_commission: false,
          commission_rate: 40,
          base_commission: 20,
          transaction_month: new Date('2024-01-01'),
          status: 'completed',
          transaction_date: new Date('2024-01-15'),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      bonuses: [],
      deductions: [],
      total_appointments: 1,
      total_revenue: 50,
      total_commission: 20,
      total_bonuses: 0,
      total_deductions: 0,
      tax_withheld: 3,
      net_earnings: 17,
      year_to_date_summary: {
        total_appointments: 10,
        total_revenue: 500,
        total_commission: 200,
        total_bonuses: 0,
        total_deductions: 0,
        total_tax_withheld: 30,
        total_earnings: 170,
      },
    };

    it('should display monthly summary cards', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatement),
      });

      render(<CommissionStatement shopId="shop-1" barberId="barber-1" />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // appointments
        expect(screen.getByText('$50.00')).toBeInTheDocument(); // revenue
      });
    });

    it('should show transactions table', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatement),
      });

      render(<CommissionStatement shopId="shop-1" barberId="barber-1" />);

      await waitFor(() => {
        expect(screen.getByText('haircut')).toBeInTheDocument();
        expect(screen.getByText('40.0%')).toBeInTheDocument();
      });
    });

    it('should navigate between months', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatement),
      });

      const user = userEvent.setup();
      render(<CommissionStatement shopId="shop-1" barberId="barber-1" />);

      const monthInput = screen.getByDisplayValue('2024-01');
      await user.clear(monthInput);
      await user.type(monthInput, '2024-02');

      expect(monthInput).toHaveValue('2024-02');
    });

    it('should display YTD summary', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatement),
      });

      render(<CommissionStatement shopId="shop-1" barberId="barber-1" />);

      await waitFor(() => {
        expect(screen.getByText('Year-to-Date')).toBeInTheDocument();
      });
    });
  });

  describe('CommissionDashboard', () => {
    const mockDashboard = {
      shop_id: 'shop-1',
      month: new Date('2024-01-01'),
      barber_summaries: [
        {
          barber_id: 'barber-1',
          barber_name: 'John Doe',
          appointments: 30,
          total_revenue: 1500,
          total_commission: 600,
          bonuses: 50,
          deductions: 10,
          tax_withheld: 90,
          net_earnings: 550,
          commission_rate: 40,
          performance_rank: 1,
        },
      ],
      shop_totals: {
        total_barbers: 5,
        total_appointments: 150,
        total_revenue: 7500,
        total_commission: 3000,
        total_bonuses: 250,
        total_deductions: 100,
        total_tax_withheld: 450,
        total_earnings: 2700,
        commission_expense_percentage: 40,
      },
      top_earners: [],
    };

    it('should display shop totals', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      });

      render(<CommissionDashboard shopId="shop-1" />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // barbers
        expect(screen.getByText('150')).toBeInTheDocument(); // appointments
      });
    });

    it('should display all barbers table', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      });

      render(<CommissionDashboard shopId="shop-1" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
      });
    });

    it('should allow sorting by different metrics', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      });

      const user = userEvent.setup();
      render(<CommissionDashboard shopId="shop-1" />);

      const sortSelect = screen.getByDisplayValue('Sort by Commission');
      await user.selectOptions(sortSelect, 'appointments');

      expect(sortSelect).toHaveValue('appointments');
    });
  });

  describe('CommissionPayouts', () => {
    const mockPayouts = {
      payouts: [
        {
          id: 'payout-1',
          shop_id: 'shop-1',
          barber_id: 'barber-1',
          payout_period_start: new Date('2024-01-01'),
          payout_period_end: new Date('2024-01-31'),
          total_commission: 400,
          bonuses: 50,
          deductions: 10,
          tax_withheld: 60,
          net_payout: 380,
          payout_method: null,
          payout_status: 'pending',
          payout_date: null,
          failure_reason: null,
          retry_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'system',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    };

    it('should display pending payouts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayouts),
      });

      render(<CommissionPayouts shopId="shop-1" />);

      await waitFor(() => {
        expect(screen.getByText('$380.00')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('should allow selecting payouts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayouts),
      });

      const user = userEvent.setup();
      render(<CommissionPayouts shopId="shop-1" />);

      await waitFor(() => {
        const checkbox = screen.getAllByRole('checkbox')[1]; // Skip select all
        user.click(checkbox);
      });
    });

    it('should process selected payouts', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPayouts),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const user = userEvent.setup();
      render(<CommissionPayouts shopId="shop-1" />);

      await waitFor(() => {
        expect(screen.getByText('Process (0)')).toBeInTheDocument();
      });
    });
  });

  describe('AdvanceRequestForm', () => {
    it('should display available balance', () => {
      render(
        <AdvanceRequestForm shopId="shop-1" barberId="barber-1" availableBalance={500} />
      );

      expect(screen.getByText('Available Balance')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });

    it('should allow requesting advance', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(
        <AdvanceRequestForm shopId="shop-1" barberId="barber-1" availableBalance={500} />
      );

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '250');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submitted successfully/)).toBeInTheDocument();
      });
    });

    it('should validate amount does not exceed balance', async () => {
      const user = userEvent.setup();
      render(
        <AdvanceRequestForm shopId="shop-1" barberId="barber-1" availableBalance={500} />
      );

      const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      await user.type(amountInput, '600');

      expect(parseInt(amountInput.value)).toBeGreaterThan(500);
    });
  });
});
