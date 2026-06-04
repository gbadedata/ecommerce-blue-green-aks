import { HttpStatus } from '@nestjs/common';

import { AppResponse, ErrorData, PaginatedResponse } from 'src/types/app';

export class AppUtils {
  static successResponse = <T extends object | null>(
    message: string,
    data: T,
    statusCode: HttpStatus = HttpStatus.OK,
  ): AppResponse<T> => {
    return {
      success: true,
      statusCode,
      data,
      message,
    };
  };

  static errorResponse = (
    data: ErrorData,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): AppResponse<ErrorData> => {
    return {
      success: false,
      statusCode,
      data,
    };
  };

  static calcSkip(page: number, limit: number) {
    return (page - 1) * limit;
  }

  static paginateResponse<T = any>(
    data: [T[], number],
    page: number,
    take: number,
  ): PaginatedResponse<T> {
    const [result, total] = data;
    const lastPage = Math.ceil(total / take);
    const nextPage = page + 1 > lastPage ? null : page + 1;
    const prevPage = page - 1 < 1 ? null : page - 1;

    return {
      results: [...result],
      pageData: {
        total,
        currentPage: +page,
        nextPage,
        prevPage,
        lastPage,
      },
    };
  }
}

export class DBUtils {
  static async paginateData<T>(
    model: {
      findMany: Function;
      count: Function;
    },
    options: {
      where?: any;
      orderBy?: any;
      include?: any;
    },
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<T>> {
    const skip = AppUtils.calcSkip(page, limit);

    const [results, total] = await Promise.all([
      model.findMany({
        ...options,
        skip,
        take: limit,
      }),
      model.count({
        where: options.where,
      }),
    ]);

    return AppUtils.paginateResponse<T>([results, total], page, limit);
  }
}
