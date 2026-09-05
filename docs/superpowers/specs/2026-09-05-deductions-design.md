# Deductions + Server 섹션 설계 (v1.1.0)

작성: 2026-09-05

## 목표

수집된 신호를 탐정처럼 읽어 **기기 모델, 메모리, 디스플레이 연결, 책상 환경, 위치, 언어, 연결 거리**를
추리하고, 각 결론에 **근거로 쓴 행**을 함께 보여준다. 위치는 IP 기반으로 서버가 본 것을
되돌려 주는 작은 함수 하나로 얻는다. 핵심 메시지는 그대로다: 권한을 하나도 주지 않아도
브라우저와 요청 자체가 이만큼 말해 준다.

## 원칙 (변경분 포함)

- 수집한 데이터는 어디에도 보내지 않는다. 서버 함수는 **요청 헤더를 되돌려 줄 뿐** 아무것도 받지 않고 저장하지 않는다.
- permission dialog를 띄우는 API는 여전히 쓰지 않는다. Geolocation 권한 없이 IP 도시가 나오는 것이 "No location" 칩의 반전이다.
- 추리는 규칙과 데이터 표로만 한다. 머신러닝 없음, 외부 API 없음, GeoIP DB 없음.
- 모든 결론은 INFERRED이며 근거 키 목록을 가진다. 필요한 행이 없으면 규칙은 조용히 빠진다.
- Server, Deductions 섹션은 composite 카테고리 밖이다. composite는 이 변경으로 바뀌지 않는다.

## 비목표

- ISP/ASN(외부 조회 필요), 모니터 연결 방식(HDMI/TB), 노트북 패널 병행 사용 여부(다른 화면은 안 보임), PC 제품명, M5 Pro/Max 세대 표.
- 사용자가 배율을 바꾼 Retina 디스플레이의 패널 식별(폴백 문구로 내려감).

## 구성 요소와 데이터 흐름

```
api/where.ts                  Vercel Function. 요청 헤더 → JSON. 저장/로그 없음. 의존성 0.
src/collectors/where.ts       "Server" 섹션. /api/where 1회 fetch(3 s 타임아웃). 실패 시 이유 있는 UNAVAILABLE.
src/deduce/tables.ts          데이터만: APPLE_CHIPS, PANELS, GPU_CLASSES.
src/deduce/rules.ts           RULES: Rule[] + deduce(sections): Deduction[]. tables.ts를 확장자 붙여 import.
src/deduce/rules.test.ts      fixtures/*.json 전부 + 인라인 최소 섹션 케이스.
src/deduce/fixtures/*.json    실기기 Export + 기대 부분 문자열. 첫 파일: mac-m4pro-chrome.json.
src/collectors/deductions.ts  "Deductions" 섹션. deduce() 결과를 INFERRED 행으로.
src/types.ts                  CollectorResult.evidence?: string[] 추가.
src/ui/render.ts              evidence 흐린 줄 렌더. renderHero가 Verdict를 #hero .verdict에.
src/main.ts                   COLLECTORS에 Server(Network 다음). collected → Fingerprint → Deductions 순.
index.html                    #hero에 <p class="verdict">. 히어로 요약/푸터 문구 수정.
tsconfig.json                 allowImportingTsExtensions: true, include에 api 추가.
```

흐름: 수집기 13개 + Server가 `Promise.all`로 동시에 → `collectFingerprint(collected)` →
`collectDeductions(collected)` → 섹션 순서 `Fingerprint, Deductions, Environment, CPU, Memory, Storage,
Display, Input, WebGL, WebGPU, Rendering, Audio, Media, Network, Server, Browser APIs` → render → renderHero.

## 서버 함수 `api/where.ts`

```ts
export function GET(request: Request): Response {
  const h = (name: string) => request.headers.get(name) ?? undefined;
  const city = h("x-vercel-ip-city");
  return Response.json(
    {
      ip: h("x-forwarded-for")?.split(",")[0].trim(),
      country: h("x-vercel-ip-country"),
      region: h("x-vercel-ip-country-region"),
      city: city && decodeURIComponent(city),
      latitude: h("x-vercel-ip-latitude"),
      longitude: h("x-vercel-ip-longitude"),
      timezone: h("x-vercel-ip-timezone"),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
```

- Vercel이 `api/` 폴더를 자동으로 Node Function으로 배포한다. Vite dev/preview는 이 경로를 모른다.
- Hobby 플랜 기본 리전(iad1)에서 실행된다. 엣지 리전은 응답 헤더 `x-vercel-id`의 첫 토큰이다.
- 리스크: Web 시그니처가 이 프로젝트 설정에서 안 잡히면 `export default function handler(req, res)`
  형태로 바꿔 재배포한다. 그동안 페이지는 Server 행만 UNAVAILABLE인 채 정상 동작한다.

## Server 수집기 `src/collectors/where.ts`

- `fetch("/api/where", { signal: AbortSignal.timeout(3000) })`.
- `res.ok`가 아니거나 `content-type`에 `json`이 없으면, 또는 예외/타임아웃이면 모든 행을
  `unavailable(name, "no server behind this build; deployed on Vercel it answers")`로. 절대 throw하지 않는다.
- 행: `IP address`(DIRECT), `Country`, `Region`, `City`, `Coordinates`(위도, 경도 소수 둘째 자리),
  `IP timezone`(이상 COARSE), `Edge region`(`x-vercel-id` 첫 토큰, DIRECT). 없는 필드는 `result()`가 UNAVAILABLE로 만든다.
- note: "What the request itself told the server before any script ran: the address the reply had to
  reach, and the city Vercel's edge attaches to that address. The page's code keeps none of it, and
  still sends none of what it collected."

## 데이터 표 `src/deduce/tables.ts`

제품 이름은 두 표에서 같은 문자열을 쓴다(`MacBook Pro 14`, `Mac mini` …). 교집합은 이름으로 한다.

### APPLE_CHIPS `{ chip, cores, products, minRam }`

| 칩 | 코어 | 제품 | 최소 RAM |
|---|---|---|---|
| M1 | 8 | MacBook Air 13, MacBook Pro 13, Mac mini, iMac 24 | 8 |
| M1 Pro | 8 | MacBook Pro 14 | 16 |
| M1 Pro | 10 | MacBook Pro 14, MacBook Pro 16 | 16 |
| M1 Max | 10 | MacBook Pro 14, MacBook Pro 16, Mac Studio | 32 |
| M1 Ultra | 20 | Mac Studio | 64 |
| M2 | 8 | MacBook Air 13, MacBook Air 15, MacBook Pro 13, Mac mini | 8 |
| M2 Pro | 10 | MacBook Pro 14, Mac mini | 16 |
| M2 Pro | 12 | MacBook Pro 14, MacBook Pro 16, Mac mini | 16 |
| M2 Max | 12 | MacBook Pro 14, MacBook Pro 16, Mac Studio | 32 |
| M2 Ultra | 24 | Mac Studio, Mac Pro | 64 |
| M3 | 8 | MacBook Air 13, MacBook Air 15, MacBook Pro 14, iMac 24 | 8 |
| M3 Pro | 11 | MacBook Pro 14 | 18 |
| M3 Pro | 12 | MacBook Pro 14, MacBook Pro 16 | 18 |
| M3 Max | 14 | MacBook Pro 14, MacBook Pro 16 | 36 |
| M3 Max | 16 | MacBook Pro 14, MacBook Pro 16 | 36 |
| M3 Ultra | 28 | Mac Studio | 96 |
| M3 Ultra | 32 | Mac Studio | 96 |
| M4 | 8 | iMac 24 | 16 |
| M4 | 10 | MacBook Air 13, MacBook Air 15, MacBook Pro 14, Mac mini, iMac 24 | 16 |
| M4 Pro | 12 | MacBook Pro 14, Mac mini | 24 |
| M4 Pro | 14 | MacBook Pro 14, MacBook Pro 16, Mac mini | 24 |
| M4 Max | 14 | MacBook Pro 14, MacBook Pro 16, Mac Studio | 36 |
| M4 Max | 16 | MacBook Pro 14, MacBook Pro 16, Mac Studio | 36 |
| M5 | 10 | MacBook Pro 14 | 16 |

검토 필요: M3 Pro 최소 RAM 18, M4 iMac 8코어, M5 행. M5 Pro/Max는 넣지 않고 폴백에 맡긴다.

### PANELS `{ width, height, products }` (기본 배율의 논리 해상도)

| 논리 해상도 | 제품 |
|---|---|
| 1440×900 | MacBook Air 13, MacBook Pro 13 |
| 1470×956 | MacBook Air 13 |
| 1710×1112 | MacBook Air 15 |
| 1512×982 | MacBook Pro 14 |
| 1728×1117 | MacBook Pro 16 |
| 2240×1260 | iMac 24 |
| 2560×1440 | Studio Display |
| 3008×1692 | Pro Display XDR |

### GPU_CLASSES `{ pattern, kind }` (순서대로 첫 매치)

| pattern | kind | 결론 |
|---|---|---|
| `SwiftShader\|llvmpipe\|Basic Render Driver` | software | software rendering: a VM, remote desktop, or headless browser |
| `Laptop GPU\|Max-Q\|Mobile` | laptop | a laptop with a discrete GPU |
| `GeForce\|Radeon RX\|Radeon Pro\|Arc [AB]\d\|Quadro` | discrete | a desktop or gaming laptop |
| `Iris\|UHD Graphics\|HD Graphics\|Radeon Graphics\|Radeon Vega\|Arc Graphics\|Adreno` | integrated | a laptop or small-form-factor PC |

## 규칙 `src/deduce/rules.ts`

```ts
export interface Deduction { name: string; value: string; evidence: string[] }
type Get = (key: string) => unknown;               // "Section/Signal" → value (없으면 undefined)
type Rule = (get: Get) => Deduction | undefined;
export function deduce(sections: Section[]): Deduction[]  // RULES 순서대로, 마지막에 Verdict를 맨 앞에
```

행 이름과 규칙 (필요한 행이 없으면 규칙은 빠진다):

1. **Verdict** — Machine의 제품 목록과 Display의 패널 제품을 교집합해 한 문장.
   "Probably a Mac mini or a docked MacBook Pro 14 (M4 Pro, 24 GB+) on an external 1080p monitor, in Seoul, KR."
   외장 모니터면 노트북 제품 앞에 "docked". Machine 결론이 없으면 "a Windows machine"처럼 OS 이름을 쓴다(OS도 없으면 "a computer").
2. **Machine**
   - `WebGL/Unmasked renderer` ~ `/Apple (M\d+)( Pro| Max| Ultra)?/` → 칩. `CPU/Logical processors`로 APPLE_CHIPS 조회.
     → "Apple M4 Pro, the 12-core variant — sold as MacBook Pro 14 or Mac mini". 표에 없으면
     "Apple M5 Pro — newer than this page's table".
   - renderer가 `Apple GPU`이고 `Environment/OS`가 macOS → "a Mac, most likely Apple Silicon; Safari masks the chip and caps the core count at 8".
   - `Environment/Platform (legacy)`가 MacIntel이고 `Input/Touch points` > 0 → "an iPad asking to be treated as a Mac".
   - `Environment/Mobile`이 true 또는 `Form factors`에 Mobile/Tablet → `Environment/Model`이 있으면
     "Android phone, model SM-S928B", UA에 iPhone/iPad면 "iPhone; Safari names no model".
   - 그 외: renderer에서 모델명 추출(`ANGLE (vendor, MODEL (0x…) Direct3D11 …, D3D11)` → MODEL; Mesa 접두/괄호 제거).
     GPU_CLASSES 매치가 `software`(SwiftShader 등)면 macOS를 포함해 OS와 무관하게 즉시 "macOS: software rendering: a VM, remote desktop, or headless browser (모델명)"처럼 반환.
     그 외 macOS는 모델명에 Intel/AMD/Radeon이 있을 때만 "an Intel-era Mac with 모델명", 없으면 "a Mac with 모델명".
     그 외 OS는 첫 매치 → "Windows: a laptop with a discrete GPU (NVIDIA GeForce RTX 4070 Laptop GPU)". 매치 없으면 "PC with <모델명>".
   - evidence: WebGL/Unmasked renderer, CPU/Logical processors, Environment/OS (+ 쓴 것만).
3. **Memory** — `Memory/Reported device memory` 버킷(GB)과 Machine이 찾은 minRam 중 큰 값.
   "24 GB or more — Chrome only admits ≥16 GB, but this chip never ships with less than 24 GB". 표 매치가 없으면
   버킷만으로 "16 GB or more", 버킷도 없으면(Firefox/Safari) minRam만으로 "24 GB or more — this chip ships with no less",
   둘 다 없으면 규칙이 빠진다.
4. **Display** — `Display/Resolution`, `Device pixel ratio`, `Color gamut`. macOS: DPR 1 또는 srgb →
   "an external non-Apple monitor, 1920×1080 at native 1×"; DPR 2 + p3 → PANELS 조회 "the MacBook Pro 14 panel, 1512×982 at 2× — Retina, P3";
   표에 없으면 "a Retina P3 display at a custom scaling". Windows/Linux: DPR ≠ 1이면 "a 2560×1440 screen scaled at 150%", 아니면 "a 1920×1080 screen at 100%".
5. **Desk** — `Display/Available`, `Resolution`, `Window outer size`. macOS: 높이 차 ≤ 40 → "no Dock on this screen: hidden, or on another display",
   > 40 → "Dock at the bottom"; 너비 차 > 0 → "Dock on the left or right". 창 바깥 크기 ≥ 사용 가능 영역 →
   "the browser fills the screen", 아니면 "windowed, 1200×800 of 1920×1050".
6. **Where** — `Server/City`, `Server/Country`, `Server/IP timezone` vs `Environment/Timezone`. 같으면
   "Seoul, South Korea by IP address; the browser clock agrees (Asia/Seoul), so no sign of a VPN or proxy". 다르면
   "the clock says Asia/Seoul but the IP sits in America/Los_Angeles — VPN, proxy, or travelling".
   Server가 없으면 "IP location unavailable here; the clock says Asia/Seoul".
7. **Languages** — `Environment/Languages`를 `Intl.DisplayNames`(node에도 있음)로 이름화, 기본 언어 중복 제거.
   "browser in American English; also reads Korean and Japanese". 첫 언어의 지역이 IP 국가와 다르면
   "browser in American English; also reads Korean and Japanese — an English UI in South Korea"처럼 지역 불일치 문구가 뒤에 붙는다.
8. **Connection** — `Network/Time to first byte`(ms)와 `Server/Edge region`. < 20 → "15 ms to Vercel's icn1 edge: same metro area",
   < 60 → "same region", 그 이상 → "far from the nearest edge, or a slow link". Server 없으면 TTFB만.

## Deductions 수집기 `src/collectors/deductions.ts`

- `collectDeductions(sections)` → `deduce(sections)`의 각 항목을 `{ ...result(name, value, "INFERRED"), evidence }`로.
- note: "What a detective would conclude from the other sections, each with the rows it leaned on. Rules,
  not machine learning, and the rules are in the source; every line is a guess with a stated basis."

## UI와 카피

- `types.ts`: `evidence?: string[]`. `render.ts`의 `row()`: evidence가 있으면 값 span 아래에
  `<span class="evidence">evidence: WebGL/Unmasked renderer, CPU/Logical processors</span>` (dim, 작은 글씨).
- `index.html` `#hero`: `.print` 아래 `<p class="verdict"></p>`. `renderHero`가 Deductions/Verdict 값을 넣고 없으면 비운다.
  스타일: accent 색, composite보다 작은 한 줄.
- 히어로 요약 "Nothing was stored or sent." → "Nothing was stored; nothing collected was sent."
- 푸터 "Everything runs in your browser; nothing is sent anywhere." → "Everything is computed in your browser and
  none of it is uploaded. The one request to this site's own server asks only what it already saw: where your request came from."
- 권한 칩 "No location"은 유지.

## 테스트

- `src/deduce/rules.test.ts`: `fixtures/*.json`(`{ export, expect: { [deductionName]: string[] } }`) 전부에 대해
  (a) 기대 부분 문자열이 해당 결론 값에 포함, (b) 모든 결론의 evidence 키가 export에 실제로 있는 행.
  인라인 케이스: Safari 마스킹(Apple GPU, 8코어), Windows 노트북 GPU, Android 폰(Model), 소프트웨어 렌더러,
  IP 타임존 불일치, Server 없음.
- `api/where.test.ts`: 가짜 헤더로 `GET(new Request(...))` → JSON 필드, `cache-control: no-store`, 도시 percent-decoding.
- 둘 다 `npm test` 체인에 추가. tsconfig `exclude`에 `api/**/*.test.ts` 추가.

## 검증

- push 전(`npm run build && npx vite preview --port 4173`, 실제 Chrome): Deductions 8행 + 히어로 Verdict, Server 행은
  이유 있는 UNAVAILABLE, console error 0, 수집 시간 0.5 s 안팎, composite가 이전 값과 동일(iframe 샘플링).
  headless chromium/firefox/webkit도 preview 서버로 돌려 수집기 예외 0(webkit = 마스킹 경로, firefox = renderer 경로).
- push 후: `curl https://fingerprint.gwanho.com/api/where` JSON 확인 → MCP Chrome에서 Server 행, Where "Seoul … no sign of a VPN",
  Edge region icn1 확인.

## 커밋 순서 (각각 빌드 통과)

1. `chore: tsconfig에 allowImportingTsExtensions 켜고 api 폴더 포함`
2. `feat: 결과 행에 근거 목록 필드를 추가하고 값 아래 흐린 줄로 렌더`
3. `feat: Apple 칩·패널·GPU 분류 표 추가`
4. `feat: 섹션에서 기기·디스플레이·위치를 추리하는 deduce() 규칙과 픽스처 테스트 추가`
5. `feat: 요청 헤더의 IP 위치를 되돌리는 /api/where 함수 추가`
6. `feat: /api/where 응답을 보여주는 Server 섹션 추가`
7. `feat: 추리 결과를 보여주는 Deductions 섹션과 히어로 Verdict 추가`
8. `docs: 서버 요청을 설명하도록 히어로·푸터 문구 수정`
9. `docs: README에 Deductions, Server 섹션과 api/where 안내 추가`
10. `chore: 버전 1.1.0으로 범프`

push는 전부 커밋한 뒤 사용자 확인 후 한 번에. HANDOFF.md는 작업 끝에 갱신.

## 확장 방법

- 새 칩/패널/GPU 패턴: `tables.ts`에 레코드 한 줄.
- 새 규칙: `rules.ts`의 `RULES` 배열에 함수 하나. `get()`만 쓰고 evidence 키를 나열한다.
- 새 기기 자료: 그 기기의 Export JSON을 `fixtures/<기기>.json`에 기대값과 함께 넣으면 `npm test`가 표를 검증한다.
