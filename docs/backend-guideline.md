# Backend Guideline

> Master guide for TCCT NestJS + Prisma backend. Each section links to detailed rule files in `backend/`.
> **For quick lookup: see [backend-quickref.md](./backend-quickref.md) (AI-optimized, ≤250 lines).**
> **For new modules: see [backend-new-module-workflow.md](./backend-new-module-workflow.md).**

---

## Quick Reference

| Topic                 | Rule File                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| AI Primary Entry      | [backend-quickref.md](./backend-quickref.md) — 10 principles, decision trees, anti-patterns       |
| Request/Response Flow | [backend-flow-overview.mdc](./backend/backend-flow-overview.mdc)                                 |
| Module Structure      | [module-organization.mdc](./backend/module-organization.mdc)                                     |
| Project Layout        | [project-structure-modules-overview.mdc](./backend/project-structure-modules-overview.mdc)       |
| Import Aliases        | [import-aliases-and-structure.mdc](./backend/import-aliases-and-structure.mdc)                   |
| Error Handling        | [error-handling.mdc](./backend/error-handling.mdc)                                               |
| neverthrow Pattern    | [neverthrow-service-controller-pattern.mdc](./backend/neverthrow-service-controller-pattern.mdc) |
| API Response          | [api-response-and-custom-exception.mdc](./backend/api-response-and-custom-exception.mdc)         |
| DTO & Validation      | [validation-and-dto.mdc](./backend/validation-and-dto.mdc)                                       |
| DTO Swagger           | [dto-swagger-nullability.mdc](./backend/dto-swagger-nullability.mdc)                             |
| ExtraData Pattern     | [extend-dto-extra-data-pattern.mdc](./backend/extend-dto-extra-data-pattern.mdc)                 |
| DTO Layering          | [extra-data-dto-layering.mdc](./backend/extra-data-dto-layering.mdc)                             |
| Prisma Schema         | [prisma-schema-splitting.mdc](./backend/prisma-schema-splitting.mdc)                             |
| Prisma Migration Safety | [prisma-migration-safety.mdc](./backend/prisma-migration-safety.mdc)                           |
| Swagger & Type Gen    | [swagger-dto-type-generation.mdc](./backend/swagger-dto-type-generation.mdc)                     |
| SLA Rules             | [sla-rules.mdc](./backend/sla-rules.mdc)                                                         |
| SLA Event-Driven      | See [sla-event-mapping.md](./sla-event-mapping.md) + Section 17 ⬇️                               |
| AI Module             | See [system-architecture.md](./system-architecture.md#ai-shared-layer) + implementation notes ⬇️  |
| Repository Pattern    | Section 11 below (simple injected classes, no BaseRepository)                                    |

---

## 1. Architecture Overview

**Request Lifecycle:**

```
Client → Controller (validation) → Service (business logic) → Repository (data) → Response
```

**Global Middleware:**

- `JwtAuthGuard` — JWT validation + token blacklist
- `HttpExceptionFilter` — standardized error responses
- `ValidationPipe` — DTO validation
- `DecimalSerializerInterceptor` — Prisma Decimal → number

→ Details: [backend-flow-overview.mdc](./backend/backend-flow-overview.mdc)

---

## 2. Project Structure

```
backend/
├── src/                    # NestJS application
│   ├── config/             # Database, minio, redis, mail
│   ├── common/             # Shared helpers, decorators, guards, interceptors, filters
│   ├── prisma/             # PrismaService singleton
│   └── modules/            # Feature modules
│       ├── auth/           # Authentication + JWT
│       ├── rbac/           # Role-based access control
│       ├── user/           # User management
│       ├── order/          # Order domain + state machine + bulk ops
│       ├── assignment/     # Order assignments
│       ├── contractor/     # Contractor management
│       ├── customer/       # Customer management
│       ├── location/       # Location/zone data
│       ├── route/          # Route management
│       ├── document/       # Document management
│       ├── task/           # Task management
│       ├── container/      # Container tracking
│       ├── magic-link/     # Magic link flow
│       ├── notification/   # Email/notifications
│       ├── sla/            # SLA engine
│       ├── audit-log/      # Audit trail & compliance
│       ├── dashboard/      # Dashboard metrics & KPIs
│       ├── analytics/      # Orders, SLA, contractor analytics
│       ├── ai/             # AI extraction layer (ContentBlockBuilder, CostTracker, providers)
│       ├── booking-extraction/  # Booking PDF extraction + order auto-fill
│       ├── eir-extraction/      # EIR AI vision extraction + apply-to-leg workflow
│       ├── port-services/       # Port terminal service tracking (customs, strapping)
│       ├── order-io/       # Orders import/export (xlsx, csv)
│       └── [infrastructure modules]
├── prisma/                 # Prisma configuration
│   ├── schema/             # Multi-file Prisma schema (domain-split)
│   └── seed/               # 18 modular seed files
└── test/                   # E2E tests
```

→ Details: [project-structure-modules-overview.mdc](./backend/project-structure-modules-overview.mdc)

---

## 3. Module Organization

Each module follows this structure:

```
src/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── dto/                    # Request/response DTOs
│   ├── create-<module>.dto.ts
│   ├── update-<module>.dto.ts
│   ├── query-<module>.dto.ts
│   ├── <module>.dto.ts              # Generated DTO (scalars)
│   └── <module>-extend.dto.ts       # Hand-written (relations)
├── provider/               # Data access layer
│   ├── <module>.repository.ts       # Plain class, inject PrismaService
│   └── <module>.extra.ts            # Extra/extend data builders
├── guards/                 # Module-specific guards
└── decorators/             # Module-specific decorators
```

**Key principle:** All repositories are `@Injectable()` classes that inject `PrismaService` and return `Result<T, Error>` from all methods.

→ Details: [module-organization.mdc](./backend/module-organization.mdc)

---

## 4. Service → Controller Pattern

**Service:** Always return `Result<T, Error>`:

```ts
async create(dto: CreateDto): Promise<Result<Entity, Error>> {
  if (invalid) return err(createError('Invalid', { dto }));
  return ok(await this.repo.create(dto));
}
```

**Controller:** Check result, throw `CustomException` or return `BaseResponse`:

```ts
const result = await this.service.create(dto)
if (result.isErr()) {
  throw new CustomException(
    'CREATE_ERROR',
    result.error.message,
    HttpStatus.BAD_REQUEST,
  )
}
return { code: 200, message: 'Success', payload: result.value }
```

→ Details: [neverthrow-service-controller-pattern.mdc](./backend/neverthrow-service-controller-pattern.mdc)

---

## 5. DTO Layering

**Two-layer pattern** for response DTOs (simplified from 3 layers):

| Layer                      | Purpose                            | Generated? |
| -------------------------- | ---------------------------------- | ---------- |
| `XxxDto`                   | Base scalar fields only            | ✅ Yes     |
| `XxxExtendDto extends Dto` | + relation props + computed fields | ❌ No      |

**Key principles:**

- `XxxDto` is **generated by Prisma** — never manually add relations to it
- `XxxExtendDto` is **hand-written** — contains all relation properties with `@ApiProperty`
- Use `BaseExtraData<XxxExtendInclude, XxxExtendDto>` for relation loading
- Config-driven queries via `xxxExtendConfig` (no manual Prisma includes)

**Relation patterns supported:**

- **n:1** (this entity has FK) — single object or null
- **1:1 owning** (this entity has unique FK) — single object or null
- **1:1 back-ref** (other side has FK) — single object or null
- **1:n** (other side has FK pointing here) — array
- **n:n** (via junction table) — array

→ Details: [extend-dto-extra-data-pattern.mdc](./backend/extend-dto-extra-data-pattern.mdc)

---

## 6. Error Handling

**Error Flow:**

```
Service (Result<T, Error>)
    ↓
Controller (checks isErr())
    ↓
throw CustomException
    ↓
HttpExceptionFilter (global)
    ↓
Standardized error response
```

**Error Codes:** UPPER_SNAKE_CASE conventions:

| Category   | Pattern              | Example              |
| ---------- | -------------------- | -------------------- |
| Validation | `<FIELD>_INVALID`    | `EMAIL_INVALID`      |
| Not Found  | `<ENTITY>_NOT_FOUND` | `USER_NOT_FOUND`     |
| Duplicate  | `<ENTITY>_EXISTS`    | `EMAIL_EXISTS`       |
| Auth       | `AUTH_<ACTION>`      | `AUTH_TOKEN_EXPIRED` |
| Permission | `PERMISSION_<TYPE>`  | `PERMISSION_DENIED`  |
| External   | `<SERVICE>_ERROR`    | `DHL_API_ERROR`      |

**HTTP Status Mapping:**

| Scenario           | Status | Code Example             |
| ------------------ | ------ | ------------------------ |
| Invalid input      | 400    | `VALIDATION_ERROR`       |
| Not authenticated  | 401    | `AUTH_REQUIRED`          |
| Not authorized     | 403    | `PERMISSION_DENIED`      |
| Resource not found | 404    | `USER_NOT_FOUND`         |
| Conflict/duplicate | 409    | `EMAIL_EXISTS`           |
| External failure   | 502    | `EXTERNAL_SERVICE_ERROR` |
| Internal error     | 500    | `INTERNAL_ERROR`         |

**CustomException Usage:**

```ts
throw new CustomException(
  'ERROR_CODE', // UPPER_SNAKE_CASE
  'User-friendly message', // Safe for client display
  HttpStatus.BAD_REQUEST, // HTTP status code
  { optionalDebugData }, // Non-sensitive debug info
)
```

**Rules:**

- Never throw raw `Error` in controllers — always use `CustomException`
- Never expose internal errors/stack traces to clients
- Always log errors with context for debugging
- Service errors via neverthrow, controller converts to CustomException

→ Details: [error-handling.mdc](./backend/error-handling.mdc)

---

## 7. Prisma Schema Organization

**Splitting principles:**

- **Group by relation clusters** — models with tight 1:n or n:n relations stay in same file
- **One file = one domain** — clear domain boundaries
- **Parent-child together** — never split parent/child models across files

**Examples:**

- ✅ `order.prisma`: `Order` + `Parcel` + `ScanEvent` (1:n relations)
- ✅ `accounting.prisma`: `Invoice` + `InvoiceItem` + `Payment` (parent-children)
- ✅ `flight.prisma`: `Flight` + `FlightOrder` (n:n junction)
- ❌ Don't create `parcel.prisma` separate from `order.prisma`
- ❌ Don't create god files with unrelated models

**Current domain files:**
| File | Models |
| --------------------- | ----------------------------------------- |
| `base.prisma` | datasource + generators |
| `enum.prisma` | all enums (avoid name collisions) |
| `user.prisma` | User, Staff, Customer, CustomerAddress |
| `order.prisma` | Order, Parcel, ScanEvent |
| `accounting.prisma` | Invoice, InvoiceItem, Payment |
| `flight.prisma` | Flight, FlightOrder |
| `geo.prisma` | Country, Warehouse |
| `pricing.prisma` | PricingRoute, D2DPricing |
| `dhl.prisma` | DhlBatch, DhlBatchParcel |
| `notification.prisma` | Notification |
| `audit.prisma` | AuditLog |
| `setting.prisma` | Setting |
| `attachment.prisma` | Attachment |

**Rules:**

- When adding new model:
  - If it's **1:n or n:n child** → put in same file as parent
  - If it's **new domain** with loose relations → create new file
- Keep enums in `enum.prisma` to avoid duplicates
- Use kebab-case for file names (e.g., `order.prisma`, `accounting.prisma`)
- **Always run `prisma validate`** after schema changes
- No relation fields in Prisma schema — all relations loaded via `XxxExtendDto` + `BaseExtraData`

### Schema thay đổi PHẢI qua Prisma (BẮT BUỘC)

**KHÔNG BAO GIỜ** sửa schema trực tiếp trên Postgres (psql, DBeaver, pgAdmin, TablePlus, `prisma db push`). Luồng đúng:

1. Sửa `prisma/schema/*.prisma`
2. `npx prisma migrate dev --name <name>` → generate migration SQL
3. Review + sửa idempotent (xem dưới) trước khi commit
4. Commit schema + migration cùng PR

**Cấm**:
- ❌ `psql -c "ALTER TABLE ..."` sửa schema tay
- ❌ DBeaver/pgAdmin/TablePlus → Edit Table → Save
- ❌ `prisma db push` (chỉ prototyping cá nhân, không commit)
- ❌ INSERT raw vào `_prisma_migrations` để fake "đã apply"

**Lý do**: DB lệch state làm migrations không reproducible giữa dev/staging/prod, gây fail P3006/P3009 chặn toàn pipeline.

### Migration SQL Safety (BẮT BUỘC)

Mọi `DROP` statement trong `prisma/migrations/**/migration.sql` **phải** dùng `IF EXISTS`. Prisma generate ra dạng không idempotent — sửa tay sau mỗi `prisma migrate dev` trước khi commit.

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

Áp dụng cho: `DROP CONSTRAINT`, `DROP INDEX`, `DROP TABLE`, `DROP COLUMN`, `DROP TRIGGER`, `DROP FUNCTION`, `DROP TYPE`, `DROP SCHEMA`.

**Recovery khi P3009 (migration fail)**:
```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

→ Details: [prisma-schema-splitting.mdc](./backend/prisma-schema-splitting.mdc), [prisma-migration-safety.mdc](./backend/prisma-migration-safety.mdc)

---

## 8. Import Aliases

| Alias | Target |
| ----- | ------ |
| `@/`  | `src/` |

→ Details: [import-aliases-and-structure.mdc](./backend/import-aliases-and-structure.mdc)

---

## 9. Swagger & Frontend Type Generation

**Why this matters:**
Frontend uses `openapi-typescript` to generate TypeScript types from `/api-json`. **If a DTO is not registered in Swagger, frontend cannot generate types for it.**

**Required patterns:**

### Controller Response Types

```ts
@Get(':id')
@ApiOperation({ summary: 'Get order by ID' })
@ApiBaseOkResponse(OrderDto, 'Order retrieved')  // ← REQUIRED
async getOrder(@Param('id') id: string): Promise<BaseResponse<OrderDto>> {
  // ...
}

@Get()
@ApiBaseOkResponse([OrderDto], 'Orders list')  // ← Array type
async listOrders(): Promise<BaseResponse<OrderDto[]>> {
  // ...
}
```

### DTO Field Decorators

**Composite Decorator Pattern** — Use `@ApiPropertyExpose` to combine `@Expose()` (class-transformer) + Swagger `@ApiProperty()`:

```ts
import { ApiPropertyExpose } from '@/common/decorators/api-property-expose.decorator'

export class OrderDto {
  @ApiPropertyExpose({ description: 'Order ID' })
  id!: string

  @ApiPropertyExpose({ type: CustomerDto }) // ← Nested type
  customer!: CustomerDto

  @ApiPropertyExpose({ type: [ParcelDto], nullable: true }) // ← Array type, optional
  parcels?: ParcelDto[]

  @ApiPropertyExpose({ enum: OrderStatus, enumName: 'OrderStatus' }) // ← Enum
  status!: OrderStatus
}

// In repository — apply plainToInstance with excludeExtraneousValues
return plainToInstance(OrderDto, row, {
  excludeExtraneousValues: true,  // Strips fields without @Expose/@ApiPropertyExpose
})
```

**Benefits:**
- Single decorator: `@ApiPropertyExpose` handles both class-transformer `@Expose()` and Swagger registration
- **Security**: `excludeExtraneousValues: true` prevents accidental leak of internal fields not decorated
- Type-safe: All exposed fields are Swagger-documented

**Reference:** `@/common/decorators/api-property-expose.decorator`

### Nested/Related DTOs

If `OrderDto` includes `CustomerDto`, **both** must have decorators:

```ts
export class CustomerDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  name!: string
}
```

### Generic Types

For `BaseResponse<T>`, use `@ApiExtraModels`:

```ts
@ApiExtraModels(OrderDto, CustomerDto)  // ← Register at controller level
@Controller('orders')
export class OrderController { ... }
```

### Nullable Fields — MUST specify `type:` explicitly

TypeScript reflection **KHÔNG infer** được scalar type khi field là nullable hoặc optional. Nếu thiếu `type:`, OpenAPI emit `type: 'object'` → FE codegen sinh ra `Record<string, any>` thay vì `string | null` / `number | null`.

```ts
// ❌ BAD — reflection emit {type:'object',nullable:true}
@ApiPropertyOptional({ nullable: true })
address: string | null

@ApiProperty()
notes: string | null

@ApiPropertyOptional()
readAt?: Date | null

// ✅ GOOD — explicit type
@ApiPropertyOptional({ type: String, nullable: true })
address: string | null

@ApiProperty({ type: String, nullable: true })
notes: string | null

@ApiPropertyOptional({ type: Date, format: 'date-time', nullable: true })
readAt?: Date | null

@ApiPropertyOptional({ type: Number, nullable: true })
rating: number | null

@ApiPropertyOptional({ type: Boolean, nullable: true })
isFlagged: boolean | null
```

**Codemod**: `backend/scripts/fix-nullable-decorators.ts` tự fix mọi bare decorator thiếu type trên nullable field. Run khi thêm DTO mới:

```bash
cd backend
pnpm dlx tsx scripts/fix-nullable-decorators.ts
```

### Array of DTOs — MUST specify element type

```ts
// ❌ BAD — reflection chỉ biết Array, mất element type → FE: any[][]
@ApiProperty()
containers: ContainerResponseDto[]

// ✅ GOOD
@ApiProperty({ type: [ContainerResponseDto] })
containers: ContainerResponseDto[]

// Or with nullable/optional
@ApiPropertyOptional({ type: [ContainerResponseDto], isArray: true })
containers?: ContainerResponseDto[]
```

### Nested DTOs — Use lazy loading để tránh circular deps

```ts
// ❌ BAD — reflection emit 'object'
@ApiProperty()
assignment: AssignmentResponseDto

// ✅ GOOD — lazy type resolver
@ApiPropertyOptional({ type: () => AssignmentResponseDto, nullable: true })
assignment?: AssignmentResponseDto | null
```

### Record/Map Types — Use `additionalProperties`

```ts
// ❌ BAD — emit Record<string, any>
@ApiProperty()
byStatus: Record<string, number>

// ✅ GOOD — typed map
@ApiProperty({
  type: 'object',
  additionalProperties: { type: 'number' },
  example: { ACTIVE: 10, INACTIVE: 3 },
})
byStatus: Record<string, number>

// Or define dedicated DTO (preferred for known keys)
export class OrderStatusCountsDto {
  @ApiProperty() PENDING_ASSIGN: number
  @ApiProperty() ASSIGNED: number
  // ...
}

@ApiProperty({ type: OrderStatusCountsDto })
byStatus: OrderStatusCountsDto
```

### Generic Paginated Responses — Use Decorator Helper

`@ApiResponse({ type: PaginatedResponse<OrderDto> })` **KHÔNG work** — generic `<T>` bị erase runtime. Dùng decorator helper `@ApiPaginatedResponse(ItemDto)`:

```ts
import { ApiPaginatedResponse } from '@/common/decorators/api-paginated-response.decorator'

// controller
@Get()
@ApiOperation({ summary: 'List orders' })
@ApiPaginatedResponse(OrderResponseDto)  // ← 1 dòng thay cho 6 dòng @ApiResponse schema
async findAll(): Promise<PaginatedResponse<OrderResponseDto>> { ... }
```

Decorator emit inline schema với `$ref` tới `ItemDto`. Service return type dùng TypeScript-only interface `PaginatedResponse<T>` trong `common/types/paginated-response.type.ts` (không phải class Swagger).

### Decimal Fields (Prisma)

Prisma `@db.Decimal` trả `Prisma.Decimal` object. 2 strategies:

```ts
// Strategy A: Convert sang number ở repository (mất precision > 15 digits)
@ApiProperty({ type: Number, nullable: true })
rating: number | null

// repository
return { ...row, rating: row.rating?.toNumber() ?? null }

// Strategy B: Serialize sang string (preserve precision — preferred cho money)
@ApiProperty({ type: String, nullable: true, example: '1234.56' })
totalAmount: string | null

// repository
return { ...row, totalAmount: row.totalAmount?.toString() ?? null }
```

### JSON Fields (Prisma)

Prisma `Json` trả `Prisma.JsonValue` (union với object/array/null). DTO khai typed field + cast ở repository:

```ts
// ❌ BAD — emit Record<string, any>
@ApiProperty()
tags: Prisma.JsonValue

// ✅ GOOD — declared typed
@ApiProperty({ type: [String] })
tags: string[]

// repository: validate + cast
private parseTags(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}
```

**Prefer native Postgres array** nếu shape cố định:
```prisma
model Order { tags String[] }   // Prisma trả trực tiếp string[]
```

### null vs undefined Convention

- **Response DTO**: match Prisma shape — `field: T | null` (required, có thể null)
- **Create/Update DTO**: `field?: T` (optional, absent = don't update); hoặc `field?: T | null` (absent = don't update, null = clear)

```ts
// Response
@ApiProperty({ type: String, nullable: true })
notes: string | null       // KHÔNG dùng ?: — match Prisma null

// Update (clear field với null)
@ApiPropertyOptional({ type: String, nullable: true })
notes?: string | null
```

**Verification checklist:**

1. Run backend: `pnpm start:dev`
2. Open: `http://localhost:4010/api-json`
3. Search for your DTO name in `components.schemas`
4. Verify all fields are present with correct types

**Common mistakes:**

| Mistake                    | Fix                                          |
| -------------------------- | -------------------------------------------- |
| Missing `@ApiProperty()`   | Add decorator to ALL fields                  |
| `Promise<any>` return type | Use `Promise<BaseResponse<DtoType>>`         |
| Nested object without type | Add `{ type: NestedDto }`                    |
| Array without item type    | Use `{ type: [ItemDto] }` or `isArray: true` |
| Enum without `enumName`    | Add `enumName` for consistent naming         |

**Anti-patterns:**

```ts
// ❌ BAD - No return type annotation
@Get()
async list() { return this.service.list(); }

// ❌ BAD - Using `any`
@Get()
async list(): Promise<BaseResponse<any>> { ... }

// ❌ BAD - Missing @ApiProperty
export class OrderDto {
  id!: string;  // ← Won't appear in api-json
}
```

**Required patterns:**

```ts
// ✅ GOOD - Full annotations
@Get()
@ApiOperation({ summary: 'List orders' })
@ApiBaseOkResponse([OrderDto], 'Success')
async list(@Query() query: QueryOrderDto): Promise<BaseResponse<OrderDto[]>> {
  // ...
}

// ✅ GOOD - All fields decorated
export class OrderDto {
  @ApiProperty({ description: 'Order ID' })
  id!: string;

  @ApiProperty({ type: CustomerDto })
  customer!: CustomerDto;
}
```

→ Details: [swagger-dto-type-generation.mdc](./backend/swagger-dto-type-generation.mdc)

---

## 10. Validation & DTO Best Practices

**Request validation** uses `class-validator` + `class-transformer`:

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole
}
```

**Query DTO with transforms:**

```ts
export class QueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number) // Transform string to number
  limit?: number = 20

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  include?: string[]
}
```

**Nested object validation:**

```ts
export class CreateOrderDto {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto

  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[]
}
```

**Partial update DTOs:**

```ts
import { PartialType, OmitType, PickType } from '@nestjs/swagger'

// All fields optional
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Exclude specific fields
export class UpdateProfileDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'email'] as const),
) {}
```

**Global ValidationPipe configuration** (`main.ts`):

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true, // Auto-transform types
  }),
)
```

**Rules:**

- Always use `!` for required fields (assigned via constructor/Object.assign)
- Use `?` for optional fields, **never `| null`**
- Add `@ApiProperty()` / `@ApiPropertyOptional()` to all DTO fields
- Use `@Type()` for nested objects and transformations
- Use `@Transform()` for custom transformations (e.g., string → boolean)

→ Details: [validation-and-dto.mdc](./backend/validation-and-dto.mdc), [dto-swagger-nullability.mdc](./backend/dto-swagger-nullability.mdc)

---

## 12. Module Organization Standards

**Standard module structure:**

```
src/<module>/
├── <module>.module.ts      # Module definition
├── <module>.controller.ts  # HTTP endpoints
├── <module>.service.ts     # Business logic
├── dto/
│   ├── create-<module>.dto.ts
│   ├── update-<module>.dto.ts
│   ├── query-<module>.dto.ts
│   ├── <module>.dto.ts          # Generated DTO (scalars only)
│   └── <module>-extend.dto.ts   # Hand-written (relations)
├── provider/
│   ├── <module>.repository.ts   # Data access
│   └── <module>.extra.ts        # Extra/extend data builders
├── guards/                      # Module-specific guards
├── decorators/                  # Module-specific decorators
└── interfaces/                  # TypeScript interfaces
```

**Module definition pattern:**

```ts
@Module({
  imports: [
    JwtModule.register({ ... }),
    OtherModule,
  ],
  controllers: [ModuleController],
  providers: [
    ModuleService,
    ModuleRepository,
    ModuleExtra,
  ],
  exports: [
    ModuleService,  // Export what other modules need
  ],
})
export class ModuleModule {}
```

**Service layer pattern:**

```ts
@Injectable()
export class ModuleService {
  constructor(
    private readonly repository: ModuleRepository,
    private readonly extra: ModuleExtra,
  ) {}

  async create(dto: CreateDto): Promise<Result<ModuleDto, Error>> {
    // Validation
    // Business logic
    // Repository call
    // Return Result
  }
}
```

**Repository pattern:**

```ts
@Injectable()
export class ModuleRepository {
  async findMany(query: QueryDto) {
    return prisma.model.findMany({
      where: this.buildWhere(query),
      orderBy: query.orderBy,
      take: query.limit,
      skip: query.offset,
    })
  }

  async findUnique(id: string) {
    return prisma.model.findUnique({ where: { id } })
  }
}
```

**Index exports** for clean imports:

```ts
// dto/index.ts
export * from './create-module.dto'
export * from './update-module.dto'
export * from './module.dto'
export * from './module-extend.dto'
```

**Rules:**

- One module = one domain/feature
- Keep controllers thin — delegate to services
- Services return `Result<T, Error>`, not raw values
- Repository handles only data access, no business logic
- Extra handles only data transformation/enrichment
- Export only what's needed by other modules

→ Details: [module-organization.mdc](./backend/module-organization.mdc)

---

## 12. Complete Request/Response Flow

**Lifecycle:**

```
Client
    ↓
Controller (DTO validation via ValidationPipe)
    ↓
Service (business logic, returns Result<T, Error>)
    ↓
Repository/Prisma (data access)
    ↓
Service (processes result)
    ↓
Controller (converts to BaseResponse or CustomException)
    ↓
Response
```

**Global middleware/filters:**

- `JwtAuthGuard` — JWT validation + token blacklist
- `HttpExceptionFilter` — standardized error responses
- `ValidationPipe` — DTO validation
- `DecimalSerializerInterceptor` — Prisma Decimal → number

**Auth flow:**

- Login/register endpoints in auth module
- Passwords hashed before persistence
- JWT access token for authenticated routes (15min TTL)
- JWT payload structure: `{ sub (userId), email, roleId, roleCode, sessionId }` — no permissions array
- Permissions resolved via `PermissionResolverService` (Redis cache TTL 60s, DB fallback)
- Refresh token rotation with reuse detection enabled
- Public endpoints marked with `@Public()` decorator
- Session revocation on role permission changes

**Data access flow:**

- Access DB via Prisma client from `libs/prisma`
- Schema split by domain in `prisma/schema/*.prisma`
- Parent-child relation models in same schema file
- Run `prisma validate` after schema changes

**DTO + ExtraData flow:**

```
1. Repository fetches base entity data (scalar fields only)
2. Service calls XxxExtra.getOne/getList with include param
3. BaseExtraData loads relations based on xxxExtendConfig
4. Service returns Result<XxxExtendDto, Error>
5. Controller converts to BaseResponse<XxxExtendDto>
```

**Implementation checklist:**

- [ ] Add/adjust DTO + Swagger decorators
- [ ] Keep strict typing; avoid `any`
- [ ] Use path aliases (`@/`, `@lib/*`, `@shared/*`)
- [ ] Keep response and error format consistent across modules
- [ ] Register all DTOs in Swagger for frontend type generation
- [ ] Use neverthrow Result pattern in services
- [ ] Throw CustomException in controllers, never raw Error

→ Details: [backend-flow-overview.mdc](./backend/backend-flow-overview.mdc)

---

## 13. Import Aliases & Project Structure

**Configured aliases:**
| Alias | Target | Usage |
| -------------- | --------------------- | ------------------------------ |
| `@/` | `src/` | App modules |

**Monorepo layout:**

```
backend/
├── src/                    # NestJS application
│   ├── config/             # Database, minio, redis, mail
│   ├── common/             # Shared helpers, decorators, guards, interceptors, filters
│   ├── prisma/             # PrismaService singleton
│   └── modules/            # Feature modules
├── prisma/                 # Prisma configuration
│   ├── schema/             # Multi-file Prisma schema (domain-split)
│   └── seed/               # Modular seed files
└── test/                   # E2E tests
```

**App modules (`src/modules/`):**

- `auth/` — Authentication + JWT
- `rbac/` — Role-based access control
- `user/` — User management
- `order/` — Order domain + state machine + bulk ops
- `assignment/` — Order assignments
- `contractor/` — Contractor management
- `customer/` — Customer management
- `location/` — Location/zone data
- `route/` — Route management
- `document/` — Document management
- `task/` — Task management
- `container/` — Container tracking
- `magic-link/` — Magic link flow
- `notification/` — Email/notifications
- `sla/` — SLA engine
- `audit-log/` — Audit trail & compliance
- `dashboard/` — Dashboard metrics & KPIs
- `analytics/` — Orders, SLA, contractor analytics
- `order-io/` — Orders import/export (xlsx, csv)

**Shared libs (`libs/`):**

- `libs/core/components/redis/` — Redis module + service
- `libs/prisma/` — Prisma client wrapper
- `libs/utils/src/` — CustomException, utilities

**Anti-patterns:**

- ❌ Don't use long relative paths when aliases exist
- ❌ Don't use `any` type
- ❌ Don't throw raw `Error` in controllers
- ❌ Don't create Prisma client instances manually
- ✅ Use `RedisService` from `@lib/core/components/redis` (returns `Result<T, Error>`)

→ Details: [import-aliases-and-structure.mdc](./backend/import-aliases-and-structure.mdc), [project-structure-modules-overview.mdc](./backend/project-structure-modules-overview.mdc)

---

## 11. Repository Pattern

All repositories are plain `@Injectable()` classes that inject `PrismaService`. They wrap all database queries, perform DTO conversion, and return `Result<T, Error>`.

### Basic Structure

```ts
@Injectable()
export class OrderRepository {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<Result<OrderResponseDto, Error>> {
    try {
      const order = await this.prisma.order.create({
        data: { orderType: dto.orderType, customerId: dto.customerId },
      })
      return ok(this.toDto(order))
    } catch (error) {
      return err(createError('Failed to create order', { dto, error }))
    }
  }

  async findMany(query: QueryOrderDto): Promise<Result<ResultList<OrderResponseDto>, Error>> {
    try {
      const where = this.buildWhere(query)
      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          take: query.limit,
          skip: (query.page - 1) * query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.order.count({ where }),
      ])
      return ok({
        items: orders.map(o => this.toDto(o)),
        total,
        page: query.page,
        limit: query.limit,
      })
    } catch (error) {
      return err(createError('Failed to find orders', { query, error }))
    }
  }

  // IDOR prevention: wrap scoping logic in where-builder
  private buildWhere(query: QueryOrderDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {}
    if (query.status) where.status = query.status
    if (query.customerId) where.customerId = query.customerId  // Customer filter for IDOR
    return where
  }

  private toDto(order: any): OrderResponseDto {
    return new OrderResponseDto(order)
  }
}
```

### Rules

**DO ✅**

- Create repository class for each domain model
- Inject `PrismaService` in constructor
- **All public methods MUST return `Promise<Result<T, Error>>`** — enforced by ESLint rule `repository-must-return-result`
- Encapsulate DTO conversion (toDto, toCreateInput, etc.) — use `toDto` helper from `@/common/utils/to-dto`
- Encapsulate IDOR prevention logic in where-builders
- Use try-catch wrapping Prisma queries
- Apply `plainToInstance(..., { excludeExtraneousValues: true })` for secure DTO mapping

**DON'T ❌**

- Don't call `this.prisma` from services or controllers — use repository methods only
- Don't return raw Prisma models — always convert to DTOs
- Don't put business logic in repository — keep it pure data access
- Don't expose repository to controllers — inject into services
- Don't throw errors — return `Result.err()` instead

---

## 14. API Response Standards

**Success response** — always use `BaseResponse<T>`:

```ts
return {
  code: DEFAULT_SUCCESS_CODE, // 200
  message: DEFAULT_SUCCESS_MESSAGE, // "Success"
  payload: result.value,
}
```

**Error response** — controller throws `CustomException`:

```ts
const result = await this.service.method(dto)

if (result.isErr()) {
  throw new CustomException(
    'ENDPOINT_ERROR', // Error code (UPPER_SNAKE_CASE)
    result.error.message, // User-safe message
    HttpStatus.BAD_REQUEST, // HTTP status
    { field: dto.field }, // Optional debug data (non-sensitive)
  )
}
```

**Rules:**

- **Success**: Prefer `BaseResponse<T>` (all new code must follow this)
- **Error**: Controller never returns raw Error — always throw `CustomException`
- **Error payload**: Only include necessary data, **never expose sensitive info**
- **Consistency**: Use same response format across all modules

→ Details: [api-response-and-custom-exception.mdc](./backend/api-response-and-custom-exception.mdc)

---

## 15. Development Checklist

When implementing a new feature module:

### DTO Layer

- [ ] Generate `XxxDto` via Prisma (scalar fields only)
- [ ] Create `xxx-extend.dto.ts` with `XxxExtendInclude`, `xxxExtendConfig`, `XxxExtendDto`
- [ ] Add `@ApiProperty` to all DTO fields (including nested types)
- [ ] Create `QueryXxxDto` with `include` getter using `transformIncludeParam`
- [ ] Create request DTOs (`CreateXxxDto`, `UpdateXxxDto`) with validation decorators
- [ ] Use `PartialType`, `OmitType`, `PickType` for update DTOs

### Repository Layer

- [ ] Create `xxx.repository.ts` as `@Injectable()` class injecting `PrismaService`
- [ ] Implement `async` methods for data operations (create, findMany, findOne, update, delete)
- [ ] All methods must return `Result<T, Error>` via neverthrow
- [ ] Implement `private toDto(model): XxxDto` for DTO conversion
- [ ] Implement `private buildWhere(query): WhereInput` for query filtering
- [ ] Add `try-catch` wrapping all Prisma calls
- [ ] Encapsulate IDOR prevention logic in `buildWhere`
- [ ] Never return raw Prisma models — always use `toDto`
- [ ] Add custom methods (e.g., `findByUser`, `findWithAggregation`) as needed

### Extra/Extend Data

- [ ] Create `xxx.extra.ts` — `XxxExtra extends BaseExtraData<XxxExtendInclude, XxxExtendDto>`
- [ ] Register `XxxExtra` in `xxx.module.ts` providers
- [ ] Inject `XxxExtra` in `xxx.service.ts`
- [ ] Call `getOne`/`getList` after repository fetch in service methods

### Service & Repository

- [ ] Create `xxx.service.ts` — all methods return `Promise<Result<T, Error>>`
- [ ] Create `xxx.repository.ts` — pure data access, no business logic
- [ ] Use `createError` for errors in service layer
- [ ] No Prisma `include` in repository — all relations via Extra

### Controller

- [ ] Create `xxx.controller.ts` with proper decorators
- [ ] Use `@ApiBaseOkResponse` on all endpoints
- [ ] Check `result.isErr()` and throw `CustomException`
- [ ] Return `BaseResponse<T>` for success
- [ ] Use `@ApiExtraModels` for generic types

### Swagger Verification

- [ ] Run backend: `pnpm start:dev`
- [ ] Check `http://localhost:4010/api-json`
- [ ] Verify all DTOs in `components.schemas`
- [ ] Test frontend type generation

### Module Registration

- [ ] Create `xxx.module.ts` with proper imports/providers/exports
- [ ] Export service if needed by other modules
- [ ] Import in `AppModule` or parent module

### Testing

- [ ] Test all endpoints with valid/invalid data
- [ ] Verify error handling and status codes
- [ ] Check include parameter behavior
- [ ] Validate Swagger schema generation

---

## Best Practices Summary

### DO ✅

- **Create repository classes for all data access** — always use `@Injectable()` injecting `PrismaService`
- Use `Result<T, Error>` in services
- Throw `CustomException` in controllers
- Use `BaseResponse<T>` for success
- Add `@ApiProperty` to all DTO fields
- Use 2-layer DTO pattern (Dto + ExtendDto)
- Implement `toDto` in repositories
- Implement `buildWhere` for query filtering
- Add `try-catch` wrapping all Prisma calls
- Group related Prisma models in same schema file
- Use path aliases (`@/`, `@lib/*`)
- Keep strict typing (avoid `any`)
- Run `prisma validate` after schema changes
- Verify DTOs in `/api-json`

### DON'T ❌

- **Don't call Prisma directly from services or controllers** — always use repository methods
- **Don't put business logic in repository** — use service layer
- **Don't return raw Prisma models** — always convert to DTO via `toDto`
- **Don't expose repository to controllers** — inject into service only
- Don't throw raw `Error` in controllers
- Don't use `| null` in DTOs (use `?` for optional)
- Don't add relations to generated `XxxDto`
- Don't use manual Prisma `include` in repositories
- Don't expose sensitive data in error responses
- Don't split parent-child models across Prisma files
- Don't use long relative imports when aliases exist
- Don't skip Swagger decorators
- Don't use `any` type
- Don't create god files in Prisma schema

---

## 10. AI Module (ContentBlockBuilder + Providers)

The AI layer provides a **4-tier abstraction** for LLM-powered document extraction (introduced 2026-04-19).

### Architecture

```
Feature Modules (booking-extraction, driver-proof, ...)
    ↓ use AiService.extract()
Shared AI Layer (AiService façade)
    ↓ delegates to
Providers (AnthropicProvider | OpenaiProvider)
    ↓ via
ContentBlockBuilder (PDF → text/image conversion)
```

### Key Components

**1. AiService** — Single extraction method, provider-agnostic:
```ts
async extract<T>(input: BlockExtractionInput): Promise<Result<ExtractionResult<T>, Error>>
```

**2. ContentBlockBuilder** — Intelligent PDF handling:
- **Text-first path**: PDF text-layer extraction via `pdf-parse` (threshold ≥200 chars)
- **Fallback image path**: Scanned PDFs → images via ImageMagick (`pdm:png` → base64)
- **Result**: `ContentBlock[]` in OpenAI-format (vendor-neutral, no provider lock-in)

**3. Providers** — Implement `IExtractionProvider` interface:
```ts
interface IExtractionProvider {
  extract<T>(input: BlockExtractionInput): Promise<Result<ExtractionResult<T>, Error>>
}
```
- `AnthropicProvider` — Uses Claude 3.5+ native document blocks (cost-optimized)
- `OpenaiProvider` — Uses GPT-4o with image fallback

**4. CostTracker** — Token usage + USD cost calculation:
```ts
track({
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number,
  context?: string  // for logging
}): number  // returns USD cost
```

### Usage Pattern (Feature Module)

**Always use AiService, never import providers directly:**

```ts
// ✅ CORRECT — via AiService
import { AiService } from '@/modules/ai/ai.service'
import { ContentBlockBuilderService } from '@/modules/ai/services/content-block-builder.service'

// Build content blocks (text or image)
const blockResult = await this.contentBlockBuilder.build({
  buffer: pdfBuffer,
  mimeType: 'application/pdf',
})
if (blockResult.isErr()) return err(blockResult.error)

// Extract via provider-agnostic façade
const result = await this.aiService.extract<YourType>({
  contentBlocks: blockResult.value.blocks,
  systemPrompt: 'Your extraction instructions...',
  toolName: 'extract_booking',
  toolDescription: 'Extract booking details from PDF...',
  inputSchema: { /* JSON Schema */ }
})

// ❌ WRONG — direct provider import
import { AnthropicProvider } from '@/modules/ai/providers/anthropic.provider'
this.provider.extractWithSchema(pdfBuffer)  // OLD API, removed
```

### Environment Configuration

```bash
# Provider selection
AI_PROVIDER=anthropic          # or 'openai' (default: anthropic)
AI_MODEL=claude-haiku-4-5-20251001  # override per provider

# API credentials
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional custom endpoints (LiteLLM proxy, Azure OpenAI, etc.)
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
OPENAI_BASE_URL=https://api.openai.com/v1

# Timeouts & retries
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
```

### Cost Optimization Tips

1. **Use text-first PDFs** — Most bookings have text layers; ContentBlockBuilder reduces image encoding (~70% cost savings vs. image-only)
2. **Monitor token usage** — CostTrackerService logs USD cost per extraction; track via dashboard
3. **Right-size model** — Haiku/mini for high-volume extraction (bookings), GPT-4o for complex documents

### Testing ContentBlockBuilderService

`ContentBlockBuilderService` requires `ImageOrientationService` injection for Tesseract OSD image auto-rotation (V13+). When testing modules that use `ContentBlockBuilderService`:

```ts
import { ContentBlockBuilderService } from '@/modules/ai/services/content-block-builder.service'
import { ImageOrientationService } from '@/modules/ai/services/image-orientation.service'

const module = await Test.createTestingModule({
  providers: [
    ContentBlockBuilderService,
    {
      provide: ImageOrientationService,
      useValue: { autoRotate: jest.fn() }, // Mock OSD orientation detection
    },
  ],
}).compile()
```

See `backend/src/modules/ai/services/content-block-builder.service.spec.ts` for complete test example including image rotation mocking and PDF text-layer fallback behavior.

### ESLint Guard

**Rule:** Feature modules cannot import providers directly (enforced via `no-restricted-imports`):

```json
// backend/eslint.config.mjs
{
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["*/ai/providers/**"], message: "Use AiService instead" }
      ]
    }]
  }
}
```

This prevents accidental tight coupling to specific LLM providers.

---

## 17. SLA Event-Driven System

The SLA engine uses an **event-driven architecture** where audit logs automatically trigger SLA creation via config-driven rules (introduced 2026-04-21).

### Architecture Flow

```
1. Business Operation (e.g., Order.create())
     ↓
2. AuditHelper.logAudit() — emit audit event
     ↓ (EventEmitter2)
3. SlaEventListener — subscribe to audit.created/updated/etc.
     ↓ (evaluate JSON conditions)
4. BullMQ Queue (sla:triggers) — queue matched mappings
     ↓ (async processing)
5. SlaEventTriggerProcessor — check idempotency
     ↓ (if no duplicate)
6. SlaService.scheduleCheck() — create SLA event
```

### Key Components

**1. JsonConditionEvaluator** — MongoDB-style query evaluator:
```ts
const evaluator = new JsonConditionEvaluator()
const matches = evaluator.evaluate(entityData, condition)

// Supported operators: $eq, $ne, $in, $nin, $regex, $gt, $gte, $lt, $lte, $exists, $and, $or, $not
// Supports dot notation for nested fields (e.g., "order.type")
```

**2. SlaEventListener** — Event subscriber:
```ts
@Injectable()
export class SlaEventListener {
  @OnEvent('audit.created', { async: true })
  async handleAuditCreated(payload: AuditEvent): Promise<void> {
    // 1. Fetch active mappings for entityType + action
    // 2. Evaluate JSON conditions against entityData
    // 3. Queue BullMQ jobs for matched mappings
  }
}
```

**3. SlaEventTriggerProcessor** — BullMQ processor:
```ts
@Processor(SLA_TRIGGER_QUEUE, { concurrency: 5 })
export class SlaEventTriggerProcessor extends WorkerHost {
  async process(job: Job<SlaEventTriggerJob>): Promise<void> {
    // 1. Check if SLA already exists (idempotency)
    // 2. Call SlaService.scheduleCheck(orderId, rule)
    // 3. Log success/failure
  }
}
```

**4. SlaEventMapping** (Prisma model):
```prisma
model SlaEventMapping {
  id          String   @id @default(cuid())
  name        String   @unique
  entityType  String   // "order", "assignment", "task"
  action      String   // "created", "updated", "confirmed"
  conditions  Json     // MongoDB-style query
  slaCategory String   // "CONFIRM_TO_CUSTOMER", etc.
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
}
```

### Usage: Adding New SLA Triggers

**Option 1: Via Database (Recommended)**

Insert mapping via SQL or admin UI:

```ts
const mapping = await prisma.slaEventMapping.create({
  data: {
    name: 'order-create-confirm-customer',
    description: 'Trigger CONFIRM_TO_CUSTOMER SLA when IMPORT order created',
    entityType: 'order',
    action: 'created',
    conditions: {
      orderType: { $eq: 'IMPORT' },
      status: { $in: ['PENDING_ASSIGN', 'ASSIGNED'] }
    },
    slaCategory: 'CONFIRM_TO_CUSTOMER',
    isActive: true,
    priority: 100
  }
})
```

**Option 2: Seed Data**

Add to `backend/prisma/seeds/sla-event-mappings.seed.ts`:

```ts
const mappings = [
  {
    name: 'assignment-confirm-contractor',
    entityType: 'assignment',
    action: 'updated',
    conditions: {
      $and: [
        { status: { $eq: 'ASSIGNED' } },
        { contractorId: { $exists: true } }
      ]
    },
    slaCategory: 'CONTRACTOR_CONFIRM',
    isActive: true,
    priority: 100
  }
]
```

### JSON Condition Syntax

**Comparison Operators**:
```ts
{ orderType: { $eq: 'IMPORT' } }               // equals
{ status: { $ne: 'CANCELLED' } }                // not equals
{ orderType: { $in: ['IMPORT', 'EXPORT'] } }   // in array
{ status: { $nin: ['CANCELLED', 'COMPLETED'] }}// not in array
```

**Range Operators**:
```ts
{ priority: { $gt: 5 } }                        // greater than
{ priority: { $gte: 5 } }                       // greater or equal
{ priority: { $lt: 10 } }                       // less than
{ priority: { $lte: 10 } }                      // less or equal
```

**Existence & Pattern**:
```ts
{ customerId: { $exists: true } }               // field exists
{ orderNumber: { $regex: '^ORD-2024' } }       // regex match
```

**Logical Operators**:
```ts
{
  $and: [
    { orderType: { $eq: 'IMPORT' } },
    { status: { $in: ['ASSIGNED', 'CONFIRMED'] } }
  ]
}

{
  $or: [
    { priority: { $gte: 5 } },
    { customerId: { $eq: 'cust_123' } }
  ]
}

{ $not: { status: { $eq: 'CANCELLED' } } }
```

**Nested Fields (Dot Notation)**:
```ts
{ 'customer.tier': { $eq: 'PREMIUM' } }
{ 'assignment.contractorId': { $exists: true } }
```

### Benefits

1. **Zero-downtime config**: Modify SLA triggers without code deployment
2. **Full audit trail**: Every SLA linked to audit event + BullMQ job
3. **Decoupled**: Services never call `SlaService` directly
4. **Idempotent**: No duplicate SLAs (checked before creation)
5. **Scalable**: BullMQ concurrency (5 workers) + retry on failure

### Migration from Hardcoded Calls

**Before (deprecated)**:
```ts
// ❌ OLD: Direct SLA creation in service
await this.slaService.scheduleCheck(orderId, SLARule.CONFIRM_TO_CUSTOMER)
```

**After (event-driven)**:
```ts
// ✅ NEW: Audit log triggers SLA automatically
await this.auditHelper.logAudit({
  userId: currentUser.id,
  entityType: 'order',
  entityId: order.id,
  action: 'created',
  changes: { orderType: 'IMPORT', status: 'PENDING_ASSIGN' }
})
// → SlaEventListener picks up event → evaluates conditions → creates SLA
```

### Troubleshooting

**SLA not created?**
1. Check mapping exists: `SELECT * FROM sla_event_mappings WHERE entity_type = 'order' AND action = 'created'`
2. Check mapping is active: `is_active = true`
3. Check condition match: Use `JsonConditionEvaluator` to test locally
4. Check BullMQ queue: Visit BullBoard at `/queues` → check `sla:triggers` jobs
5. Check processor logs: `pm2 logs tcct-backend | grep SlaEventTriggerProcessor`

**Duplicate SLAs?**
Idempotency check prevents duplicates. If duplicates exist, check:
1. Processor logs for "SLA already exists" warnings
2. Database query in `checkExistingSla()` method
3. BullMQ job retries (should not create duplicates even on retry)

> **Full syntax reference**: See `docs/sla-event-mapping.md` for complete JSON condition examples.

---

## Quick Command Reference

```bash
# Development
cd backend
pnpm install
npx prisma migrate dev
pnpm start:dev  # http://localhost:4010

# Prisma
npx prisma generate
npx prisma validate
npx prisma studio
npx prisma migrate deploy  # production

# Linting & Formatting
pnpm lint      # auto-fix
pnpm format    # prettier

# Testing
pnpm test
pnpm test:e2e

# Production
docker-compose up -d
```
