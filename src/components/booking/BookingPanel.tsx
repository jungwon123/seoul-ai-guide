'use client';

import { Ticket } from 'lucide-react';
import bookingsData from '@/mocks/bookings.json';
import type { Booking } from '@/types';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const bookings = bookingsData as Booking[];

const statusConfig = {
  pending: { label: '진행 중', color: '#E8700A' },
  confirmed: { label: '예약 확정', color: '#19A97B' },
  cancelled: { label: '취소됨', color: '#D9534F' },
};

export default function BookingPanel() {
  if (bookings.length === 0) {
    return <EmptyState icon={Ticket} title="예약 없음" description="에이전트에게 예약을 요청해보세요" />;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {bookings.map((booking) => {
        const status = statusConfig[booking.status];
        return (
          <div key={booking.id} className="bg-bg-surface border border-border rounded-xl p-3.5 animate-fade-up hover:border-border-strong hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[14px] font-semibold text-text-primary">{booking.placeName}</h4>
              <Badge color={status.color}>{status.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[12px] text-text-secondary">
              <div>{booking.date}</div>
              <div>{booking.time}</div>
              <div>{booking.partySize}명</div>
              <div className="text-text-muted">#{booking.confirmationNumber}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
