import { IsOptional, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateErrorLogsDto {
  @ApiProperty({
    description: 'The error level',
    example: 'ERROR',
  })
  @IsString()
  @IsNotEmpty({
    message: 'What is the error level?',
  })
  level!: string;

  @ApiProperty({
    description: 'The error name',
    example: 'UserNotFoundError',
  })
  @IsString()
  @IsNotEmpty({
    message: 'What is the error name?',
  })
  name!: string;

  @ApiProperty({
    description: 'The error message',
    example: 'The user with the given ID was not found.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'What is the error message?',
  })
  message!: string;

  @ApiProperty({
    description: 'The error stack trace',
    example:
      'Error: The user with the given ID was not found.\n    at UserService.findUserById (user.service.ts:25:15)\n    at processTicksAndRejections (internal/process/task_queues.js:95:5)',
  })
  @IsString()
  @IsOptional()
  stack?: string;

  @ApiProperty({
    description: 'The context of the error',
    example: 'UserService.findUserById',
  })
  @IsString()
  @IsOptional()
  context?: string;
}
