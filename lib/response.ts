export function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, message },
    { status }
  );
}

export function successResponse(data: any, status = 200) {
  return Response.json(
    { success: true, data },
    { status }
  );
}