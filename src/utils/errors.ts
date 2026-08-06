/**
 * 错误处理工具模块
 */

/**
 * 将任意未知错误统一转换为可读的错误消息
 * @param error 未知错误
 * @returns 错误消息字符串
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 判断错误是否携带指定的 Node.js 错误码（如 EXDEV）
 * @param error 未知错误
 * @param code 目标错误码
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === code
  );
}
