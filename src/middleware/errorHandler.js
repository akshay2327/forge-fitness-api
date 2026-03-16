exports.notFound = (req, res, next) => {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`)
  err.statusCode = 404
  next(err)
}

exports.errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500
  let message    = err.message || 'Internal Server Error'

  if (err.name === 'ValidationError') {
    statusCode = 422
    const fields = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }))
    return res.status(422).json({ error: 'Validation failed', fields })
  }
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyValue)[0]
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
  }
  if (err.name === 'CastError')          { statusCode = 400; message = `Invalid ${err.path}: ${err.value}` }
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Invalid token' }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired' }

  if (process.env.NODE_ENV === 'development') console.error(`[Error ${statusCode}]`, err)

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
