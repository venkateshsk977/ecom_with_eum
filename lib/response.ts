export function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, message },
    { status }
  );
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json(
    { success: true, data },
    { status }
  );
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}
