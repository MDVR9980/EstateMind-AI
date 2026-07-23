// Web/src/utils/numberFormat.ts

export const formatPrice = (price: number | string): string => {
  if (!price || Number(price) === 0) return '';
  return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatInputToNumber = (value: string): number => {
  const numericValue = value.replace(/,/g, '').replace(/[^0-9]/g, '');
  return numericValue ? parseInt(numericValue) : 0;
};

export const numberToPersianWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return '';
  let b = Math.floor(num / 1000000000);
  let m = Math.floor((num % 1000000000) / 1000000);
  let k = Math.floor((num % 1000000) / 1000);
  let parts = [];
  
  if (b > 0) parts.push(`${b} میلیارد`);
  if (m > 0) parts.push(`${m} میلیون`);
  if (k > 0) parts.push(`${k} هزار`);
  
  return parts.length > 0 ? parts.join(' و ') + ' تومان' : '';
};