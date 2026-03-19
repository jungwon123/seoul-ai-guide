'use client';

import bookingsData from '@/mocks/bookings.json';
import type { Booking } from '@/types';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const bookings = bookingsData as Booking[];

const statusConfig = {
  pending: { label: '진행 중', color: '#FFD166' },
  confirmed: { label: '예약 확정', color: '#4FFFB0' },
  cancelled: { label: '취소됨', color: '#FF6B6B' },
};

export default function BookingPanel() {
  if (bookings.length === 0) {
    return (
      <EmptyState
        emoji="🎟"
        title="예약 없음"
        description="에이전트에게 예약을 요청해보세요"
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
            className="bg-bg-secondary border border-border-default rounded-xl p-4 animate-fade-in-up hover:border-border-active transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text-primary text-sm">{booking.placeName}</h4>
              <Badge color={status.color}>{status.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>📅 {booking.date}</div>
              <div>🕐 {booking.time}</div>
              <div>👥 {booking.partySize}명</div>
              <div>🔖 {booking.confirmationNumber}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
