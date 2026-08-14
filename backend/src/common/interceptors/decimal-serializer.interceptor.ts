import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Recursively walks through the response object and:
 * - Converts Prisma `Decimal` objects (which have a `.toNumber()` method) to plain `number`.
 * - Converts `Date` instances to ISO 8601 strings.
 *
 * This prevents JSON serialization issues where Decimal values are sent as
 * opaque objects rather than numeric primitives.
 */
function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Prisma Decimal: has toNumber() method and is not a plain number
  if (
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Recursively process arrays
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  // Recursively process plain objects
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeValue(v)]),
    );
  }

  return value;
}

@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeValue(data)));
  }
}
