export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  // Don't leak internal exception messages to clients on server errors.
  const isServerError = status >= 500;
  const message = isServerError
    ? "Internal server error"
    : err.message || "Request failed";
  res.status(status).json({ error: message });
}
