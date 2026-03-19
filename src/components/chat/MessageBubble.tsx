'use client';

import type { Message } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';
import PlaceCard from './PlaceCard';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agentColor = message.agent ? AGENT_COLORS[message.agent] : '#7C5CBF';

  return (
    <div className="animate-message">
      {isUser ? (
        /* User message */
        <div className="flex justify-end">
          <div
            className="max-w-[75%] rounded-[14px] rounded-br-[4px] px-3.5 py-2.5 text-[14px] leading-[1.55] text-text-primary"
            style={{
              background: 'var(--color-brand-subtle)',
              border: '1px solid rgba(28,110,242,0.12)',
            }}
          >
            {message.text}
          </div>
        </div>
      ) : (
        /* Agent message */
        <div className="flex gap-2.5 items-start px-0">
          <div
            className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center text-[12px] font-semibold text-text-secondary shrink-0"
            style={{ color: agentColor }}
          >
            {message.agent?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0 pt-1 space-y-2">
            <div className="text-[14px] leading-[1.65] text-text-primary">
              {message.text}
            </div>

            {message.places && message.places.length > 0 && (
              <div className="space-y-2 mt-3">
                {message.places.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            )}

            {message.itinerary && <ItineraryCard itinerary={message.itinerary} />}
            {message.booking && <BookingCard booking={message.booking} />}
          </div>
        </div>
      )}
    </div>
  );
}
