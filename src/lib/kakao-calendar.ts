import type { Itinerary } from '@/types';

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

// Kakao OAuth - 클라이언트 사이드에서 카카오 로그인 후 access_token을 받아서 사용
// Phase 1에서는 .ics 다운로드 + 카카오톡 공유로 대체

/**
 * ICS 파일 생성 및 다운로드
 */
export function downloadICS(itinerary: Itinerary) {
  const events = itinerary.stops
    .map((stop) => {
      const [hours, minutes] = stop.arrivalTime.split(':').map(Number);
      const startDate = new Date(itinerary.date);
      startDate.setHours(hours, minutes, 0);
      const endDate = new Date(startDate.getTime() + stop.duration * 60000);

      const formatICSDate = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      return `BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${stop.placeName}
DESCRIPTION:${itinerary.title} - ${stop.order}번째 방문
END:VEVENT`;
    })
    .join('\n');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Seoul AI Guide//KR
CALSCALE:GREGORIAN
${events}
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${itinerary.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 카카오톡 캘린더에 일정 생성 (서버 사이드)
 * access_token이 필요하므로 카카오 로그인 연동 후 사용
 */
export async function createKakaoCalendarEvent(
  accessToken: string,
  itinerary: Itinerary,
) {
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
    location: {
      name: firstStop.placeName,
      latitude: 0, // Would need place data
      longitude: 0,
    },
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
    throw new Error(`Kakao Calendar API error: ${res.status}`);
  }

  return res.json();
}

/**
 * 카카오 로그인 URL 생성 (캘린더 권한 포함)
 */
export function getKakaoLoginUrl() {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const redirectUri = `${window.location.origin}/api/auth/kakao/callback`;
  const scope = 'talk_calendar';
  return `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}

// REST API Key는 서버사이드에서만 사용
export { KAKAO_REST_KEY };
