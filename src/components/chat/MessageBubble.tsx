'use client';

import type { Message } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';
import PlaceCard from './PlaceCard';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agentColor = message.agent ? AGENT_COLORS[message.agent] : '#7C3AED';

  return (
    <div className="animate-message">
      {isUser ? (
        <div className="flex justify-end pl-12">
          <div className="bg-brand-subtle border border-brand/[0.08] rounded-[16px] rounded-br-[4px] px-4 py-3 text-[14px] leading-[1.6] text-text-primary">
            {message.text}
          </div>
        </div>
      ) : (
        <div className="flex gap-3 pr-12">
          {/* Agent avatar */}
          <div
            className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
            style={{
              backgroundColor: `${agentColor}08`,
              color: agentColor,
              border: `1px solid ${agentColor}15`,
            }}
          >
            {message.agent?.[0]?.toUpperCase() || 'A'}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="text-[14px] leading-[1.7] text-text-primary tracking-[-0.006em]">
              {message.text}
            </div>

            {message.places && message.places.length > 0 && (
              <div className="grid gap-2 stagger-children">
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
