'use client';

import type { Booking } from '@/types';
import Badge from '@/components/ui/Badge';

const statusConfig = {
  pending: { label: '진행 중', color: '#FFD166' },
  confirmed: { label: '예약 확정', color: '#00FFB2' },
  cancelled: { label: '취소됨', color: '#FF6B8A' },
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const status = statusConfig[booking.status];

  return (
    <div
      className="rounded-xl p-4 mt-2"
      style={{
        background: 'var(--color-bg-panel)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
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
}
