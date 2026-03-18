export async function qrCodeHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let data: string;
  if (typeof config.data === "string" && config.data.length > 0) {
    data = config.data;
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    data = fieldValue;
  } else {
    throw new Error("config.data must be a non-empty string");
  }

  const size = typeof config.size === "number" ? config.size : 200;
  const modules = generateQrModules(data);
  const svg = renderSvg(modules, size);

  return { svg, data };
}

// Simple QR code generation (Version 1-4, byte mode, error correction level L)
function generateQrModules(data: string): boolean[][] {
  const bytes = Buffer.from(data, "utf-8");
  const dataLen = bytes.length;

  // Choose version based on data length (byte mode, EC level L)
  // Max byte capacities for L: v1=17, v2=32, v3=53, v4=78
  let version: number;
  let totalDataCodewords: number;
  let ecCodewordsPerBlock: number;
  let numBlocks: number;

  if (dataLen <= 17) {
    version = 1;
    totalDataCodewords = 19;
    ecCodewordsPerBlock = 7;
    numBlocks = 1;
  } else if (dataLen <= 32) {
    version = 2;
    totalDataCodewords = 34;
    ecCodewordsPerBlock = 10;
    numBlocks = 1;
  } else if (dataLen <= 53) {
    version = 3;
    totalDataCodewords = 55;
    ecCodewordsPerBlock = 15;
    numBlocks = 1;
  } else if (dataLen <= 78) {
    version = 4;
    totalDataCodewords = 80;
    ecCodewordsPerBlock = 20;
    numBlocks = 1;
  } else {
    throw new Error("Data too long for QR code (max 78 bytes for version 4)");
  }

  const moduleCount = 17 + version * 4;

  // Encode data in byte mode
  const bitStream: number[] = [];

  // Mode indicator: 0100 (byte mode)
  pushBits(bitStream, 0b0100, 4);

  // Character count indicator (8 bits for versions 1-9 in byte mode)
  pushBits(bitStream, dataLen, 8);

  // Data
  for (let i = 0; i < dataLen; i++) {
    pushBits(bitStream, bytes[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const totalDataBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, totalDataBits - bitStream.length);
  pushBits(bitStream, 0, terminatorLen);

  // Pad to byte boundary
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  // Pad with alternating 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitStream.length < totalDataBits) {
    pushBits(bitStream, padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bit stream to codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bitStream.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bitStream[i + j] || 0);
    }
    dataCodewords.push(byte);
  }

  // Generate EC codewords using Reed-Solomon
  const ecCodewords = reedSolomonEncode(dataCodewords, ecCodewordsPerBlock);

  // Interleave (single block, so just concatenate)
  const finalCodewords = [...dataCodewords, ...ecCodewords];

  // Build module grid
  const grid: (boolean | null)[][] = [];
  for (let r = 0; r < moduleCount; r++) {
    grid.push(new Array(moduleCount).fill(null));
  }

  // Place finder patterns
  placeFinderPattern(grid, 0, 0);
  placeFinderPattern(grid, 0, moduleCount - 7);
  placeFinderPattern(grid, moduleCount - 7, 0);

  // Place separators
  for (let i = 0; i < 8; i++) {
    // Top-left
    if (i < moduleCount) {
      if (7 < moduleCount) grid[i][7] = false;
      if (7 < moduleCount) grid[7][i] = false;
    }
    // Top-right
    if (moduleCount - 8 >= 0 && i < moduleCount) {
      grid[i][moduleCount - 8] = false;
    }
    if (7 < moduleCount) {
      grid[7][moduleCount - 8 + i] = grid[7][moduleCount - 8 + i] ?? false;
    }
    // Bottom-left
    if (moduleCount - 8 >= 0) {
      grid[moduleCount - 8][i] = false;
    }
    if (moduleCount - 8 + i < moduleCount && i < 8) {
      grid[moduleCount - 8 + i][7] = false;
    }
  }

  // Place alignment patterns (version 2+)
  if (version >= 2) {
    const alignPos = getAlignmentPositions(version);
    for (const r of alignPos) {
      for (const c of alignPos) {
        // Skip if overlapping with finder patterns
        if (r <= 8 && c <= 8) continue;
        if (r <= 8 && c >= moduleCount - 8) continue;
        if (r >= moduleCount - 8 && c <= 8) continue;
        placeAlignmentPattern(grid, r, c);
      }
    }
  }

  // Place timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    if (grid[6][i] === null) grid[6][i] = i % 2 === 0;
    if (grid[i][6] === null) grid[i][6] = i % 2 === 0;
  }

  // Dark module
  grid[moduleCount - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i < moduleCount && grid[8][i] === null) grid[8][i] = false;
    if (i < moduleCount && grid[i][8] === null) grid[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (grid[8][moduleCount - 1 - i] === null) grid[8][moduleCount - 1 - i] = false;
    if (grid[moduleCount - 1 - i][8] === null) grid[moduleCount - 1 - i][8] = false;
  }

  // Place data bits
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((cw >> b) & 1);
    }
  }

  let bitIndex = 0;
  let upward = true;

  for (let col = moduleCount - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // Skip timing column

    const rowRange = upward
      ? Array.from({ length: moduleCount }, (_, i) => moduleCount - 1 - i)
      : Array.from({ length: moduleCount }, (_, i) => i);

    for (const row of rowRange) {
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (c < 0 || c >= moduleCount) continue;
        if (grid[row][c] !== null) continue;

        grid[row][c] = bitIndex < allBits.length ? allBits[bitIndex] === 1 : false;
        bitIndex++;
      }
    }
    upward = !upward;
  }

  // Apply mask pattern 0 (checkerboard: (row + col) % 2 === 0)
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isDataModule(grid, r, c, moduleCount, version)) {
        if ((r + c) % 2 === 0) {
          grid[r][c] = !grid[r][c];
        }
      }
    }
  }

  // Place format info (EC level L = 01, mask 0 = 000 -> format bits = 01000)
  const formatBits = getFormatBits(0b01, 0b000);
  placeFormatBits(grid, formatBits, moduleCount);

  // Convert to boolean[][]
  const result: boolean[][] = [];
  for (let r = 0; r < moduleCount; r++) {
    result.push(grid[r].map((v) => v === true));
  }

  return result;
}

function pushBits(arr: number[], value: number, numBits: number): void {
  for (let i = numBits - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}

function placeFinderPattern(grid: (boolean | null)[][], row: number, col: number): void {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (row + r < grid.length && col + c < grid.length) {
        grid[row + r][col + c] = pattern[r][c] === 1;
      }
    }
  }
}

function placeAlignmentPattern(grid: (boolean | null)[][], centerRow: number, centerCol: number): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      grid[centerRow + r][centerCol + c] = isEdge || isCenter;
    }
  }
}

function getAlignmentPositions(version: number): number[] {
  const positions: number[][] = [
    [],       // v0 (unused)
    [],       // v1
    [6, 18],  // v2
    [6, 22],  // v3
    [6, 26],  // v4
  ];
  return positions[version] || [];
}

function isDataModule(
  grid: (boolean | null)[][],
  row: number,
  col: number,
  moduleCount: number,
  _version: number,
): boolean {
  // Finder patterns + separators
  if (row <= 8 && col <= 8) return false;
  if (row <= 8 && col >= moduleCount - 8) return false;
  if (row >= moduleCount - 8 && col <= 8) return false;

  // Timing patterns
  if (row === 6 || col === 6) return false;

  // Format info
  if (row === 8 && (col <= 8 || col >= moduleCount - 8)) return false;
  if (col === 8 && (row <= 8 || row >= moduleCount - 8)) return false;

  return true;
}

// Reed-Solomon encoding in GF(256) with primitive polynomial 0x11D
function reedSolomonEncode(data: number[], numEc: number): number[] {
  const gf256Exp: number[] = new Array(512);
  const gf256Log: number[] = new Array(256);

  let x = 1;
  for (let i = 0; i < 255; i++) {
    gf256Exp[i] = x;
    gf256Log[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    gf256Exp[i] = gf256Exp[i - 255];
  }

  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < numEc; i++) {
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j];
      newGen[j + 1] ^= gf256Multiply(gen[j], gf256Exp[i], gf256Exp, gf256Log);
    }
    gen = newGen;
  }

  // Divide
  const result = new Array(numEc).fill(0);
  const msgOut = [...data, ...result];

  for (let i = 0; i < data.length; i++) {
    const coef = msgOut[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msgOut[i + j] ^= gf256Multiply(gen[j], coef, gf256Exp, gf256Log);
      }
    }
  }

  return msgOut.slice(data.length);
}

function gf256Multiply(a: number, b: number, exp: number[], log: number[]): number {
  if (a === 0 || b === 0) return 0;
  return exp[(log[a] + log[b]) % 255];
}

function getFormatBits(ecLevel: number, mask: number): number[] {
  let format = (ecLevel << 3) | mask;

  // BCH(15,5) encoding
  let data = format << 10;
  const generator = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((data >> i) & 1) {
      data ^= generator << (i - 10);
    }
  }
  const encoded = ((format << 10) | data) ^ 0b101010000010010;

  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) {
    bits.push((encoded >> i) & 1);
  }
  return bits;
}

function placeFormatBits(grid: (boolean | null)[][], bits: number[], moduleCount: number): void {
  // Around top-left finder pattern
  const positions1: [number, number][] = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3],
    [8, 2], [8, 1], [8, 0],
  ];

  // Across bottom-left and top-right
  const positions2: [number, number][] = [
    [8, moduleCount - 1], [8, moduleCount - 2], [8, moduleCount - 3],
    [8, moduleCount - 4], [8, moduleCount - 5], [8, moduleCount - 6],
    [8, moduleCount - 7], [8, moduleCount - 8],
    [moduleCount - 7, 8], [moduleCount - 6, 8], [moduleCount - 5, 8],
    [moduleCount - 4, 8], [moduleCount - 3, 8], [moduleCount - 2, 8],
    [moduleCount - 1, 8],
  ];

  for (let i = 0; i < 15; i++) {
    const [r1, c1] = positions1[i];
    grid[r1][c1] = bits[i] === 1;

    const [r2, c2] = positions2[i];
    grid[r2][c2] = bits[i] === 1;
  }
}

function renderSvg(modules: boolean[][], size: number): string {
  const moduleCount = modules.length;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const cellSize = size / totalModules;

  let paths = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        const x = (c + quietZone) * cellSize;
        const y = (r + quietZone) * cellSize;
        paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="white"/>` +
    `<g fill="black">${paths}</g></svg>`;
}
