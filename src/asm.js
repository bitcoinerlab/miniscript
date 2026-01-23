export const cleanAsm = asm =>
  asm
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +(?= )/g, '');
