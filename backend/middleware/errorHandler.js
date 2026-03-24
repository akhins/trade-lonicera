const Logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  Logger.error('API', `${req.method} ${req.path} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    params: req.params
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Sunucu hatası oluştu' 
      : err.message
  });
}

module.exports = errorHandler;
