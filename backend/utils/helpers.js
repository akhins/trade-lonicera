/**
 * Format decimal number for display
 */
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '0';
  return parseFloat(num).toFixed(decimals);
}

/**
 * Format currency
 */
function formatUSD(num) {
  if (num === null || num === undefined) return '$0.00';
  return '$' + parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Calculate PnL percentage
 */
function calculatePnlPercent(entryPrice, exitPrice, direction) {
  const entry = parseFloat(entryPrice);
  const exit = parseFloat(exitPrice);
  if (direction === 'LONG') {
    return ((exit - entry) / entry) * 100;
  } else {
    return ((entry - exit) / entry) * 100;
  }
}

/**
 * Calculate position size based on risk
 */
function calculatePositionSize(balance, riskPercent, entryPrice, stopLoss) {
  const riskAmount = balance * (riskPercent / 100);
  const priceDiff = Math.abs(parseFloat(entryPrice) - parseFloat(stopLoss));
  if (priceDiff === 0) return 0;
  return riskAmount / priceDiff;
}

/**
 * Validate symbol format
 */
function isValidSymbol(symbol) {
  return /^[A-Z0-9]{2,20}USDT$/.test(symbol);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  formatNumber,
  formatUSD,
  calculatePnlPercent,
  calculatePositionSize,
  isValidSymbol,
  sleep
};
