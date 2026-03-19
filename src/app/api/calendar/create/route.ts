import { NextRequest, NextResponse } from 'next/server';
import type { Itinerary } from '@/types';

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('kakao_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Kakao' }, { status: 401 });
  }

  const { itinerary } = (await request.json()) as { itinerary: Itinerary };

  const firstStop = itinerary.stops[0];
  const lastStop = itinerary.stops[itinerary.stops.length - 1];

  const [startH, startM] = firstStop.arrivalTime.split(':').map(Number);
  const startDate = new Date(itinerary.date);
  startDate.setHours(startH, startM, 0);

  const [endH, endM] = lastStop.arrivalTime.split(':').map(Number);
  const endDate = new Date(itinerary.date);
  endDate.setHours(endH, endM + lastStop.duration, 0);

  const event = {
    title: itinerary.title,
    time: {
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      time_zone: 'Asia/Seoul',
    },
    description: itinerary.stops
      .map((s) => `${s.arrivalTime} ${s.placeName} (${s.duration}분)`)
      .join('\n'),
  };

  const res = await fetch('https://kapi.kakao.com/v2/api/calendar/create/event', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ event: JSON.stringify(event) }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ success: true, eventId: data.event_id });
}
