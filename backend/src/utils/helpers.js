const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const sanitizeText = (text) => {
  if (!text) return '';
  return text.replace(/[<>]/g, '');
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { formatNumber, sanitizeText, generateId, sleep };