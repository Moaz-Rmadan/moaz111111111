/**
 * Enterprise Arabic Number-to-Words Converter (Tafqeet / تفقيط محاسبي معتمد)
 * Supports numbers up to billions with fractions (piastres / قرش).
 */

const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertGroup(n: number): string {
  if (n === 0) return '';
  let str = '';
  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    str += HUNDREDS[h];
  }

  if (rem > 0) {
    if (str !== '') str += ' و';
    if (rem < 20) {
      str += ONES[rem];
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (o > 0) {
        str += ONES[o] + ' و' + TENS[t];
      } else {
        str += TENS[t];
      }
    }
  }

  return str;
}

export function tafqeetArabic(
  amount: number | string | undefined | null,
  currencyName: string = 'جنيه مصري',
  subCurrencyName: string = 'قرش'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num === 0) {
    return `فقط صفر ${currencyName} لا غير`;
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return `فقط صفر ${currencyName} لا غير`;
  }

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1000);
  const ones = integerPart % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (ones > 0) {
    parts.push(convertGroup(ones));
  }

  let result = parts.join(' و');
  if (integerPart > 0) {
    result += ` ${currencyName}`;
  }

  if (decimalPart > 0) {
    const decimalText = convertGroup(decimalPart);
    if (integerPart > 0) {
      result += ` و${decimalText} ${subCurrencyName}`;
    } else {
      result = `${decimalText} ${subCurrencyName}`;
    }
  }

  return `فقط ${isNegative ? 'سالب ' : ''}${result} لا غير`;
}

export default tafqeetArabic;
