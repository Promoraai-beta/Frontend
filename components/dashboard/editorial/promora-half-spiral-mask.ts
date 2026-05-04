/**
 * CSS mask = first path of Promora spiral only (“half-stamped” hero mark).
 * @see dashboard BrandStamp spec (noise + gradient + overlay in component).
 */
const HALF_SPIRAL_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 328 366'><g fill='black'><path d='M 41 93 L 38 98 L 25 147 L 26 156 L 34 165 L 44 169 L 181 169 L 185 176 L 183 181 L 73 254 L 68 259 L 63 269 L 63 279 L 67 286 L 109 323 L 119 324 L 128 320 L 137 310 L 202 205 L 207 204 L 211 207 L 197 331 L 202 339 L 209 340 L 241 326 L 247 318 L 248 305 L 236 229 L 226 201 L 206 169 L 179 143 L 147 124 L 64 89 L 52 88 Z'/></g></svg>"

export const promoraHalfSpiralMaskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(HALF_SPIRAL_SVG)}")`
