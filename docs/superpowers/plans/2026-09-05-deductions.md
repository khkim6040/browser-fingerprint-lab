# Deductions + Server 섹션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수집된 행을 규칙으로 읽어 기기·메모리·디스플레이·책상·위치·언어·연결을 추리하는 "Deductions" 섹션과, 요청 헤더의 IP 위치를 되돌려 주는 `/api/where` + "Server" 섹션을 추가하고 히어로에 Verdict 한 줄을 띄운다.

**Architecture:** 데이터 표(`src/deduce/tables.ts`)와 규칙(`src/deduce/rules.ts`)을 분리한 순수 모듈이 섹션 배열을 받아 `Deduction[]`을 만들고, `fingerprint.ts`와 같은 후처리 수집기 패턴으로 "Deductions" 섹션이 된다. 위치는 Vercel Function 하나가 요청 헤더를 JSON으로 되돌려 주고 "Server" 수집기가 같은 도메인으로 한 번 fetch한다. 실기기 Export JSON이 그대로 테스트 픽스처가 된다.

**Tech Stack:** TypeScript 5.7, Vite 6, Node 22 `--experimental-strip-types` 테스트(node:assert), Vercel Functions(Node 런타임, Web 표준 `GET(request)` 시그니처), 의존성 추가 없음.

**Spec:** `docs/superpowers/specs/2026-09-05-deductions-design.md`

## Global Constraints

- 사용자에게 답할 때는 합쇼체. 커밋은 한 줄 제목만(본문·Co-Authored-By 없음). 하나의 커밋 = 하나의 논리적 변경. 빌드가 깨진 상태로 커밋 금지.
- **push는 배포다. 사용자 확인 전에는 절대 push하지 않는다.**
- ponytail(full): 최소한의 동작하는 코드. 투기적 추상화·설정·의존성 추가 금지.
- 테스트 체인은 반드시 `set -eo pipefail` 아래에서 실행한다(`| grep`이 실패를 삼킨다).
- node 테스트는 `node --experimental-strip-types --disable-warning=ExperimentalWarning <file>`로 실행한다. 소스 모듈의 상대 import는 node가 확장자 없이 못 푼다. `src/deduce/*`는 Task 1의 `allowImportingTsExtensions`로 `./tables.ts`처럼 **확장자를 붙여** import한다. 그 외 기존 파일은 기존 스타일(확장자 없음)을 유지한다.
- 행 이름과 값 형식은 기존 수집기가 만드는 그대로다(예: `Display/Resolution` = `"1920 x 1080"`, `Memory/Reported device memory` = `"16 GB"`, `Network/Time to first byte` = `"15.1 ms"`, `CPU/Logical processors` = `12`, `Environment/Languages` = `["en-US", …]`). 규칙은 이 문자열을 파싱한다.
- Server, Deductions 섹션은 `src/fingerprint/composite.ts`의 CATEGORIES에 넣지 않는다(composite 불변).
- 문구는 영어(페이지 언어). 결론 문장은 스펙의 문구를 그대로 쓴다.
- 픽스처 `src/deduce/fixtures/mac-m4pro-chrome.json`은 사용자의 실제 Export다. 스크래치패드 원본: `/private/tmp/claude-501/-Users-gwanhokim-personal-projects-browser-fingerprint-lab/df2ce409-71b9-465e-9d8e-99216d5433c1/scratchpad/mac-m4pro-chrome.export.json`

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `tsconfig.json` (수정) | `.ts` 확장자 import 허용, `api/` 타입 검사 포함 |
| `src/types.ts` (수정) | `CollectorResult.evidence?: string[]` |
| `src/ui/render.ts` (수정) | 근거 줄 렌더, 히어로 Verdict, 수집 요약에서 Deductions 제외, 요약 문구 |
| `src/style.css` (수정) | `.evidence`, `.verdict` |
| `src/deduce/tables.ts` (신규) | 데이터만: `APPLE_CHIPS`, `PANELS`, `GPU_CLASSES` |
| `src/deduce/tables.test.ts` (신규) | 표 무결성 검사 |
| `src/deduce/rules.ts` (신규) | `deduce(sections)`, `gpuModel()`, `osFamily()`, `RULES` |
| `src/deduce/rules.test.ts` (신규) | 픽스처 전체 + 인라인 케이스 |
| `src/deduce/fixtures/mac-m4pro-chrome.json` (신규) | 실기기 Export + 기대값 |
| `api/where.ts` (신규) | Vercel Function: 요청 헤더 → JSON |
| `api/where.test.ts` (신규) | 가짜 Request로 검사 |
| `src/collectors/where.ts` (신규) | "Server" 섹션 수집기 |
| `src/collectors/deductions.ts` (신규) | "Deductions" 섹션 수집기 |
| `src/main.ts` (수정) | Server 등록, Deductions 섹션 삽입 |
| `index.html` (수정) | `#hero .verdict`, 푸터 문구 |
| `README.md`, `package.json`, `package-lock.json` (수정) | 문서, 테스트 체인, 버전 |

---

### Task 1: tsconfig — `.ts` 확장자 import 허용과 `api/` 포함

**Files:**
- Modify: `tsconfig.json`

**Interfaces:**
- Produces: 이후 Task의 `src/deduce/*`가 `./tables.ts`, `../types.ts`처럼 확장자를 붙여 import할 수 있음. `api/*.ts`가 `npm run build`의 `tsc --noEmit`에 포함됨.

- [ ] **Step 1: tsconfig 수정**

`tsconfig.json`을 다음으로 교체한다.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src", "api"],
  "exclude": ["src/**/*.test.ts", "api/**/*.test.ts"]
}
```

- [ ] **Step 2: 빌드와 테스트가 그대로 통과하는지 확인**

Run: `set -eo pipefail; npm test 2>&1 | tail -6 && npm run build 2>&1 | tail -3`
Expected: 6개 `ok`, `✓ built in …`. (`api/` 폴더가 아직 없어도 `src`가 매치되므로 tsc는 정상.)

- [ ] **Step 3: 커밋**

```bash
git add tsconfig.json
git commit -m "chore: tsconfig에 allowImportingTsExtensions 켜고 api 폴더 포함"
```

---

### Task 2: 결과 행의 근거 목록 필드와 렌더

**Files:**
- Modify: `src/types.ts:3-9` (CollectorResult)
- Modify: `src/ui/render.ts:10-30` (row)
- Modify: `src/style.css:83-85` 근처

**Interfaces:**
- Produces: `CollectorResult.evidence?: string[]` — "Section/Signal" 키 목록. `render.ts`의 `row()`가 있으면 값 아래 `.evidence` 줄로 그린다.

- [ ] **Step 1: 타입에 필드 추가**

`src/types.ts`의 `CollectorResult`를 다음으로 바꾼다.

```ts
export interface CollectorResult<T = unknown> {
  name: string;
  supported: boolean;
  evidenceType: EvidenceType;
  value?: T;
  error?: string;
  /** Rows this value was inferred from, as "Section/Signal" keys (Deductions only). */
  evidence?: string[];
}
```

- [ ] **Step 2: 렌더에 근거 줄 추가**

`src/ui/render.ts`의 `row()`에서 `value.textContent = …;` 바로 뒤, `const badge` 앞에 넣는다.

```ts
  if (r.evidence?.length) {
    const ev = document.createElement("span");
    ev.className = "evidence";
    ev.textContent = `evidence: ${r.evidence.join(", ")}`;
    value.append(ev);
  }
```

- [ ] **Step 3: 스타일 추가**

`src/style.css`의 `.value.absent { … }` 줄 아래에 추가한다.

```css
.evidence { display: block; margin-top: 0.15rem; color: var(--dim); font-size: 0.75rem; }
```

- [ ] **Step 4: 빌드 확인**

Run: `set -eo pipefail; npm run build 2>&1 | tail -2`
Expected: `✓ built in …`

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/ui/render.ts src/style.css
git commit -m "feat: 결과 행에 근거 목록 필드를 추가하고 값 아래 흐린 줄로 렌더"
```

---

### Task 3: 데이터 표 `src/deduce/tables.ts`

**Files:**
- Create: `src/deduce/tables.ts`
- Test: `src/deduce/tables.test.ts`
- Modify: `package.json` (test 체인)

**Interfaces:**
- Produces:
  ```ts
  export interface AppleChip { chip: string; cores: number; products: string[]; minRam: number }
  export const APPLE_CHIPS: AppleChip[]
  export interface Panel { width: number; height: number; products: string[] }
  export const PANELS: Panel[]
  export type GpuKind = "software" | "laptop" | "discrete" | "integrated"
  export interface GpuClass { pattern: RegExp; kind: GpuKind; conclusion: string }
  export const GPU_CLASSES: GpuClass[]   // 순서대로 첫 매치
  ```
  제품 이름은 두 표에서 같은 문자열을 쓴다(`"MacBook Pro 14"`, `"Mac mini"`, …).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/deduce/tables.test.ts`:

```ts
import assert from "node:assert/strict";
import { APPLE_CHIPS, GPU_CLASSES, PANELS } from "./tables.ts";

// One row per (chip, cores); every row names at least one product and a RAM floor.
const seen = new Set<string>();
for (const c of APPLE_CHIPS) {
  const key = `${c.chip}/${c.cores}`;
  assert.ok(!seen.has(key), `duplicate ${key}`);
  seen.add(key);
  assert.ok(c.products.length > 0 && c.minRam > 0, key);
}
assert.deepEqual(APPLE_CHIPS.find((c) => c.chip === "M4 Pro" && c.cores === 12)?.products, ["MacBook Pro 14", "Mac mini"]);

// Panel product names are Mac names from APPLE_CHIPS, or standalone displays.
const macs = new Set(APPLE_CHIPS.flatMap((c) => c.products));
for (const p of PANELS) for (const name of p.products) assert.ok(macs.has(name) || /Display/.test(name), `panel product ${name} is not a Mac name`);
assert.deepEqual(PANELS.find((p) => p.width === 1512 && p.height === 982)?.products, ["MacBook Pro 14"]);

// First match wins, so laptop strings must beat the generic discrete pattern.
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("NVIDIA GeForce RTX 4070 Laptop GPU"))?.kind, "laptop");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("NVIDIA GeForce RTX 4070"))?.kind, "discrete");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Intel(R) Iris(R) Xe Graphics"))?.kind, "integrated");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("AMD Radeon(TM) Graphics"))?.kind, "integrated");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Intel(R) Arc(TM) A770 Graphics"))?.kind, "discrete");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Google SwiftShader"))?.kind, "software");
console.log("tables: ok");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/tables.test.ts`
Expected: FAIL — `Cannot find module … tables.ts`

- [ ] **Step 3: 표 작성**

`src/deduce/tables.ts`:

```ts
/**
 * Data only. Product names are shared between APPLE_CHIPS and PANELS so the
 * verdict can intersect "what this chip ships in" with "what panel this is" by name.
 * Adding a chip, a panel or a GPU pattern is one record here; rules.ts does not change.
 */

export interface AppleChip {
  chip: string;
  cores: number;
  products: string[];
  /** Smallest memory configuration Apple sells this variant with, GB. */
  minRam: number;
}

export const APPLE_CHIPS: AppleChip[] = [
  { chip: "M1", cores: 8, products: ["MacBook Air 13", "MacBook Pro 13", "Mac mini", "iMac 24"], minRam: 8 },
  { chip: "M1 Pro", cores: 8, products: ["MacBook Pro 14"], minRam: 16 },
  { chip: "M1 Pro", cores: 10, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 16 },
  { chip: "M1 Max", cores: 10, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 32 },
  { chip: "M1 Ultra", cores: 20, products: ["Mac Studio"], minRam: 64 },
  { chip: "M2", cores: 8, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 13", "Mac mini"], minRam: 8 },
  { chip: "M2 Pro", cores: 10, products: ["MacBook Pro 14", "Mac mini"], minRam: 16 },
  { chip: "M2 Pro", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac mini"], minRam: 16 },
  { chip: "M2 Max", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 32 },
  { chip: "M2 Ultra", cores: 24, products: ["Mac Studio", "Mac Pro"], minRam: 64 },
  { chip: "M3", cores: 8, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 14", "iMac 24"], minRam: 8 },
  { chip: "M3 Pro", cores: 11, products: ["MacBook Pro 14"], minRam: 18 },
  { chip: "M3 Pro", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 18 },
  { chip: "M3 Max", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 36 },
  { chip: "M3 Max", cores: 16, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 36 },
  { chip: "M3 Ultra", cores: 28, products: ["Mac Studio"], minRam: 96 },
  { chip: "M3 Ultra", cores: 32, products: ["Mac Studio"], minRam: 96 },
  { chip: "M4", cores: 8, products: ["iMac 24"], minRam: 16 },
  { chip: "M4", cores: 10, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 14", "Mac mini", "iMac 24"], minRam: 16 },
  { chip: "M4 Pro", cores: 12, products: ["MacBook Pro 14", "Mac mini"], minRam: 24 },
  { chip: "M4 Pro", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac mini"], minRam: 24 },
  { chip: "M4 Max", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 36 },
  { chip: "M4 Max", cores: 16, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 36 },
  { chip: "M5", cores: 10, products: ["MacBook Pro 14"], minRam: 16 },
];

export interface Panel {
  /** Logical (CSS pixel) size at the display's default scaling. */
  width: number;
  height: number;
  products: string[];
}

export const PANELS: Panel[] = [
  { width: 1440, height: 900, products: ["MacBook Air 13", "MacBook Pro 13"] },
  { width: 1470, height: 956, products: ["MacBook Air 13"] },
  { width: 1710, height: 1112, products: ["MacBook Air 15"] },
  { width: 1512, height: 982, products: ["MacBook Pro 14"] },
  { width: 1728, height: 1117, products: ["MacBook Pro 16"] },
  { width: 2240, height: 1260, products: ["iMac 24"] },
  { width: 2560, height: 1440, products: ["Studio Display"] },
  { width: 3008, height: 1692, products: ["Pro Display XDR"] },
];

export type GpuKind = "software" | "laptop" | "discrete" | "integrated";

export interface GpuClass {
  pattern: RegExp;
  kind: GpuKind;
  conclusion: string;
}

/** Tested in order against the unmasked renderer string; the first match wins. */
export const GPU_CLASSES: GpuClass[] = [
  { pattern: /SwiftShader|llvmpipe|Basic Render Driver/i, kind: "software", conclusion: "software rendering: a VM, remote desktop, or headless browser" },
  { pattern: /Laptop GPU|Max-Q|Mobile/i, kind: "laptop", conclusion: "a laptop with a discrete GPU" },
  { pattern: /GeForce|Radeon RX|Radeon Pro|Arc(\(TM\))? [AB]\d|Quadro/i, kind: "discrete", conclusion: "a desktop or gaming laptop" },
  { pattern: /Iris|UHD Graphics|HD Graphics|Radeon(\(TM\))? Graphics|Radeon Vega|Arc(\(TM\))? Graphics|Adreno/i, kind: "integrated", conclusion: "a laptop or small-form-factor PC" },
];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/tables.test.ts`
Expected: `tables: ok`

- [ ] **Step 5: 테스트 체인에 추가**

`package.json`의 `"test"` 값 끝에 ` && node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/tables.test.ts`를 붙인다.

Run: `set -eo pipefail; npm test 2>&1 | tail -7 && npm run build 2>&1 | tail -2`
Expected: 7개 `ok`, 빌드 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/deduce/tables.ts src/deduce/tables.test.ts package.json
git commit -m "feat: Apple 칩·패널·GPU 분류 표 추가"
```

---

### Task 4: 규칙 `src/deduce/rules.ts`와 픽스처 테스트

**Files:**
- Create: `src/deduce/rules.ts`
- Create: `src/deduce/fixtures/mac-m4pro-chrome.json`
- Test: `src/deduce/rules.test.ts`
- Modify: `package.json` (test 체인)

**Interfaces:**
- Consumes: Task 3의 `APPLE_CHIPS`, `PANELS`, `GPU_CLASSES`; `Section`/`CollectorResult` from `src/types.ts`.
- Produces:
  ```ts
  export interface Deduction { name: string; value: string; evidence: string[] }
  export type Get = (key: string) => unknown;      // "Section/Signal" → supported value, else undefined
  export function deduce(sections: Section[]): Deduction[]   // Verdict first when it exists
  export function gpuModel(renderer: string): string
  export function osFamily(get: Get): string | undefined     // "macOS" | "Windows" | "Android" | "iOS" | "ChromeOS" | "Linux" | raw
  ```

- [ ] **Step 1: 픽스처 생성**

스크래치패드의 Export를 `{ export, expect }`로 감싸 저장한다.

```bash
node -e '
const fs = require("fs");
const exp = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const out = { export: exp, expect: {
  Verdict: ["MacBook Pro 14", "Mac mini", "M4 Pro", "24 GB+"],
  Machine: ["M4 Pro", "12-core", "MacBook Pro 14", "Mac mini"],
  Memory: ["24 GB or more"],
  Display: ["external", "1920×1080"],
  Desk: ["fills the screen"],
  Where: ["unavailable", "Asia/Seoul"],
  Languages: ["Korean", "Japanese"],
  Connection: ["15 ms"]
} };
fs.mkdirSync("src/deduce/fixtures", { recursive: true });
fs.writeFileSync("src/deduce/fixtures/mac-m4pro-chrome.json", JSON.stringify(out, null, 2) + "\n");
' /private/tmp/claude-501/-Users-gwanhokim-personal-projects-browser-fingerprint-lab/df2ce409-71b9-465e-9d8e-99216d5433c1/scratchpad/mac-m4pro-chrome.export.json
node -e 'const f=require("./src/deduce/fixtures/mac-m4pro-chrome.json"); console.log(f.export.sections.length, "sections;", Object.keys(f.expect).length, "expectations")'
```
Expected: `14 sections; 8 expectations`

- [ ] **Step 2: 실패하는 테스트 작성**

`src/deduce/rules.test.ts`:

```ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { deduce, gpuModel, osFamily } from "./rules.ts";
import type { Section } from "../types.ts";

/** Flat "Section/Signal": value → sections, for small inline cases. */
const mk = (rows: Record<string, unknown>): Section[] => {
  const by = new Map<string, Section>();
  for (const [key, value] of Object.entries(rows)) {
    const [title, name] = key.split("/");
    if (!by.has(title)) by.set(title, { title, results: [] });
    by.get(title)!.results.push({ name, supported: true, evidenceType: "DIRECT", value });
  }
  return [...by.values()];
};
const find = (sections: Section[], name: string) => deduce(sections).find((d) => d.name === name)?.value ?? "";

// Every real-device export in fixtures/: expected substrings present, every cited row real.
const dir = new URL("./fixtures/", import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const { export: snapshot, expect } = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  const keys = new Set<string>(snapshot.sections.flatMap((s: Section) => s.results.map((r) => `${s.title}/${r.name}`)));
  const ds = deduce(snapshot.sections);
  for (const [name, needles] of Object.entries(expect as Record<string, string[]>)) {
    const d = ds.find((x) => x.name === name);
    assert.ok(d, `${file}: no deduction named ${name}`);
    for (const n of needles) assert.ok(d.value.includes(n), `${file}: ${name} lacks "${n}": ${d.value}`);
  }
  for (const d of ds) for (const k of d.evidence) assert.ok(keys.has(k), `${file}: ${d.name} cites missing row ${k}`);
  assert.equal(ds[0]?.name, "Verdict", `${file}: verdict first`);
}

// Safari on Apple Silicon: renderer masked, cores capped.
const safari = mk({
  "Environment/OS": "MacIntel",
  "Environment/User agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  "WebGL/Unmasked renderer": "Apple GPU",
  "CPU/Logical processors": 8,
  "Input/Touch points": 0,
});
assert.match(find(safari, "Machine"), /Safari masks/);

// Windows laptop with a discrete GPU, HiDPI scaling.
const win = mk({
  "Environment/OS": "Windows",
  "WebGL/Unmasked renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
  "CPU/Logical processors": 16,
  "Display/Resolution": "2560 x 1600",
  "Display/Device pixel ratio": 1.5,
});
assert.match(find(win, "Machine"), /Windows: a laptop with a discrete GPU \(NVIDIA GeForce RTX 4070 Laptop GPU\)/);
assert.match(find(win, "Display"), /scaled at 150%/);

// Android phone names its model through UA Client Hints.
const android = mk({ "Environment/OS": "Android", "Environment/Mobile": true, "Environment/Model": "SM-S928B", "Environment/Form factors": ["Mobile"] });
assert.match(find(android, "Machine"), /Android phone or tablet, model SM-S928B/);

// Software renderer means no real GPU in sight.
const vm = mk({ "Environment/OS": "Linux", "WebGL/Unmasked renderer": "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)" });
assert.match(find(vm, "Machine"), /software rendering/);

// IP timezone vs browser clock: mismatch is a VPN tell, same offset is not.
const vpn = mk({ "Environment/Timezone": "Asia/Seoul", "Server/Country": "US", "Server/City": "Los Angeles", "Server/IP timezone": "America/Los_Angeles" });
assert.match(find(vpn, "Where"), /VPN, proxy, or travelling/);
const neighbour = mk({ "Environment/Timezone": "Europe/Berlin", "Server/Country": "FR", "Server/City": "Paris", "Server/IP timezone": "Europe/Paris" });
assert.match(find(neighbour, "Where"), /keep the same time/);
assert.doesNotMatch(find(neighbour, "Where"), /VPN/);
assert.match(find(mk({ "Environment/Timezone": "Asia/Seoul", "Server/Country": "KR", "Server/City": "Seoul", "Server/IP timezone": "Asia/Seoul" }), "Where"), /Seoul, South Korea by IP address; the browser clock agrees/);

// Language UI vs IP country.
assert.match(find(mk({ "Environment/Languages": ["en-US", "ko-KR", "ko"], "Server/Country": "KR" }), "Languages"), /browser in American English; also reads Korean — an English UI in South Korea/);

// Renderer string cleanup and OS detection.
assert.equal(gpuModel("ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "NVIDIA GeForce RTX 4070 Laptop GPU");
assert.equal(gpuModel("Mesa Intel(R) UHD Graphics 620 (KBL GT2)"), "Intel(R) UHD Graphics 620");
assert.equal(gpuModel("AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 15.0.7, DRM 3.49, 6.2.0)"), "AMD Radeon RX 6700 XT");
assert.equal(osFamily((k) => ({ "Environment/OS": "iPhone", "Environment/User agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)" })[k]), "iOS");
assert.equal(osFamily((k) => ({ "Environment/OS": "X11", "Environment/User agent": "Mozilla/5.0 (X11; CrOS x86_64 16000.0.0)" })[k]), "ChromeOS");

// Nothing to go on → nothing claimed.
assert.deepEqual(deduce([]), []);
console.log("rules: ok");
```

- [ ] **Step 3: 실패 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/rules.test.ts`
Expected: FAIL — `Cannot find module … rules.ts`

- [ ] **Step 4: 규칙 구현**

`src/deduce/rules.ts`:

```ts
import type { Section } from "../types.ts";
import { APPLE_CHIPS, GPU_CLASSES, PANELS } from "./tables.ts";

export interface Deduction {
  name: string;
  value: string;
  /** "Section/Signal" keys this conclusion leaned on. */
  evidence: string[];
}

/** "Section/Signal" → the row's value when supported, else undefined. */
export type Get = (key: string) => unknown;

/** What earlier rules established, for later rules and the verdict. */
interface Facts {
  os?: string;
  chip?: string;
  products?: string[];
  minRam?: number;
  ramGb?: number;
  display?: string;
  external?: boolean;
  panelProducts?: string[];
  place?: string;
}

type Rule = (get: Get, f: Facts) => Deduction | undefined;

const str = (get: Get, key: string): string | undefined => {
  const v = get(key);
  return v === undefined || v === null ? undefined : String(v);
};
const num = (get: Get, key: string): number | undefined => {
  const v = get(key);
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};
/** "1920 x 1080" → [1920, 1080] */
const size = (get: Get, key: string): [number, number] | undefined => {
  const m = /(\d+) x (\d+)/.exec(str(get, key) ?? "");
  return m ? [+m[1], +m[2]] : undefined;
};
const list = (xs: string[], word = "or"): string =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${word} ${xs[xs.length - 1]}`;

const displayName = (type: "language" | "region", code: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** "GMT+9" for an IANA zone; undefined when this runtime does not know the zone. */
function offset(tz: string): string | undefined {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

/** OS family from UA-CH platform (Chromium) or navigator.platform + UA (the rest). iOS before macOS: its UA says "like Mac OS X". */
export function osFamily(get: Get): string | undefined {
  const p = `${str(get, "Environment/OS") ?? ""} ${str(get, "Environment/User agent") ?? ""}`;
  if (/Android/i.test(p)) return "Android";
  if (/iPhone|iPad|iPod/.test(p)) return "iOS";
  if (/Mac/i.test(p)) return "macOS";
  if (/Win/i.test(p)) return "Windows";
  if (/CrOS|Chrome OS/i.test(p)) return "ChromeOS";
  if (/Linux|X11/i.test(p)) return "Linux";
  return str(get, "Environment/OS");
}

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)" → "NVIDIA GeForce RTX 4070 Laptop GPU". */
export function gpuModel(renderer: string): string {
  const angle = /^ANGLE \((.*)\)$/.exec(renderer);
  let s = angle ? angle[1] : renderer;
  const parts = s.split(", ");
  if (angle && parts.length >= 2) s = parts[1]; // vendor, MODEL, backend
  return s
    .replace(/\s*\(0x[0-9A-Fa-f]+\)/g, "")
    .replace(/\s*Direct3D\d+.*$/, "")
    .replace(/^Mesa\s+/, "")
    .replace(/\s*\([^()]*\)$/, "") // trailing "(radeonsi, navi22, …)" / "(KBL GT2)"
    .replace(/\/PCIe\/SSE2$/, "")
    .trim();
}

const machine: Rule = (get, f) => {
  const renderer = str(get, "WebGL/Unmasked renderer") ?? "";
  const os = (f.os = osFamily(get));
  const cores = num(get, "CPU/Logical processors");
  const touch = num(get, "Input/Touch points") ?? 0;
  const ev = ["WebGL/Unmasked renderer", "CPU/Logical processors", "Environment/OS"];

  const formFactors = String(get("Environment/Form factors") ?? "");
  if (get("Environment/Mobile") === true || /Mobile|Tablet/.test(formFactors) || os === "Android" || os === "iOS") {
    const model = str(get, "Environment/Model");
    const value =
      os === "iOS" ? "an iPhone or iPad; Safari names no model"
      : model ? `an ${os} phone or tablet, model ${model}`
      : `an ${os} phone or tablet; the model is withheld`;
    return { name: "Machine", value, evidence: ["Environment/Mobile", "Environment/Model", "Environment/OS"] };
  }
  if (os === "macOS" && touch > 0) {
    return { name: "Machine", value: "an iPad asking to be treated as a Mac: Macintosh platform, but a touchscreen", evidence: ["Environment/Platform (legacy)", "Input/Touch points"] };
  }
  const apple = /Apple (M\d+(?: Pro| Max| Ultra)?)/.exec(renderer);
  if (apple) {
    f.chip = apple[1];
    const rows = APPLE_CHIPS.filter((c) => c.chip === f.chip);
    if (cores === undefined) return { name: "Machine", value: `Apple ${f.chip}; the core count is withheld, so the variant is unknown`, evidence: ev };
    const hit = rows.find((c) => c.cores === cores);
    if (hit) {
      f.products = hit.products;
      f.minRam = hit.minRam;
      return { name: "Machine", value: `Apple ${f.chip}, the ${cores}-core variant — sold as ${list(hit.products)}`, evidence: ev };
    }
    if (rows.length) return { name: "Machine", value: `Apple ${f.chip} with ${cores} cores — a variant this page's table does not list`, evidence: ev };
    return { name: "Machine", value: `Apple ${f.chip} — newer than this page's table`, evidence: ev };
  }
  if (os === "macOS" && (!renderer || /Apple GPU/.test(renderer))) {
    return { name: "Machine", value: "a Mac, most likely Apple Silicon; Safari masks the chip and caps the core count at 8", evidence: ev };
  }
  if (!renderer) return undefined;
  const model = gpuModel(renderer);
  if (os === "macOS") return { name: "Machine", value: `an Intel-era Mac with ${model}`, evidence: ev };
  const cls = GPU_CLASSES.find((c) => c.pattern.test(renderer));
  return { name: "Machine", value: `${os ?? "a PC"}: ${cls ? cls.conclusion : "a PC"} (${model})`, evidence: ev };
};

const memory: Rule = (get, f) => {
  const bucket = num(get, "Memory/Reported device memory");
  if (bucket === undefined && f.minRam === undefined) return undefined;
  const floor = Math.max(bucket ?? 0, f.minRam ?? 0);
  f.ramGb = floor;
  const why =
    f.minRam && f.minRam > (bucket ?? 0)
      ? bucket
        ? `the browser only admits ≥${bucket} GB, but this chip never ships with less than ${f.minRam} GB`
        : `this browser reports no memory at all, but this chip never ships with less than ${f.minRam} GB`
      : `the browser reports a ${bucket} GB bucket, which is a floor, not the installed amount`;
  const evidence = bucket === undefined ? ["WebGL/Unmasked renderer"] : f.minRam ? ["Memory/Reported device memory", "WebGL/Unmasked renderer"] : ["Memory/Reported device memory"];
  return { name: "Memory", value: `${floor} GB or more — ${why}`, evidence };
};

const display: Rule = (get, f) => {
  const res = size(get, "Display/Resolution");
  const dpr = num(get, "Display/Device pixel ratio");
  if (!res || dpr === undefined) return undefined;
  const gamut = str(get, "Display/Color gamut");
  const ev = ["Display/Resolution", "Display/Device pixel ratio", "Display/Color gamut"];
  const px = `${res[0]}×${res[1]}`;
  if (f.os === "macOS") {
    if (dpr === 1 || gamut === "srgb") {
      f.external = true;
      f.display = `an external ${px} monitor`;
      return { name: "Display", value: `an external non-Apple monitor, ${px} at ${dpr}× — Apple panels are Retina and P3`, evidence: ev };
    }
    const panel = PANELS.find((p) => p.width === res[0] && p.height === res[1]);
    if (panel) {
      f.panelProducts = panel.products;
      f.display = `the ${list(panel.products)} panel`;
      return { name: "Display", value: `the ${list(panel.products)} panel, ${px} at ${dpr}× — Retina, P3`, evidence: ev };
    }
    f.display = "a Retina P3 display";
    return { name: "Display", value: `a Retina P3 display at a custom scaling (${px} at ${dpr}×); no stock panel matches`, evidence: ev };
  }
  f.display = `a ${px} screen`;
  const value = dpr === 1 ? `a ${px} screen at 100%` : `a ${px} screen scaled at ${Math.round(dpr * 100)}%`;
  return { name: "Display", value, evidence: ev };
};

const desk: Rule = (get, f) => {
  const res = size(get, "Display/Resolution");
  const avail = size(get, "Display/Available");
  const win = size(get, "Display/Window outer size");
  if (!res || !avail || !win) return undefined;
  const parts: string[] = [];
  if (f.os === "macOS") {
    if (res[0] > avail[0]) parts.push("Dock on the left or right");
    else if (res[1] - avail[1] > 40) parts.push("Dock at the bottom");
    else parts.push("no Dock on this screen: hidden, or on another display");
  }
  // Chrome's maximised window comes up a pixel short of the available area.
  parts.push(win[0] >= avail[0] - 2 && win[1] >= avail[1] - 2 ? "the browser fills the screen" : `browser windowed, ${win[0]}×${win[1]} of ${avail[0]}×${avail[1]}`);
  return { name: "Desk", value: parts.join("; "), evidence: ["Display/Resolution", "Display/Available", "Display/Window outer size"] };
};

const where: Rule = (get, f) => {
  const clock = str(get, "Environment/Timezone");
  const country = str(get, "Server/Country");
  if (!country) return clock ? { name: "Where", value: `IP location unavailable here; the clock says ${clock}`, evidence: ["Environment/Timezone"] } : undefined;
  const city = str(get, "Server/City");
  const ipTz = str(get, "Server/IP timezone");
  f.place = [city, displayName("region", country)].filter(Boolean).join(", ");
  const ev = ["Server/City", "Server/Country", "Server/IP timezone", "Environment/Timezone"];
  if (!clock || !ipTz) return { name: "Where", value: `${f.place} by IP address`, evidence: ev };
  if (clock === ipTz) return { name: "Where", value: `${f.place} by IP address; the browser clock agrees (${clock}), so no sign of a VPN or proxy`, evidence: ev };
  if (offset(clock) && offset(clock) === offset(ipTz)) {
    return { name: "Where", value: `${f.place} by IP address; the clock (${clock}) and the IP (${ipTz}) keep the same time`, evidence: ev };
  }
  return { name: "Where", value: `the clock says ${clock} but the IP sits in ${ipTz} (${f.place}) — VPN, proxy, or travelling`, evidence: ev };
};

const languages: Rule = (get) => {
  const langs = get("Environment/Languages");
  if (!Array.isArray(langs) || langs.length === 0) return undefined;
  const first = String(langs[0]);
  const base = (tag: string) => tag.split("-")[0];
  const others = [...new Set(langs.slice(1).map((l) => base(String(l))))]
    .filter((b) => b !== base(first))
    .map((b) => displayName("language", b));
  let value = `browser in ${displayName("language", first)}`;
  if (others.length) value += `; also reads ${list(others, "and")}`;
  const ev = ["Environment/Languages"];
  const region = first.split("-")[1];
  const country = str(get, "Server/Country");
  if (region && country && region.toUpperCase() !== country.toUpperCase()) {
    value += ` — ${/^[aeiou]/i.test(displayName("language", base(first))) ? "an" : "a"} ${displayName("language", base(first))} UI in ${displayName("region", country)}`;
    ev.push("Server/Country");
  }
  return { name: "Languages", value, evidence: ev };
};

const connection: Rule = (get) => {
  const ttfb = num(get, "Network/Time to first byte");
  if (ttfb === undefined) return undefined;
  const edge = str(get, "Server/Edge region");
  const from = edge ? `Vercel's ${edge} edge` : "the nearest edge";
  const verdict = ttfb < 20 ? "same metro area" : ttfb < 60 ? "same region" : "far from it, or a slow link";
  return { name: "Connection", value: `${ttfb.toFixed(0)} ms to first byte from ${from}: ${verdict}`, evidence: edge ? ["Network/Time to first byte", "Server/Edge region"] : ["Network/Time to first byte"] };
};

/** One sentence from what the rules established. */
function verdict(f: Facts, ds: Deduction[]): Deduction | undefined {
  const machine = ds.find((d) => d.name === "Machine");
  if (!machine && !f.display) return undefined;
  let what: string;
  if (f.products) {
    const both = f.panelProducts ? f.products.filter((p) => f.panelProducts!.includes(p)) : [];
    const products = both.length ? both : f.products;
    what = list(products.map((p) => (f.external && /MacBook/.test(p) ? `a docked ${p}` : `a ${p}`)));
    what += ` (${f.chip}${f.ramGb ? `, ${f.ramGb} GB+` : ""})`;
  } else {
    what = machine?.value ?? "a computer";
  }
  const bits = [what];
  if (f.display) bits.push(`on ${f.display}`);
  if (f.place) bits.push(`in ${f.place}`);
  return { name: "Verdict", value: `Probably ${bits.join(", ")}.`, evidence: [...new Set(ds.flatMap((d) => d.evidence))] };
}

/** Append a rule here to add a deduction; it reads rows through get() and names them as evidence. */
const RULES: Rule[] = [machine, memory, display, desk, where, languages, connection];

export function deduce(sections: Section[]): Deduction[] {
  const rows = new Map<string, unknown>();
  for (const s of sections) for (const r of s.results) if (r.supported) rows.set(`${s.title}/${r.name}`, r.value);
  const get: Get = (key) => rows.get(key);
  const facts: Facts = {};
  const out: Deduction[] = [];
  for (const rule of RULES) {
    const d = rule(get, facts);
    if (d) out.push(d);
  }
  const v = verdict(facts, out);
  return v ? [v, ...out] : out;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/rules.test.ts`
Expected: `rules: ok`

실패하면 실패 메시지의 결론 문장을 보고 **규칙의 문구가 아니라 픽스처 기대값이 틀렸는지 먼저** 확인한다. 기대값은 스펙 문구의 부분 문자열이어야 한다.

- [ ] **Step 6: 테스트 체인에 추가하고 전체 확인**

`package.json`의 `"test"` 값 끝에 ` && node --experimental-strip-types --disable-warning=ExperimentalWarning src/deduce/rules.test.ts`를 붙인다.

Run: `set -eo pipefail; npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -2`
Expected: 8개 `ok`, 빌드 통과(`rules.ts`는 아직 아무도 import하지 않지만 tsc 검사는 받는다).

- [ ] **Step 7: 커밋**

```bash
git add src/deduce/rules.ts src/deduce/rules.test.ts src/deduce/fixtures/mac-m4pro-chrome.json package.json
git commit -m "feat: 섹션에서 기기·디스플레이·위치를 추리하는 deduce() 규칙과 픽스처 테스트 추가"
```

---

### Task 5: `/api/where` 함수

**Files:**
- Create: `api/where.ts`
- Test: `api/where.test.ts`
- Modify: `package.json` (test 체인)

**Interfaces:**
- Produces: `GET /api/where` → `application/json` `{ ip?, country?, region?, city?, latitude?, longitude?, timezone? }` (문자열; 없는 헤더는 키 자체가 없음), 헤더 `cache-control: no-store`.

- [ ] **Step 1: 실패하는 테스트 작성**

`api/where.test.ts`:

```ts
import assert from "node:assert/strict";
import { GET } from "./where.ts";

const res = GET(
  new Request("https://fingerprint.gwanho.com/api/where", {
    headers: {
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
      "x-vercel-ip-country": "KR",
      "x-vercel-ip-country-region": "11",
      "x-vercel-ip-city": "Seoul",
      "x-vercel-ip-latitude": "37.5665",
      "x-vercel-ip-longitude": "126.978",
      "x-vercel-ip-timezone": "Asia/Seoul",
    },
  }),
);
assert.equal(res.headers.get("cache-control"), "no-store");
assert.match(res.headers.get("content-type") ?? "", /application\/json/);
assert.deepEqual(await res.json(), {
  ip: "203.0.113.9",
  country: "KR",
  region: "11",
  city: "Seoul",
  latitude: "37.5665",
  longitude: "126.978",
  timezone: "Asia/Seoul",
});

// Percent-encoded city names decode; headers that are absent stay absent.
const bare = await GET(new Request("https://x/api/where", { headers: { "x-vercel-ip-city": "S%C3%A3o%20Paulo" } })).json();
assert.equal(bare.city, "São Paulo");
assert.equal("country" in bare, false);
assert.equal("ip" in bare, false);
console.log("where: ok");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning api/where.test.ts`
Expected: FAIL — `Cannot find module … where.ts`

- [ ] **Step 3: 함수 작성**

`api/where.ts`:

```ts
/**
 * Echoes what Vercel's edge already attached to this request: the client
 * address and its city-level lookup. Nothing is read from a body, nothing is
 * stored, nothing is logged. Deployed automatically from the api/ folder.
 */
export function GET(request: Request): Response {
  const h = (name: string) => request.headers.get(name) ?? undefined;
  const city = h("x-vercel-ip-city");
  const body = {
    ip: h("x-forwarded-for")?.split(",")[0].trim(),
    country: h("x-vercel-ip-country"),
    region: h("x-vercel-ip-country-region"),
    city: city && decodeURIComponent(city),
    latitude: h("x-vercel-ip-latitude"),
    longitude: h("x-vercel-ip-longitude"),
    timezone: h("x-vercel-ip-timezone"),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning api/where.test.ts`
Expected: `where: ok`

- [ ] **Step 5: 테스트 체인에 추가하고 빌드 확인**

`package.json`의 `"test"` 값 끝에 ` && node --experimental-strip-types --disable-warning=ExperimentalWarning api/where.test.ts`를 붙인다.

Run: `set -eo pipefail; npm test 2>&1 | tail -9 && npm run build 2>&1 | tail -2`
Expected: 9개 `ok`, 빌드 통과(`api/where.ts`가 tsc 검사에 포함됨).

- [ ] **Step 6: 커밋**

```bash
git add api/where.ts api/where.test.ts package.json
git commit -m "feat: 요청 헤더의 IP 위치를 되돌리는 /api/where 함수 추가"
```

---

### Task 6: "Server" 섹션 수집기

**Files:**
- Create: `src/collectors/where.ts`
- Modify: `src/main.ts:20-34` (COLLECTORS)

**Interfaces:**
- Consumes: Task 5의 `/api/where` JSON. `result`, `unavailable`, `CollectorResult`, `Section` from `src/types.ts`.
- Produces: `export async function collectServer(): Promise<Section>` — title `"Server"`, 행 `IP address`, `Country`, `Region`, `City`, `Coordinates`, `IP timezone`, `Edge region`. Task 4의 규칙이 `Server/City`, `Server/Country`, `Server/IP timezone`, `Server/Edge region` 키를 읽는다.

- [ ] **Step 1: 수집기 작성**

`src/collectors/where.ts`:

```ts
import { result, unavailable, type CollectorResult, type Section } from "../types";

const NAMES = ["IP address", "Country", "Region", "City", "Coordinates", "IP timezone", "Edge region"];
const NOTE =
  "What the request itself told the server before any script ran: the address the reply had to reach, and the city Vercel's edge attaches to that address. The page's code keeps none of it, and still sends none of what it collected.";

interface Seen {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

/** Asks this site's own function what it saw in the request. No collected data travels with the call. */
async function ask(): Promise<{ seen: Seen; edge?: string } | undefined> {
  try {
    const res = await fetch("/api/where", { signal: AbortSignal.timeout(3000) });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return undefined;
    // "icn1::iad1::…" — the first token is the edge that took the request.
    return { seen: await res.json(), edge: res.headers.get("x-vercel-id")?.split("::")[0] || undefined };
  } catch {
    return undefined;
  }
}

export async function collectServer(): Promise<Section> {
  const answer = await ask();
  const results: CollectorResult[] = answer
    ? [
        result("IP address", answer.seen.ip),
        result("Country", answer.seen.country, "COARSE"),
        result("Region", answer.seen.region, "COARSE"),
        result("City", answer.seen.city, "COARSE"),
        result(
          "Coordinates",
          answer.seen.latitude && answer.seen.longitude ? `${(+answer.seen.latitude).toFixed(2)}, ${(+answer.seen.longitude).toFixed(2)}` : undefined,
          "COARSE",
        ),
        result("IP timezone", answer.seen.timezone, "COARSE"),
        result("Edge region", answer.edge),
      ]
    : NAMES.map((n) => unavailable(n, "no server behind this build; deployed on Vercel it answers"));
  return { title: "Server", note: NOTE, results };
}
```

- [ ] **Step 2: main.ts에 등록**

`src/main.ts`의 import 목록에 `collectNetwork` 줄 다음으로 추가한다.

```ts
import { collectServer } from "./collectors/where";
```

`COLLECTORS`에서 `["Network", collectNetwork],` 다음 줄에 추가한다.

```ts
  ["Server", collectServer],
```

- [ ] **Step 3: 빌드와 로컬 동작 확인**

Run: `set -eo pipefail; npm run build 2>&1 | tail -2`
Expected: 빌드 통과.

브라우저 확인(Playwright MCP 또는 실제 브라우저): `npx vite preview --port 4173 --strictPort`를 띄우고 `http://localhost:4173/`을 연다. "Server" 섹션이 Network 다음에 나오고 7행 모두 `no server behind this build; deployed on Vercel it answers` UNAVAILABLE, console error 0, 히어로 수집 시간이 0.5 s 안팎이어야 한다(로컬 404는 즉시 돌아온다).

- [ ] **Step 4: 커밋**

```bash
git add src/collectors/where.ts src/main.ts
git commit -m "feat: /api/where 응답을 보여주는 Server 섹션 추가"
```

---

### Task 7: "Deductions" 섹션과 히어로 Verdict

**Files:**
- Create: `src/collectors/deductions.ts`
- Modify: `src/main.ts:37-38` (sections 조립)
- Modify: `src/ui/render.ts:60-86` (renderHero)
- Modify: `index.html:23-27` (#hero)
- Modify: `src/style.css:105-118` 근처 (#hero)

**Interfaces:**
- Consumes: Task 4의 `deduce(sections)`; Task 2의 `evidence` 필드.
- Produces: `export function collectDeductions(sections: Section[]): Section` — title `"Deductions"`, 첫 행 `Verdict`. `renderHero`가 `Deductions/Verdict`를 `#hero .verdict`에 쓴다.

- [ ] **Step 1: 수집기 작성**

`src/collectors/deductions.ts`:

```ts
import { deduce } from "../deduce/rules";
import { result, type Section } from "../types";

/** Not a collector of new data: what the rows above add up to, with the rows named. */
export function collectDeductions(sections: Section[]): Section {
  return {
    title: "Deductions",
    note: "What a detective would conclude from the other sections, each with the rows it leaned on. Rules, not machine learning, and the rules are in the source; every line is a guess with a stated basis.",
    results: deduce(sections).map((d) => ({ ...result(d.name, d.value, "INFERRED"), evidence: d.evidence })),
  };
}
```

- [ ] **Step 2: main.ts에서 섹션 조립**

`src/main.ts`의 import에 추가한다.

```ts
import { collectDeductions } from "./collectors/deductions";
```

`const sections = [await guard("Fingerprint", () => collectFingerprint(collected)), ...collected];` 를 다음으로 바꾼다.

```ts
const sections = [
  await guard("Fingerprint", () => collectFingerprint(collected)),
  await guard("Deductions", () => collectDeductions(collected)),
  ...collected,
];
```

- [ ] **Step 3: 히어로에 Verdict**

`index.html`의 `<p class="print pending">computing&hellip;</p>` 바로 다음 줄에 추가한다.

```html
        <p class="verdict"></p>
```

`src/ui/render.ts`의 `renderHero`에서 `const rows = sections.filter((s) => s.title !== "Fingerprint")…` 줄을 다음으로 바꾼다(Deductions는 읽은 신호가 아니다).

```ts
  const rows = sections.filter((s) => s.title !== "Fingerprint" && s.title !== "Deductions").flatMap((s) => s.results);
```

그리고 그 줄 앞에 Verdict 채우기를 넣는다.

```ts
  const verdict = sections.find((s) => s.title === "Deductions")?.results.find((r) => r.name === "Verdict");
  root.querySelector<HTMLElement>(".verdict")!.textContent = verdict?.supported ? String(verdict.value) : "";
```

`src/style.css`의 `#hero .note { … }` 줄 앞에 추가한다.

```css
.verdict { margin: 0; padding: 0 1rem 1rem; color: var(--accent); font-size: 1rem; }
.verdict:empty { display: none; }
```

- [ ] **Step 4: 빌드·테스트·브라우저 확인**

Run: `set -eo pipefail; npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -2`
Expected: 통과.

브라우저(`npx vite preview --port 4173 --strictPort`, 실제 Chrome): 히어로 composite 아래 accent 색 Verdict 한 줄("Probably a docked MacBook Pro 14 or a Mac mini (M4 Pro, 24 GB+), on an external 1920×1080 monitor." 같은 문장. 로컬은 Server가 없어 "in …"이 빠진다). "Deductions" 섹션이 Fingerprint 다음에 8행(Verdict, Machine, Memory, Display, Desk, Where, Languages, Connection), 각 행 아래 `evidence: …` 흐린 줄, 배지 전부 INFERRED. console error 0. 히어로 요약의 "signals read" 수가 이전(134)에서 Server 7행만큼만 늘었는지(Deductions는 제외) 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/collectors/deductions.ts src/main.ts src/ui/render.ts index.html src/style.css
git commit -m "feat: 추리 결과를 보여주는 Deductions 섹션과 히어로 Verdict 추가"
```

---

### Task 8: 서버 요청을 설명하는 문구 수정

**Files:**
- Modify: `src/ui/render.ts` (renderHero의 요약 문장)
- Modify: `index.html` (footer)

- [ ] **Step 1: 히어로 요약 문구**

`src/ui/render.ts`의 renderHero에서 `Nothing was stored or sent.` 를 `Nothing was stored; nothing collected was sent.` 로 바꾼다.

- [ ] **Step 2: 푸터 문구**

`index.html`의 푸터에서

```html
<p><a href="https://github.com/khkim6040/browser-fingerprint-lab">Source on GitHub</a>. Everything runs in your browser; nothing is sent anywhere.</p>
```

를 다음으로 바꾼다.

```html
<p><a href="https://github.com/khkim6040/browser-fingerprint-lab">Source on GitHub</a>. Everything is computed in your browser and none of it is uploaded. The one request to this site's own server asks only what it already saw: where your request came from.</p>
```

- [ ] **Step 3: 빌드 확인**

Run: `set -eo pipefail; npm run build 2>&1 | tail -2`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/ui/render.ts index.html
git commit -m "docs: 서버 요청을 설명하도록 히어로·푸터 문구 수정"
```

---

### Task 9: README 갱신

**Files:**
- Modify: `README.md:7-20`, `README.md:35-53`, `README.md:65-`(Development)

- [ ] **Step 1: 소개 문단**

`README.md` 7~12행의 문단 전체를 다음으로 교체한다.

```markdown
An educational demo of what a web page learns about your device **without ever
showing a permission prompt**. No dialog to accept, no button to click — the
page just reads what the browser hands out for free, folds about 140 of those
signals into one composite fingerprint, reads them like a detective (which Mac,
which monitor, which city), and invites you to test whether it can recognise
you again after a reload, a restart, incognito, or another browser. Every
section header counts how many of its signals this browser exposes.
```

- [ ] **Step 2: 원칙 첫 항목**

```markdown
- **Frontend only.** Nothing is sent anywhere. There is no server, no analytics,
  no cookie, no persistent storage. Reload and the page starts from nothing.
```

를 다음으로 바꾼다.

```markdown
- **Nothing you collected leaves the browser.** No analytics, no cookie, no
  persistent storage; reload and the page starts from nothing. The one request to
  this site's own server (`/api/where`) carries no data: it asks what the server
  already saw in the request — the address the reply had to reach — and returns
  Vercel's city-level lookup of it. Nothing is stored there either.
```

- [ ] **Step 3: 섹션 표**

`| Fingerprint | … |` 행 바로 아래에 추가한다.

```markdown
| Deductions | What a detective concludes from the rows below, each with the rows it leaned on: chip and product line from the WebGL renderer and core count, a memory floor, built-in versus external display, Dock and window state, IP city versus the browser clock (a VPN tell), languages, distance to the CDN edge. Rules over rows, not machine learning |
```

`| Network | … |` 행 바로 아래에 추가한다.

```markdown
| Server | What the request told the server before any script ran: IP address, country, region, city, coordinates and timezone from Vercel's geolocation headers, plus the edge region that answered. Echoed, never stored |
```

표 아래 `The unmasked WebGL renderer usually names the exact GPU …` 문단 다음에 문단을 추가한다.

```markdown
The deductions are plain rules in `src/deduce/rules.ts` over data tables in
`src/deduce/tables.ts` (Apple chips → products, built-in panels, GPU classes).
Every real-device export dropped into `src/deduce/fixtures/` with a few expected
substrings becomes a test case, so the tables get sharper as exports come in.
```

- [ ] **Step 4: Development 절**

`npm test` 주석 줄을 다음으로 바꾼다.

```
npm test        # self-checks for result/guard, sha256, the diff, the benchmark workloads, the deduction tables and rules (real exports as fixtures), and /api/where
```

- [ ] **Step 5: 커밋**

```bash
git add README.md
git commit -m "docs: README에 Deductions, Server 섹션과 api/where 안내 추가"
```

---

### Task 10: 버전 1.1.0

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: 범프**

Run: `npm version 1.1.0 --no-git-tag-version && git diff --stat`
Expected: `package.json`, `package-lock.json` 두 파일만 변경.

- [ ] **Step 2: 전체 확인**

Run: `set -eo pipefail; npm test 2>&1 | grep -cE ': ok|\.ts ok' && npm run build 2>&1 | tail -3`
Expected: `9`, 빌드 통과. `dist/assets/worker-*.js`에 `Math.imul`이 남아 있는지 `grep -c Math.imul dist/assets/worker-*.js` → `1`.

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: 버전 1.1.0으로 범프"
```

---

### Task 11: push 전 브라우저 검증 (커밋 없음)

**Files:** 없음 (검증만)

- [ ] **Step 1: 프로덕션 번들로 실제 Chrome 확인**

`npx vite preview --port 4173 --strictPort`를 백그라운드로 띄우고 Playwright MCP(실제 Chrome)로 `http://localhost:4173/`을 연다. 확인 항목:
- 히어로: composite, 그 아래 Verdict 한 줄.
- 섹션 순서: Fingerprint, Deductions, Environment, …, Network, Server, Browser APIs.
- Deductions 8행, 각 행 `evidence:` 줄, 전부 INFERRED. Where는 "IP location unavailable here; the clock says …".
- Server 7행 UNAVAILABLE(이유 문구).
- console error 0 (`browser_console_messages`).
- iframe을 3번 순서대로 띄워 composite가 매번 같고 이전 배포(v1.0.0)와도 같은지(Server/Deductions는 카테고리 밖).
- 전체 수집 시간 0.5 s 안팎.

- [ ] **Step 2: headless 3종**

스크래치패드 `xbrowser.mjs`가 없으면 아래를 `xbrowser.mjs`로 저장해 실행한다(HANDOFF의 절대경로 Playwright).

```js
import { chromium, firefox, webkit } from "/Users/gwanhokim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
for (const [name, type] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:4173/");
  await page.waitForFunction(() => !document.querySelector("#hero .print")?.classList.contains("pending"), null, { timeout: 20000 });
  const out = await page.evaluate(() => ({
    verdict: document.querySelector("#hero .verdict")?.textContent,
    deductions: [...document.querySelectorAll("#sections section")].find((s) => s.querySelector("h2")?.textContent?.startsWith("Deductions"))?.querySelectorAll(".row").length,
    exceptions: [...document.querySelectorAll(".value.absent")].filter((v) => /^[A-Z][a-z]+Error|TypeError|ReferenceError/.test(v.textContent ?? "")).length,
  }));
  console.log(name, JSON.stringify(out), "console errors:", errors.length);
  await browser.close();
}
```

Run: `node xbrowser.mjs`
Expected: 3종 모두 `deductions: 8` 이상 아니면 규칙이 빠진 만큼 적은 수(예: webkit은 Machine이 "Safari masks…" 경로), `exceptions: 0`, console errors 0. webkit의 verdict에 "Apple Silicon"이나 "Mac"이 있어야 한다.

- [ ] **Step 3: 확인 결과를 사용자에게 보고하고 push 승인을 받는다.** 승인 전에는 push하지 않는다.

---

### Task 12: push와 프로덕션 검증

**Files:** 없음

- [ ] **Step 1: push (사용자 승인 후)**

```bash
set -eo pipefail; test -z "$(git status --short)"; git push -u origin main 2>&1 | tail -3
```

- [ ] **Step 2: 함수 배포 확인**

10초 간격으로 최대 4분:

```bash
for i in $(seq 1 24); do
  body=$(curl -s --max-time 10 -H 'accept: application/json' https://fingerprint.gwanho.com/api/where)
  if echo "$body" | grep -q '"country"'; then echo "DEPLOYED after $((i*10))s: $body"; exit 0; fi
  echo "try $i: $body" | head -c 200; echo; sleep 10
done; echo TIMEOUT; exit 1
```
Expected: `{"ip":"…","country":"KR",…,"timezone":"Asia/Seoul"}`. 응답이 HTML(404 페이지)이면 함수가 안 잡힌 것이다 → `api/where.ts`를 `export default function handler(request: Request): Response { … }` 형태로 바꿔 `fix:` 커밋 후 재확인.

- [ ] **Step 3: 프로덕션 페이지 확인**

Playwright MCP로 `https://fingerprint.gwanho.com/`: Server 7행 채워짐(IP, Country KR, City Seoul, Edge region icn1 등), Where가 "Seoul, South Korea by IP address; the browser clock agrees (Asia/Seoul), so no sign of a VPN or proxy", Verdict 끝에 "in Seoul, South Korea", Connection에 "Vercel's icn1 edge", console error 0.

- [ ] **Step 4: HANDOFF.md 갱신**

현재 상태(커밋 목록, 배포 확인), What Worked(픽스처 방식, 함수 배포 확인 방법), Next Steps(다른 기기 Export를 픽스처로 추가, Apple 표 검토 항목, Safari favicon)를 반영한다. gitignore 대상이므로 커밋하지 않는다.
