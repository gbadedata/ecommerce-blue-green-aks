import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from 'generated/prisma/client';

import { GlobalService } from 'src/components/global/global.service';
import { ErrorData } from 'src/types/app';
import { AppUtils } from '../utils/Utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly globalService: GlobalService) {}

  private getContextName(stack?: string) {
    if (!stack) return 'UnknownContext';
    const match = stack.match(/at (\w+\.\w+)/);
    return match ? match[1] : 'UnknownContext';
  }

  private formatPrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    let name = 'Data Entry Error';
    let message = exception.message;

    switch (exception.code) {
      case 'P2002': // Unique constraint failed
        name = 'Duplicate Entry';
        const fields = exception.meta?.target;
        message = fields
          ? `The value provided for ${Array.isArray(fields) ? fields.join(', ') : fields} already exists.`
          : 'Duplicate value detected';
        break;
      case 'P2003': // Foreign key constraint failed
        name = 'Foreign Key Constraint Error';
        const fieldName = exception.meta?.field_name || 'unknown';
        message = `Invalid foreign key: ${fieldName}`;
        break;
      default:
        name = 'Data Entry Error';
        message = exception.message;
    }

    return { name, message };
  }

  // Safe stringify to remove circular references
  private safeStringify(obj: any) {
    const seen = new WeakSet();
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      }),
    );
  }

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const stack = exception instanceof Error ? exception.stack || '' : '';
    const contextName = this.getContextName(stack);

    // Extract optional payload (like DTO) if present
    const contextData = exception?.contextData
      ? this.safeStringify(exception.contextData)
      : undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let name = 'Internal Server Error';
    let message = 'Something went wrong! Please try again.';

    // NestJS exceptions
    if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      name = 'Not Found';
      message = 'The requested resource was not found.';
    }

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;
      status = exception.getStatus();
      name = exceptionResponse.name || exception.name;
      message = exceptionResponse.message || exception.message;
    }

    // Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      const formatted = this.formatPrismaError(exception);
      name = formatted.name;
      message = formatted.message;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      name = 'Validation Error';
      message = exception.message;
    }

    if (
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      name = 'Database Error';
      message = exception.message;
    }

    const messageStr = Array.isArray(message) ? message.join('; ') : message;

    await this.globalService.logError({
      level: 'error',
      name,
      message: messageStr,
      stack,
      context: contextName,
      ...(contextData && { data: contextData }),
    });

    const errorData: ErrorData = {
      name,
      message: messageStr,
      timestamp: new Date().toISOString(),
    };

    const error = AppUtils.errorResponse(errorData, status);

    response.status(status).json(error);
  }
}
