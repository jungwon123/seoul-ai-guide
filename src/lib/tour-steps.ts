// 기능 안내(코치마크) 투어 스텝 정의.
// 새 기능 추가 = 이 배열에 한 줄 + 대상 요소에 data-tour="<id>" 속성 하나.
// target 은 CSS 셀렉터(주로 [data-tour="..."]). placement 는 말풍선 위치.

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: TourPlacement;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'chat-input',
    target: '[data-tour="chat-input"]',
    title: '무엇이든 물어보세요',
    body: '가고 싶은 곳, 일정, 분위기를 자연어로 말하면 AI 에이전트가 서울 여행을 설계해요.',
    placement: 'top',
  },
  {
    id: 'attach',
    target: '[data-tour="attach"]',
    title: '사진으로 찾기',
    body: '마음에 드는 장소 사진을 올리면 비슷한 분위기의 장소를 찾아드려요.',
    placement: 'top',
  },
  {
    id: 'nav-map',
    target: '[data-tour="nav-map"]',
    title: '지도에서 보기',
    body: '추천받은 장소와 코스를 지도에서 한눈에 확인하고, 경로를 따라가 볼 수 있어요.',
    placement: 'bottom',
  },
  {
    id: 'nav-bookmark',
    target: '[data-tour="nav-bookmark"]',
    title: '북마크',
    body: '마음에 든 장소나 대화를 저장해 두고 언제든 다시 꺼내 보세요.',
    placement: 'bottom',
  },
  {
    id: 'nav-calendar',
    target: '[data-tour="nav-calendar"]',
    title: '일정',
    body: '완성한 코스를 일정으로 정리하고 캘린더(.ics)로 내보낼 수 있어요.',
    placement: 'bottom',
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: '대화 내역',
    body: '이전 대화와 추천 기록을 여기서 다시 볼 수 있어요.',
    placement: 'bottom',
  },
];
