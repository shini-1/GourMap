/**
 * FoxMascot — GourMap's pixel-art fox with a top hat
 *
 * Rendered entirely with React Native Views — no image file required.
 * Use <FoxMascot size={48} /> anywhere in the app.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  size?: number;
}

// Each pixel row is an array of color strings or null (transparent)
// Grid is 16×20 (width × height): 16 columns, 20 rows
// Row 0 = top, Row 19 = bottom

const T = null;           // transparent
const B = '#1A1A1A';      // black outline
const O = '#E8621A';      // orange fur
const LO = '#F5A623';     // light orange
const W = '#FFFFFF';      // white (eyes, chest)
const G = '#888888';      // dark gray (hat body)
const DG = '#555555';     // darker gray (hat brim shadow)
const LG = '#AAAAAA';     // light gray (hat highlight)
const P = '#FFD700';      // gold (hat band)
const N = '#1A1A1A';      // nose (black)
const PK = '#FF9999';     // pink (inner ear)

// 16-wide × 20-tall pixel grid
const PIXELS: (string | null)[][] = [
  // Row 0 — top of hat
  [T, T, T, T, B, B, B, B, B, B, B, B, T, T, T, T],
  // Row 1 — hat top
  [T, T, T, B, LG,LG,LG,LG,LG,LG,LG,LG,B, T, T, T],
  // Row 2 — hat body
  [T, T, T, B, G, G, G, G, G, G, G, G, B, T, T, T],
  // Row 3 — hat body
  [T, T, T, B, G, G, G, G, G, G, G, G, B, T, T, T],
  // Row 4 — hat band (gold)
  [T, T, T, B, P, P, P, P, P, P, P, P, B, T, T, T],
  // Row 5 — hat brim
  [T, T, B, B, DG,DG,DG,DG,DG,DG,DG,DG,B, B, T, T],
  // Row 6 — ears start + head top
  [T, B, O, O, B, O, O, O, O, O, O, B, O, O, B, T],
  // Row 7 — ears with pink inner
  [T, B, O, PK,B, O, O, O, O, O, O, B, PK,O, B, T],
  // Row 8 — head
  [T, B, O, O, O, O, O, O, O, O, O, O, O, O, B, T],
  // Row 9 — eyes row
  [T, B, O, O, B, W, B, O, O, B, W, B, O, O, B, T],
  // Row 10 — eyes pupils
  [T, B, O, O, B, B, B, O, O, B, B, B, O, O, B, T],
  // Row 11 — cheeks + nose
  [T, B, LO,LO,O, O, N, O, O, N, O, O, LO,LO,B, T],
  // Row 12 — muzzle
  [T, B, LO,LO,LO,LO,LO,LO,LO,LO,LO,LO,LO,LO,B, T],
  // Row 13 — chin
  [T, T, B, O, O, O, O, O, O, O, O, O, O, B, T, T],
  // Row 14 — neck / chest start
  [T, T, B, O, O, W, W, W, W, W, W, O, O, B, T, T],
  // Row 15 — chest
  [T, T, B, O, W, W, W, W, W, W, W, W, O, B, T, T],
  // Row 16 — body
  [T, T, B, O, O, W, W, W, W, W, W, O, O, B, T, T],
  // Row 17 — body lower
  [T, T, T, B, O, O, O, O, O, O, O, O, B, T, T, T],
  // Row 18 — body bottom
  [T, T, T, B, O, O, O, O, O, O, O, O, B, T, T, T],
  // Row 19 — feet
  [T, T, T, B, B, O, O, B, B, O, O, B, B, T, T, T],
];

const GRID_COLS = 16;
const GRID_ROWS = 20;

export default function FoxMascot({ size = 48 }: Props) {
  const pixelSize = size / GRID_COLS;

  return (
    <View
      style={{
        width: size,
        height: (size / GRID_COLS) * GRID_ROWS,
      }}
    >
      {PIXELS.map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row' }}>
          {row.map((color, colIdx) => (
            <View
              key={colIdx}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: color ?? 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
