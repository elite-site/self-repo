export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly source?: string;

  constructor(code: string, message: string, status: number = 500, source?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.source = source;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
