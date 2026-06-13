import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.join(__dirname, 'assets')

const ASSETS = {
  lobby: path.join(ASSETS_DIR, 'Lobby.jpg'),
  flag:  path.join(ASSETS_DIR, 'Bendera.svg'),
  font:  path.join(ASSETS_DIR, 'noto-sans.regular.ttf')
}

GlobalFonts.registerFromPath(ASSETS.font, 'NotoSans')

function getRankPath(rank) {
  return path.join(ASSETS_DIR, 'rank', `${rank}.webp`)
}

function getBorderPath(border) {
  return path.join(ASSETS_DIR, 'border', `${border}.webp`)
}

const config = {
  canvas: { width: 960, height: 1706 },
  rank_name: 'imo',
  border_num: 0,
  avatar: { x: 389, y: 446, size: 204, borderRadius: 12 },
  outline: { color: '#b8956f', thickness: 4 },
  rank: { x: 387, y: 760, size: 210 },
  flag: { x: 364, y: 428, size: 55 },
  username: { a: 681, b: 727, c: 400, centerX: 496, d: 609, fontSize: 36, maxChars: 15, color: '#ffffff' },
  debug: false
}

const BORDER_OFFSET = {
  1: 26, 2: 36, 3: 26, 4: 26, 5: 26,
  6: 26, 7: 26, 8: 26, 9: 26,
  10: 26, 11: 22, 12: 28, 13: 26,
  14: 21, 15: 26, 16: 26
}

const RANK_CONFIG = {
  epic:   { size: 210, x: 388, y: 760 },
  glory:  { size: 210, x: 387, y: 760 },
  gm:     { size: 260, x: 358, y: 760 },
  honor:  { size: 210, x: 384, y: 760 },
  imo:    { size: 260, x: 358, y: 760 },
  legend: { size: 260, x: 360, y: 760 },
  mawi:   { size: 210, x: 387, y: 760 }
}

async function loadFromUrl(url) {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  return loadImage(Buffer.from(buffer))
}

function calcHeight(img, size) {
  return size * (img.height / img.width)
}

function drawAvatar(ctx, img, cfg, outlineCfg = null) {
  const { x, y, size, borderRadius } = cfg
  const height = calcHeight(img, size)
  const r = borderRadius || 0
  ctx.save()
  if (outlineCfg) {
    const { color, thickness } = outlineCfg
    ctx.beginPath()
    ctx.roundRect(x - thickness, y - thickness, size + thickness * 2, height + thickness * 2, r + thickness)
    ctx.strokeStyle = color
    ctx.lineWidth = thickness * 2
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.roundRect(x, y, size, height, r)
  ctx.clip()
  ctx.drawImage(img, x, y, size, height)
  ctx.restore()
}

function drawBorder(ctx, img, avatarCfg, borderCfg) {
  const { x, y, size } = avatarCfg
  const { offset } = borderCfg
  const bSize = size + offset * 2
  ctx.drawImage(img, x - offset, y - offset, bSize, bSize)
}

function drawFlagCircle(ctx, img, cfg) {
  const { x, y, size } = cfg
  const radius = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

function drawUsername(ctx, username, cfg) {
  const { a, b, c, d, centerX, fontSize, maxChars, color } = cfg
  const y = a
  const w = d - c
  const h = b - a
  const name = username.slice(0, maxChars)
  let size = fontSize
  ctx.textAlign = 'center'
  while (size > 8) {
    ctx.font = `${size}px NotoSans`
    if (ctx.measureText(name).width <= w) break
    size -= 1
  }
  ctx.fillStyle = color
  ctx.font = `${size}px NotoSans`
  ctx.fillText(name, centerX, y + h / 2 + size / 3)
}

async function generateCard({ avatar, username = 'Player', rank = config.rank_name, border = config.border_num } = {}) {
  const useBorder = border && border > 0

  const avatarImg = avatar
    ? await loadFromUrl(avatar)
    : await loadImage(path.join(ASSETS_DIR, 'avatar.jpg'))

  const baseImages = [
    loadImage(ASSETS.lobby),
    Promise.resolve(avatarImg),
    loadImage(ASSETS.flag),
    loadImage(getRankPath(rank))
  ]

  if (useBorder) baseImages.push(loadImage(getBorderPath(border)))

  const [lobbyImg, avatarImgLoaded, flagImg, rankImg, borderImg] = await Promise.all(baseImages)

  const { width, height } = config.canvas
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(lobbyImg, 0, 0, width, height)
  drawAvatar(ctx, avatarImgLoaded, config.avatar, useBorder ? null : config.outline)

  if (useBorder) {
    drawBorder(ctx, borderImg, config.avatar, { offset: BORDER_OFFSET[border] ?? 26 })
  }

  const rankCfg = RANK_CONFIG[rank] ?? { size: config.rank.size, x: config.rank.x, y: config.rank.y }
  ctx.drawImage(rankImg, rankCfg.x, rankCfg.y, rankCfg.size, calcHeight(rankImg, rankCfg.size))

  drawFlagCircle(ctx, flagImg, config.flag)
  drawUsername(ctx, username, config.username)

  const buffer = await canvas.encode('png')

  return {
    status: true,
    data: {
      rank,
      image: buffer
    }
  }
}

export default generateCard
export { generateCard, config, RANK_CONFIG, BORDER_OFFSET }