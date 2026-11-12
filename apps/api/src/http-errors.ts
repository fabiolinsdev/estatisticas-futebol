function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

export const badRequest = (message: string) => httpError(400, message);
export const notFound = (message: string) => httpError(404, message);
