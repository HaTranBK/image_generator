# Phase 1: Core Infrastructure & Frontend Safety Types

This phase establishes the baseline error filters, serialization interceptors on the backend, and prepares the frontend type safety definition.

---

## Proposed Changes

### Component 1: Frontend Type Contract
Add the response envelope contract to the frontend.

#### [MODIFY] [types.ts](file:///d:/gradion_assessment/frontend/src/lib/types.ts)
- Add the `BaseResponse` generic interface:
  ```typescript
  export interface BaseResponse<T> {
    code: number;
    message: string;
    payload: T;
  }
  ```

---

### Component 2: Backend Exceptions & Global Filter
Setup centralized HTTP exception formatting.

#### [NEW] [custom-exception.ts](file:///d:/gradion_assessment/backend/src/common/exceptions/custom-exception.ts)
- Implement `CustomException` extending `HttpException`:
  ```typescript
  export class CustomException extends HttpException {
    constructor(
      public readonly errorCode: string,
      message: string,
      status: HttpStatus,
      public readonly debugData?: any,
    ) {
      super(message, status);
    }
  }
  ```

#### [NEW] [http-exception.filter.ts](file:///d:/gradion_assessment/backend/src/common/filters/http-exception.filter.ts)
- Implement `HttpExceptionFilter` implementing `ExceptionFilter`:
  - Intercepts `HttpException` and `CustomException`.
  - Formats responses to match:
    ```json
    {
      "code": "ERROR_CODE",
      "message": "User-friendly description",
      "errors": []
    }
    ```

---

### Component 3: Serialization & Global Registration

#### [NEW] [decimal-serializer.interceptor.ts](file:///d:/gradion_assessment/backend/src/common/interceptors/decimal-serializer.interceptor.ts)
- Implement `DecimalSerializerInterceptor` to scan responses and map `Prisma.Decimal` fields to `.toNumber()` and `Date` instances to `.toISOString()`.

#### [MODIFY] [app.module.ts](file:///d:/gradion_assessment/backend/src/app.module.ts)
- Register `HttpExceptionFilter` as a global filter.
- Register `DecimalSerializerInterceptor` as a global interceptor.

---

## Verification Plan
1. **Frontend Type Compilation**: Ensure that compiling the frontend using `npm run build` succeeds after typing additions.
2. **Global Filter Integration**: Verify that throwing any temporary exception from a controller results in a formatted JSON envelope with `code`, `message`, and `errors`.
