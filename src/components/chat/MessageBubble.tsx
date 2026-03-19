'use client';

import type { Message } from '@/types';
import { AGENT_CONFIG, cn } from '@/lib/utils';
import PlaceCard from './PlaceCard';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agentConfig = message.agent ? AGENT_CONFIG[message.agent] : null;

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-in-up',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      {!isUser && agentConfig && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: agentConfig.color }}
        >
          {agentConfig.label[0]}
        </div>
      )}

      {/* Bubble */}
      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-brand-secondary text-white rounded-2xl rounded-br-sm'
              : 'bg-bg-elevated text-text-primary rounded-2xl rounded-tl-sm',
          )}
        >
          {message.text}
        </div>

        {/* Inline place cards */}
        {message.places && message.places.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}

        {/* Inline itinerary */}
        {message.itinerary && (
          <ItineraryCard itinerary={message.itinerary} />
        )}

        {/* Inline booking */}
        {message.booking && (
          <BookingCard booking={message.booking} />
        )}
      </div>
    </div>
  );
}
