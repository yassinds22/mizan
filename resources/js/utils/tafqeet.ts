/**
 * تفقيط المبالغ المالية وتحويل الأرقام إلى نصوص باللغة العربية
 */
export function tafqeet(amount: number | string, currency = "ريال سعودي", subCurrency = "هللة"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return "صفر " + currency;

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertGroup(n: number): string {
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (t > 0 || o > 0) {
      if (result) result += " و ";

      if (t === 1 && o > 0) {
        result += teens[o];
      } else {
        if (o > 0) {
          result += ones[o];
          if (t > 0) result += " و ";
        }
        if (t > 0) {
          result += tens[t];
        }
      }
    }

    return result;
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let text = "";

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    if (millions === 1) text += "مليون";
    else if (millions === 2) text += "مليونان";
    else if (millions >= 3 && millions <= 10) text += convertGroup(millions) + " ملايين";
    else text += convertGroup(millions) + " مليون";
  }

  if (thousands > 0) {
    if (text) text += " و ";
    if (thousands === 1) text += "ألف";
    else if (thousands === 2) text += "ألفان";
    else if (thousands >= 3 && thousands <= 10) text += convertGroup(thousands) + " آلاف";
    else text += convertGroup(thousands) + " ألف";
  }

  if (remainder > 0) {
    if (text) text += " و ";
    text += convertGroup(remainder);
  }

  if (!text) text = "صفر";
  text = `فقط ${text} ${currency}`;

  if (decimalPart > 0) {
    text += ` و ${convertGroup(decimalPart)} ${subCurrency}`;
  }

  return text + " لا غير";
}
