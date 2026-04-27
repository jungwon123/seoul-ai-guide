# Lottie Animations

이 폴더에 `.json` 형식의 Lottie 파일을 드롭하면 앱이 자동으로 집어 씁니다.
파일이 없으면 각 컴포넌트의 **fallback(기존 아이콘/스피너)** 가 보여지므로 안전합니다.

## 필요한 파일 목록

| 파일명 | 용도 | 권장 스타일 | 사용 위치 |
|---|---|---|---|
| `loading.json` | 일반 로딩 스피너 | 작고 무한 루프 (도트 3개, 미니멀) | `App.tsx` 오버레이 전환 |
| `loading-3d.json` | 3D 지도 로딩 | 지구/큐브 회전 | `MapPanel.tsx` 3D 버튼 전환 |
| `empty-place.json` | 빈 장소 북마크 | 지도/핀 빈 상태 | `BookmarkPanel` 장소 탭 |
| `empty-message.json` | 빈 대화 북마크 | 말풍선/책갈피 | `BookmarkPanel` 담화 탭 |
| `success.json` | 온보딩 완료 축하 | 체크마크 / 컨페티 (짧게 1회) | `OnboardingFlow` 완료 단계 |

## 어디서 받나

1. **LottieFiles** (무료 계정) — https://lottiefiles.com
   - 검색어: `loading dots`, `empty state`, `success check`, `confetti`
   - "Download → Lottie JSON" 클릭 → `.json` 다운로드

2. **IconScout Lottie** — https://iconscout.com/lotties
3. **LordIcon** — https://lordicon.com (일부 무료)

## 스타일 가이드

- **컬러**: 브랜드 `#2563EB` 톤, 또는 무채색(회색) 계열이 가장 잘 맞음
- **크기**: 정사각형 비율 (1:1) 추천
- **지속**: 로딩 = 무한 루프 / 성공 = 1.5~2초 내 끝남
- **무게**: JSON 파일 50KB 이하. 그 이상은 애니메이션을 줄이거나 [dotLottie](https://dotlottie.io) 형식 고려

## 파일 교체 / 추가

```tsx
import LottiePlayer from '@/components/ui/LottiePlayer';

<LottiePlayer
  src="/animations/my-animation.json"
  className="w-32 h-32"
  fallback={<div>로딩…</div>}
/>
```

파일이 없어도 앱이 정상 동작합니다. 있으면 자동으로 Lottie 렌더링.
