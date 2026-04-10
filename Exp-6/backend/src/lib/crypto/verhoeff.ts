const D_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const P_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const INV_TABLE = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function digitsFromRight(value: string): number[] {
  return value
    .split("")
    .reverse()
    .map((digit) => Number(digit));
}

export function isVerhoeffValid(value: string): boolean {
  if (!/^[0-9]+$/.test(value)) {
    return false;
  }

  let checksum = 0;
  const reversedDigits = digitsFromRight(value);

  for (let i = 0; i < reversedDigits.length; i += 1) {
    const digit = reversedDigits[i]!;
    const permuted = P_TABLE[i % 8]![digit]!;
    checksum = D_TABLE[checksum]![permuted]!;
  }

  return checksum === 0;
}

export function generateVerhoeffCheckDigit(valueWithoutCheckDigit: string): number {
  if (!/^[0-9]+$/.test(valueWithoutCheckDigit)) {
    throw new Error("Verhoeff input must contain only digits");
  }

  let checksum = 0;
  const reversedDigits = digitsFromRight(valueWithoutCheckDigit);

  for (let i = 0; i < reversedDigits.length; i += 1) {
    const digit = reversedDigits[i]!;
    const permuted = P_TABLE[(i + 1) % 8]![digit]!;
    checksum = D_TABLE[checksum]![permuted]!;
  }

  return INV_TABLE[checksum]!;
}
