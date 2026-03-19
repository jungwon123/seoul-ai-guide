'use client';

import bookingsData from '@/mocks/bookings.json';
import type { Booking } from '@/types';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const bookings = bookingsData as Booking[];

const TICKET_ICON = 'M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z';

const statusConfig = {
  pending: { label: '진행 중', color: '#FFD166' },
  confirmed: { label: '예약 확정', color: '#00FFB2' },
  cancelled: { label: '취소됨', color: '#FF6B8A' },
};

export default function BookingPanel() {
  if (bookings.length === 0) {
    return (
      <EmptyState
        iconPath={TICKET_ICON}
        title="예약 없음"
        description="에이전트에게 예약을 요청해보세요"
        color="#9B6DFF"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {bookings.map((booking) => {
        const status = statusConfig[booking.status];
        return (
          <div
            key={booking.id}
            className="rounded-xl p-4 animate-message-in hover:border-border-active transition-colors"
            style={{
              background: 'var(--color-bg-panel)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-text-primary text-sm" style={{ fontFamily: 'var(--font-display)' }}>{booking.placeName}</h4>
              <Badge color={status.color}>{status.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>📅 {booking.date}</div>
              <div>🕐 {booking.time}</div>
              <div>👥 {booking.partySize}명</div>
              <div style={{ color: 'var(--color-text-muted)' }}>#{booking.confirmationNumber}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
