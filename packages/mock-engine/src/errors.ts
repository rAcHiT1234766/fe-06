import type { DashKitError } from '@dashkit/sdk';

export class ApiError extends Error {
  readonly status: number;
  readonly code: DashKitError['code'];

  constructor(status: number, code: DashKitError['code'], message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
