import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // TODO: Implement comprehensive request/response logging
    // This interceptor should:
    // 1. Log incoming requests with relevant details
    // 2. Measure and log response time
    // 3. Log outgoing responses
    // 4. Include contextual information like user IDs when available
    // 5. Avoid logging sensitive information

    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const now = Date.now();

    // Basic implementation (to be enhanced by candidates)
    this.logger.log(`Request: ${method} ${url}`);

    return next.handle().pipe(
      catchError(err => {
        // You can rethrow the same error
        if (err instanceof HttpException) return throwError(() => err);
        // Return a generic error response
        else
          return throwError(
            () =>
              new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: 'Internal server error',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
      }),
      tap({
        next: response => {
          this.logger.log(`Response: ${method} ${url} ${Date.now() - now}ms`);
          return response;
        },
      }),
    );
  }
}
