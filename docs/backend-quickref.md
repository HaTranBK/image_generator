<!--
topic: backend-quickref
keywords: result, repository, controller, dto, module, cross-table, neverthrow, prisma, swagger, common
-->

# Backend Quick Reference (AI Primary)

> Scannable entry point for any backend task. Read this before writing code.
> Full rules: `docs/backend-guideline.md` | New module: `docs/backend-new-module-workflow.md`

---

## 10 Nguyên Tắc

1. **Explicit > Implicit** — return type, decorator options, import path
2. **1 pattern duy nhất** — Result, plainToInstance, Repository, CustomException
3. **Context tại điểm viết** — TODO comment + link quickref tại method
4. **Lint > Docs** — rule trong docs phải có lint enforce
5. **Naming = Discovery** — `*.repository.ts`, `*_LABELS`, `*Schema`
6. **Generator > Manual** — `pnpm gen:module`, không tạo tay
7. **Auto-fix > Manual** — `eslint --fix` 4a, 4b
8. **Fail fast** — lint-staged → CI → build → runtime
9. **Tests = Contract** — spec demonstrate pattern
10. **AI = Junior dev mới** — viết code junior đọc được

---

## 1. Module Skeleton

```
backend/src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── provider/
│   ├── <name>.repository.ts   # PrismaService lives HERE only
│   └── <name>.extra.ts        # Relation loading (BaseExtraData)
└── dto/
    ├── create-<name>.dto.ts
    ├── update-<name>.dto.ts
    ├── query-<name>.dto.ts
    ├── <name>.dto.ts           # Generated scalars (never edit manually)
    └── <name>-extend.dto.ts    # Hand-written relations
```

Generator: `pnpm gen:module <name> [--no-controller]`

---

## 2. Result Pattern (Service)

```ts
import { Result, ok, err } from '../../common/utils/result'
import { CustomException } from '../../common/utils/custom-exception'

// All public methods must return Promise<Result<T, Error>>
async findById(id: string): Promise<Result<CustomerResponseDto, Error>> {
  const result = await this.repo.findById(id)
  if (result.isErr()) return err(result.error)
  // MUST null-guard — repo trả Result<T | null>, service KHÔNG được pass-through null
  if (!result.value) {
    return err(new CustomException('CUSTOMER_NOT_FOUND', 'Không tìm thấy', HttpStatus.NOT_FOUND))
  }
  return ok(result.value)
}
```

- `err(new CustomException(...))` for expected business errors
- `err(e instanceof Error ? e : new Error(...))` in catch blocks
- Never throw inside service methods — always return `err(...)`

### Null-guard rule (REGRESSION HAZARD)

Repo `findById` / `findUnique` / `findFirst` trả `Result<T | null, Error>`.
Service PHẢI có 2 guard liền nhau:

```ts
const result = await this.repo.findById(id)
if (result.isErr()) return err(result.error)          // guard 1: DB error
if (!result.value) return err(new CustomException(    // guard 2: not found → 404
  '<ENTITY>_NOT_FOUND', '...', HttpStatus.NOT_FOUND,
))
```

❌ Bỏ guard 2 → controller trả `200 { payload: null }` thay vì 404 (silent regression).
Exception: endpoint cho phép null (vd `findByEmail` check exists) → return `ok(result.value)` rõ ràng, đặt tên method `findByXOrNull`.

---

## 3. Repository Pattern

```ts
import { Result, ok, err } from '../../../common/utils/result'
import { createError } from '../../../common/utils/result'
import { toDto, toDtoList } from '../../../common/utils/to-dto'
import { CustomerResponseDto } from '../dto/customer-response.dto'

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
  ): Promise<Result<CustomerResponseDto | null, Error>> {
    try {
      const row = await this.prisma.customer.findUnique({
        where: { id, deletedAt: null },
      })
      return ok(row ? toDto(CustomerResponseDto, row) : null)
    } catch (error) {
      return err(createError('Failed to find customer by id', { id, error }))
    }
  }

  async findAll(
    skip: number,
    take: number,
    where: Prisma.CustomerWhereInput,
  ): Promise<Result<[CustomerResponseDto[], number], Error>> {
    try {
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        this.prisma.customer.count({ where }),
      ])
      return ok([toDtoList(CustomerResponseDto, rows), total])
    } catch (error) {
      return err(createError('Failed to list customers', { error }))
    }
  }
}
```

Service consumption pattern:

```ts
const result = await this.repo.findById(id)
if (result.isErr()) return err(result.error)
const customer = result.value   // typed as CustomerResponseDto | null
if (!customer) return err(new CustomException('CUSTOMER_NOT_FOUND', ...))
```

Rules:

- `PrismaService` injected **only** in `*.repository.ts` + `*.extra.ts` — never in service/controller
- **All public methods must return `Promise<Result<T, Error>>`** — enforced by ESLint rule `tcct-backend/repository-must-return-result` (warn)
- Wrap every Prisma call in `try/catch`, return `ok(row)` or `err(createError(...))`
- **No private `toDto` methods** — use `toDto(Dto, row)` / `toDtoList(Dto, rows)` from `common/utils/to-dto` directly
- No business logic in repository — pure data access
- **Repo NEVER throws** — kể cả `CustomException`. Throw business error trong repo = vi phạm Result contract. Service mới throw/wrap.
- IDOR prevention: scope `where` conditions inside repository methods
- **Do NOT** use `ReturnType<Repo['method']>` aliases — they now resolve to `Result<...>` and break inference; use explicit Prisma payload types instead

### PrismaService boundary — STRICT

| Location | PrismaService? | Lý do |
|----------|---------------|------|
| `*.repository.ts` | ✅ primary | CRUD chính |
| `provider/*.extra.ts` | ✅ exception | Aggregation cross-table read, return `Result` như repo |
| `*.service.ts` | ❌ CẤM | Dùng repo, hoặc `prisma.$transaction` qua repo wrapper |
| `*.controller.ts` | ❌ CẤM | |
| Bất kỳ file khác | ❌ CẤM | |

`eslint-disable tcct-backend/*` (kể cả `eslint-disable-next-line` không kèm rule name) **TUYỆT ĐỐI cấm** trên file modified trong PR. Bao gồm:

- Suppress `repository-must-return-result` để skip migrate method cũ
- Suppress để inject PrismaService trong service
- Bare `/* eslint-disable-next-line */` không chỉ định rule (suppress ALL)

Cần exception phải có ĐỦ 3:
1. ADR comment giải thích lý do (không phải "TO DO: remove when rule implemented")
2. Link migration ticket (GitHub issue / Jira ID)
3. Reviewer approve explicit trong PR description

Mass-suppression (≥3 method cùng file dùng `eslint-disable` skip migration) = sai cách. Hoặc migrate toàn bộ trong file, hoặc tách commit riêng + ticket link.

### Database transaction

Multi-table write atomic → service gọi `repository.withTransaction()`. Service **không** inject PrismaService — toàn bộ transaction đi qua repo.

```ts
// repository — expose withTransaction + accept optional tx param
async withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return this.prisma.$transaction(fn)
}

async update(id: string, data: Partial<Order>, tx?: Prisma.TransactionClient): Promise<Result<Order, Error>> {
  const client = tx ?? this.prisma
  // ...
}

// service — delegates through repo, KHÔNG inject PrismaService
async confirmOrder(id: string): Promise<Result<Order, Error>> {
  return this.orderRepo.withTransaction(async tx => {
    const orderResult = await this.orderRepo.update(id, { status: 'CONFIRMED' }, tx)
    if (orderResult.isErr()) throw orderResult.error  // throw inside tx → rollback
    await this.taskRepo.create({ orderId: id, type: 'HBCX' }, tx)
    return ok(orderResult.value)
  })
}
```

---

## 4. Cross-table Queries — A/B/C/D Decision Tree

> Pattern A and C are different layers — combining them (A+C hybrid) is the default for complex cases.

| Need                                       | Pattern                                   | Example                                                           |
| ------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------- |
| Read FK chain only                         | **A. inline include in repo**             | `prisma.customer.findUnique({ include: { routeConfigs: true } })` |
| Reuse toDto/where-builder of other domain  | **B. inject other repo** (watch circular) | `customerRepo` injects `contractorRepo`                           |
| Read + cross-domain business rule (common) | **A+C hybrid**                            | repo.include() + `otherService.assertX()`                         |
| Business logic spanning domains            | **C. service orchestrates**               | `orderService` calls `customerService.findById()`                 |
| Cross-domain filter owned by other domain  | **C only**                                | filter logic belongs to other service                             |
| Multi-table write needing atomicity        | **D. service opens $transaction**         | `prisma.$transaction(tx => repo.method(dto, tx))`                 |

Anti-patterns:

| Anti-pattern                                                         | Fix                                              |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| Service injects `otherRepo` to validate                              | Call `otherService.assertX()` instead            |
| Repo throws business error                                           | Return raw data; let service check business rule |
| Inline `include` instead of calling existing `otherService.method()` | Reuse service method (see §8 discovery protocol) |

---

## 5. Controller Pattern

```ts
import { CustomException } from '../../common/utils/custom-exception'
import { DEFAULT_SUCCESS_CODE, DEFAULT_SUCCESS_MESSAGE } from '../../common/utils/constants'
import { BaseResponseDto } from '../../common/dto/base-response.dto'

@Get(':id')
async findOne(@Param('id') id: string): Promise<BaseResponseDto<CustomerResponseDto>> {
  const result = await this.service.findById(id)
  if (result.isErr()) throw this.toException(result.error)
  return { code: DEFAULT_SUCCESS_CODE, message: DEFAULT_SUCCESS_MESSAGE, payload: result.value }
}

private toException(e: Error): CustomException {
  return e instanceof CustomException
    ? e
    : new CustomException('INTERNAL_ERROR', e.message, HttpStatus.INTERNAL_SERVER_ERROR)
}
```

- Never throw raw `Error` — always `CustomException`
- Never return raw `result.error` — always wrap with `toException()`
- Use `@ApiPaginatedResponse(ItemDto)` for paginated endpoints
- **EVERY endpoint** return `BaseResponse<T>` shape `{ code, message, payload }` — no raw `result.value` return
- `BaseResponseDto<T>` lives in `common/dto/base-response.dto.ts` (SSOT) — KHÔNG redeclare inline mỗi controller

### Auth decorators

Global JWT guard applied. Opt out via `@Public()`. Inject user via `@User()`.

```ts
@Public()                                         // skip JWT check (magic link, login)
@Get('/me')                                       // protected by default
async getMe(@User() user: JwtPayload) {}          // full JwtPayload
async getMyId(@User('id') userId: string) {}      // shortcut for `sub`
@SkipPermission()                                 // JWT required, no RBAC check
@Permissions('orders:read')                       // manual permission override (rare)
```

Permission key auto-derived: `{controller-kebab}:{methodName}` — default no manual annotation needed.

---

## 6. DTO + Swagger — 8 Cases

Standard: use `@ApiPropertyExpose` / `@ApiPropertyOptionalExpose` from `@/common/decorators` — combines `@ApiProperty` + `@Expose()` in one decorator. Required for `plainToInstance` with `excludeExtraneousValues: true`.

```ts
import {
  ApiPropertyExpose,
  ApiPropertyOptionalExpose,
  TransformDecimal,
} from '@/common/decorators'
import { Expose, Type } from 'class-transformer'

export class CustomerResponseDto {
  @ApiPropertyExpose({ type: String })
  id: string

  @ApiPropertyOptionalExpose({ type: String, nullable: true })
  taxId: string | null

  @ApiPropertyExpose({ type: Number })
  @TransformDecimal()
  balance: number

  @ApiPropertyExpose({ type: () => AddressDto })
  @Type(() => AddressDto)
  address: AddressDto
}
```

| Case               | Wrong                                     | Correct                                                                            |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Nullable field     | `@ApiProperty() field: string \| null`    | `@ApiPropertyOptionalExpose({ type: String, nullable: true })`                     |
| Array of DTO       | `@ApiProperty() items: ItemDto[]`         | `@ApiPropertyExpose({ type: [ItemDto] }) @Type(() => ItemDto)`                     |
| Nested DTO         | `@ApiProperty({ type: ItemDto })`         | `@ApiPropertyExpose({ type: () => ItemDto }) @Type(() => ItemDto)` (lazy)          |
| Record/Map         | `@ApiProperty() meta: Record<string,any>` | `@ApiPropertyExpose({ type: 'object', additionalProperties: { type: 'number' } })` |
| Paginated endpoint | custom schema                             | `@ApiPaginatedResponse(ItemDto)` on controller method                              |
| Decimal (Prisma)   | `return row.amount`                       | `@TransformDecimal() @ApiPropertyExpose({ type: Number })` on DTO field            |
| JSON field         | `field: Prisma.JsonValue`                 | explicit typed shape + cast in repo                                                |
| null vs undefined  | `field?: string` (optional)               | `field: string \| null` (nullable) — different semantics                           |
| Enum field         | `@ApiPropertyExpose({ enum: X })`         | `@ApiPropertyExpose({ type: String, enum: X })` — thiếu `type` Swagger sinh schema sai |

Response DTO: match Prisma shape → `field: T | null` (not `field?: T`)
Request DTO (update): `field?: T | null` (absent = don't update; null = clear)

Auto-fix nullable decorators: `cd backend && pnpm dlx tsx scripts/fix-nullable-decorators.ts`

### Type annotation cheatsheet — Prisma calls

Annotate `const` để Zed/IDE inline hint gọn (collapse structural → named type):

| Prisma call                      | Annotation                                                      |
| -------------------------------- | --------------------------------------------------------------- |
| `findMany()` no include          | `Model[]`                                                       |
| `findMany({ include: X })`       | `Prisma.ModelGetPayload<{ include: typeof X }>[]`               |
| `findMany({ select: { a, b } })` | `Pick<Model, 'a' \| 'b'>[]`                                     |
| `findUnique() / findFirst()`     | `Model \| null`                                                 |
| `create() / update() / delete()` | `Model`                                                         |
| `$transaction(tx => ...)`        | Annotate inner return type                                      |
| `count()`                        | `number`                                                        |
| `aggregate()`                    | `Prisma.GetXAggregateType<...>` (rare — usually leave inferred) |
| `groupBy()`                      | Leave inferred (overload phức tạp, cast `as` fail)              |

Pattern: declare type alias once per `include` shape, reuse across methods:

```ts
const customerInclude = { configs: true } satisfies Prisma.CustomerInclude
type CustomerWithConfigs = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>

async findById(id: string): Promise<Result<CustomerWithConfigs | null, Error>> {
  const row: CustomerWithConfigs | null = await this.prisma.customer.findUnique({
    where: { id },
    include: customerInclude,
  })
  return ok(row)
}
```

Same pattern for `select` (subset projection, DRY between select object + type):

```ts
const customerExportSelect = {
  name: true, email: true, phone: true, taxId: true, isActive: true,
} satisfies Prisma.CustomerSelect

type CustomerExportRow = Prisma.CustomerGetPayload<{ select: typeof customerExportSelect }>

async findManyForExport(where, take): Promise<Result<CustomerExportRow[], Error>> {
  const rows: CustomerExportRow[] = await this.prisma.customer.findMany({
    where, select: customerExportSelect, take,
  })
  return ok(rows)
}
```

❌ Avoid: `Pick<Customer, 'name'|'email'|...>` duplicates keys với `select` object → drift risk. Always use `satisfies` + `GetPayload`.

### Update DTO via PartialType / OmitType / PickType

Don't duplicate fields between `CreateXxxDto` and `UpdateXxxDto`. Derive via NestJS Swagger utility types:

```ts
import { PartialType, OmitType, PickType } from '@nestjs/swagger'

// All fields optional
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

// Exclude fields from inheritance
export class UpdateProfileDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'email'] as const),
) {}

// Pick subset
export class CustomerSummaryDto extends PickType(CustomerResponseDto, [
  'id',
  'name',
  'code',
] as const) {}
```

---

## 7. Common Taxonomy (SSOT)

Cross-module symbols go in `backend/src/common/<category>/`:

| Category       | Contents                                   |
| -------------- | ------------------------------------------ |
| `labels/`      | User-facing text (`Record<Enum, string>`)  |
| `constants/`   | Magic numbers, regex, config constants     |
| `utils/`       | Pure functions                             |
| `validators/`  | zod/class-validator schemas                |
| `error-codes/` | Error code + message registry              |
| `types/`       | Shared TypeScript interfaces               |
| `mappers/`     | Cross-module `toDto` / `parseEnum` helpers |

Local-only symbols: keep as `<module>.constants.ts` flat file inside the module.

**Discovery step (REQUIRED before defining any new export):**

```bash
grep -r "export.*<symbol>" backend/src/common/
```

1. Match found → import and reuse
2. Similar logic found → extract to `common/<category>/`
3. Truly local → keep in module

---

## 8. Anti-patterns

| Anti-pattern                                                         | Fix                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `private toDto(row) { return { id: row.id, ... } }` in repo          | Use `toDto(Dto, row)` from `common/utils/to-dto` — DRY violation                      |
| `@ApiProperty() field: string` without `@Expose()`                   | Use `@ApiPropertyExpose()` — field silently excluded by `excludeExtraneousValues`     |
| `field: Prisma.JsonValue` in response DTO                            | Declare explicit typed shape — leaks internal Prisma type to API contract             |
| Service injects `otherRepo` to validate                              | Call `otherService.assertX()` instead                                                 |
| Repo throws business error                                           | Return raw data; let service check business rule                                      |
| Inline `include` instead of calling existing `otherService.method()` | Reuse service method (see §9 discovery protocol)                                      |
| Literal status strings `['PICKED_UP', 'IN_TRANSIT', ...]`            | Import Prisma enum — see "Prisma enum usage" below                                    |
| `Pick<T, 'a' \| 'b' \| 'c'>` duplicating `select` keys               | `satisfies` + `GetPayload` derive type from const (see §6 type annotation cheatsheet) |

### Prisma enum usage — always import, never literal

```ts
// ❌ WRONG — typo no compile catch, schema rename silent break
const activeStatuses = new Set(['PICKED_UP', 'IN_TRANSIT', 'COMPLETED'])

// ✅ RIGHT — type-safe, refactor-friendly
import { LegStatus } from '@prisma/client'
const ACTIVE_LEG_STATUSES = new Set<LegStatus>([
  LegStatus.PICKED_UP,
  LegStatus.IN_TRANSIT,
])

// ✅ Cross-module reuse → move sang common/constants/leg-status.ts
export const ACTIVE_LEG_STATUSES: ReadonlySet<LegStatus> = new Set([
  LegStatus.PICKED_UP,
  LegStatus.IN_TRANSIT,
])
```

Why: typo `PICKED_UPP` compile OK runtime fail. Schema rename `PICKED_UP` → `PICKEDUP` silent break literal strings. IDE refactor skip literals. Drift across modules when list repeated.

---

## 9. Module Checklist (AI Orchestration Discovery Protocol)

**Before writing logic that touches another domain:**

```bash
grep -r "async.*<keyword>" backend/src/modules/<other-domain>/*.service.ts
```

- Method returning `Promise<Result<...>>` found → inject that service, don't rewrite
- Not found → apply A/B/C/D decision tree (§4)

**New module creation:**

1. `pnpm gen:module <name> [--no-controller]`
2. Fill DTOs using 8-case table (§6)
3. Fill repository queries (§3)
4. Fill service business logic (§2)
5. Run discovery (above) for every cross-domain call
6. Fill controller (§5)
7. `pnpm lint --fix && tsc --noEmit`
8. Register in `app.module.ts` + `npx prisma migrate dev` if schema changed
9. Write unit tests: repo `toDto` + service happy/error paths

**Error code conventions:**
| Category | Pattern | Example |
|---|---|---|
| Not Found | `<ENTITY>_NOT_FOUND` | `CUSTOMER_NOT_FOUND` |
| Duplicate | `<ENTITY>_EXISTS` | `EMAIL_EXISTS` |
| Validation | `<FIELD>_INVALID` | `EMAIL_INVALID` |
| Auth | `AUTH_<ACTION>` | `AUTH_TOKEN_EXPIRED` |
| Permission | `PERMISSION_<TYPE>` | `PERMISSION_DENIED` |

### Error code registry contract

`backend/src/common/error-codes/<domain>.ts` exports `Record<Code, { message, status }>`.

```ts
// common/error-codes/dispatch.ts
export const DISPATCH_ERRORS = {
  VEHICLE_DOUBLE_BOOKING: { message: 'Xe đã được phân...', status: 409 },
} as const
```

Repo `createError(code, ...)` PHẢI dùng EXACT key trong registry:

```ts
// ✅ exact match
return err(createError('VEHICLE_DOUBLE_BOOKING', { vehicleId }))

// ❌ silent HTTP 500 vì to-exception không map được
return err(createError('DOUBLE_BOOKING', { vehicleId }))
```

`to-exception.ts` map theo key EXACT (`errors[code]`), KHÔNG dùng `message.includes(key)` substring — substring match fragile, mismatch → 500 thay vì status đúng.

→ Full rules: `docs/backend-guideline.md`
→ New module workflow: `docs/backend-new-module-workflow.md`
→ Template: `backend/templates/_module/`

---

## 10. Conventions

### Naming

- **PascalCase**: classes, types, interfaces, enums (`OrderService`, `OrderStatus`)
- **camelCase**: functions, methods, variables (`getUserById`, `isLoading`)
- **UPPER_SNAKE_CASE**: constants (`DEFAULT_PAGE_SIZE`, `JWT_EXPIRY_DAYS`)
- **kebab-case**: file names (`orders.service.ts`, `customer-route-config.dto.ts`)
- **\_leadingUnderscore**: private members (`private _cache: Map<...>`)
- No `I` prefix for interfaces (`OrderRepository`, not `IOrderRepository`)

### Conventional commits

`<type>: <subject>` — `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

### Import order

1. Node built-ins (`fs`, `path`)
2. Third-party packages (`@nestjs/common`, `neverthrow`)
3. Local imports with alias (`@/common/utils`, `../module.service`)
4. Type-only imports (`import type { Customer } from '@prisma/client'`)

❌ Cấm: absolute `src/...` path (vd `import 'src/modules/zone/dto/...'`) — break khi alias không config, drift với rest of file. Dùng relative `../../` hoặc alias `@/`.

### API endpoints

Resource-based, lowercase, dash-separated: `GET /api/v1/orders/:id/containers/:containerId/assign`

### File size limits

- Backend services: < 300 lines (modularize at 200+)
- Frontend components: < 200 lines
- Utilities: < 100 lines

### Explicit return type — every exported fn + public method

ESLint: `@typescript-eslint/explicit-module-boundary-types` (warn)

```ts
// ✅ explicit return type
export function formatVnDate(date: Date): string { ... }
async findOne(@Param('id') id: string): Promise<BaseResponse<CustomerResponseDto>> { ... }
private toEntity(dto: CreateDto): Customer { ... }

// ❌ implicit — caller phải đoán, refactor break không catch
export function formatVnDate(date: Date) { ... }
async findOne(@Param('id') id: string) { ... }
```

Lý do: API contract rõ ràng, IDE rename catch được, refactor safe. Skip rule: `// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types` khi return type quá phức tạp (Prisma overload).

---

## 11. Production Safety

### Schema changes MUST go through Prisma migrations

**NEVER:**

- ❌ Sửa schema trực tiếp Postgres (psql `ALTER TABLE`, DBeaver, pgAdmin)
- ❌ `prisma db push` (chỉ prototyping cá nhân, không commit)
- ❌ INSERT raw vào `_prisma_migrations` để fake "đã apply"

**ALWAYS:**

1. Edit `prisma/schema/*.prisma`
2. `npx prisma migrate dev --name <name>`
3. Review + commit schema + migration cùng PR

Lý do: DB lệch state → migrations không reproducible giữa dev/staging/prod → fail P3006/P3009 chặn pipeline.

### Migration SQL must use `IF EXISTS` for DROP

Prisma generate ra dạng KHÔNG idempotent. Sửa tay sau mỗi `prisma migrate dev` trước commit.

```sql
-- ❌ SAI — fail nếu object không tồn tại → P3009 khoá pipeline
ALTER TABLE "orders" DROP CONSTRAINT "orders_xxx_fkey";
DROP INDEX "idx_xxx";
DROP TABLE "legacy";
ALTER TABLE "orders" DROP COLUMN "legacy_field";

-- ✅ ĐÚNG
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_xxx_fkey";
DROP INDEX IF EXISTS "idx_xxx";
DROP TABLE IF EXISTS "legacy";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "legacy_field";
```

Áp dụng: `DROP CONSTRAINT/INDEX/TABLE/COLUMN/TRIGGER/FUNCTION/TYPE/SCHEMA`.

**Recovery khi P3009 fail**:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

---

## 12. Refactor / Migration Checklist

Khi migrate legacy module sang Result/Repository pattern:

```bash
# 1. Service không còn this.prisma (BẮT BUỘC = 0)
grep -n "this\.prisma" backend/src/modules/<name>/<name>.service.ts | wc -l

# 2. Service không inject PrismaService
grep -n "PrismaService" backend/src/modules/<name>/<name>.service.ts

# 3. Repo không throw business error
grep -n "throw new CustomException\|throw new Error" backend/src/modules/<name>/provider/

# 4. Không có eslint-disable mới trên tcct-backend rules
git diff origin/main -- backend/src/modules/<name>/ | grep "eslint-disable.*tcct-backend"

# 5. Không có private toDto
grep -n "private toDto\|private mapToDto" backend/src/modules/<name>/

# 6. Discovery: method mới có trùng method cũ không
grep -n "async find\|async get" backend/src/modules/<name>/provider/*.repository.ts
```

PR description liệt kê method migrate + grep counts trên = 0. Reviewer check completeness — không merge khi count > 0.

---

## 13. *.extra.ts Spec

`provider/<name>.extra.ts` — aggregation / cross-domain read helper. Quy tắc:

```ts
@Injectable()
export class CustomerExtra {
  constructor(private readonly prisma: PrismaService) {}  // ✅ allowed exception

  async loadAggregates(
    ids: string[],
  ): Promise<Result<Map<string, AggregateDto>, Error>> {  // Result như repo
    try {
      const rows = await this.prisma.order.groupBy({
        by: ['customerId'],
        where: { customerId: { in: ids } },
        _count: true,
      })
      return ok(new Map(rows.map(r => [r.customerId, ...])))
    } catch (error) {
      return err(createError('Failed to load customer aggregates', { error }))
    }
  }
}
```

Rules:
- Inject `PrismaService` — exception duy nhất ngoài repo
- Public method return `Promise<Result<T, Error>>`
- KHÔNG business logic — chỉ aggregation/derived field read
- File size < 200 lines, > thì split theo concern
- Service inject `XExtra` riêng, không trộn vào repo

---

## 14. File Upload Pattern

### Shared Helpers

#### FileValidators

Location: `backend/src/common/utils/file-validators.ts`

**Purpose:** Centralized file validation (MIME type, size, existence)

**Usage:**
```typescript
import { FileValidators } from '@/common/utils/file-validators'

// In controller method
FileValidators.validateUploadFile(file, {
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeBytes: 10 * 1024 * 1024,
  context: 'EIR', // Optional, for error messages
})
// Throws CustomException if validation fails
```

**Validation Logic:**
- File existence check → `FILE_REQUIRED`
- MIME type whitelist → `INVALID_FILE_TYPE`
- Size limit → `FILE_TOO_LARGE`

**When to use:** ALL file upload endpoints (documents, EIR, driver license, etc.)

---

#### PortalHelpers

Location: `backend/src/common/utils/portal-helpers.ts`

**Purpose:** Infer `Portal` enum from user role code

**Usage:**
```typescript
import { PortalHelpers } from '@/common/utils/portal-helpers'

// In controller method
const uploaderPortal = PortalHelpers.inferFromRole(user.roleCode)
// Returns: Portal.CONTRACTOR | Portal.CUSTOMER | Portal.DRIVER | Portal.OPERATIONS
```

**Mapping Logic:**
- Role contains "CONTRACTOR" → `Portal.CONTRACTOR`
- Role contains "CUSTOMER" → `Portal.CUSTOMER`
- Role contains "DRIVER" → `Portal.DRIVER`
- Default → `Portal.OPERATIONS`

**Case-insensitive:** Works with `roleCode` in any case

---

### Thin Wrapper Pattern

**Definition:** Controller delegates core logic to service, adds domain-specific validation/transformation.

**Example: EIR Upload**

```typescript
// EIR-specific controller (thin wrapper)
async uploadEir(file, orderId, user) {
  // 1. Validate file (shared helper)
  FileValidators.validateUploadFile(file, { 
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 10 * 1024 * 1024,
    context: 'EIR'
  })
  
  // 2. Domain-specific validation (EIR requirement)
  await validateContractorAssignment(orderId, user)
  
  // 3. Delegate to shared service
  const document = await documentService.uploadAndCreate(...)
  
  // 4. Domain-specific processing (EIR extraction)
  const extraction = await eirExtractionService.extractAndSave(...)
  
  // 5. Compose domain-specific response
  return { documentId, status, extractedData, confidence }
}
```

**Fail-Fast Behavior (AI Extraction):**
- If extraction queue unavailable (Redis down), upload fails immediately with 503
- Document marked as failed in DB (`extractedData._enqueueFailed = true`)
- Error message: "Không thể xử lý AI ngay bây giờ, vui lòng thử lại sau"
- Prevents silent failures where document stuck in PENDING forever

**Benefits:**
- Code reuse (file validation, upload logic)
- Clear separation (domain vs. infrastructure)
- Testability (mock service layer)
- Maintainability (fix bugs once)

**When to use:**
- Multiple endpoints share core logic but differ in validation/response
- Domain-specific requirements (permissions, business rules)
- Avoid heavy service coupling (keep controllers focused)

---

## 15. PR Checklist (Copy vào PR description)

```markdown
- [ ] Service không inject PrismaService, không `this.prisma.*` (§3)
- [ ] Repo return `Result<T, Error>`, không throw (§3)
- [ ] Service null-guard sau findById/findUnique (§2 null-guard rule)
- [ ] DTO dùng `@ApiPropertyExpose` / `@ApiPropertyOptionalExpose` (§6)
- [ ] Controller return `BaseResponse<T>` shape, dùng `toException()` wrap (§5)
- [ ] `createError(code, ...)` key match registry exact (§9 error code contract)
- [ ] Không `eslint-disable tcct-backend/*` mới
- [ ] Không absolute `src/...` import (§10)
- [ ] Không private `toDto` / `mapToDto` (§8)
- [ ] Refactor: grep counts trong §12 = 0
```
