// Kệ sưu tầm trang /chill: xong phin thì mèo mang ra một món cho kệ (bậu cửa sổ quán, bậu
// cửa phòng học, lan can ban công). Không điểm, không bảng xếp hạng, bỏ ngày nào cũng không
// mất gì. Chỉ lưu trên máy người xem — không tài khoản. Bật/tắt ở Studio "Chill · Cài đặt".
//
// Mỗi phin xong được tối đa 1 món:
// - Phin đầu tiên: luôn là ly sứ men lam
// - Món theo dịp (điểm đến đang xem, trời mưa, sương mù, đêm) — có trước, vì hiếm
// - Món thường theo tổng số phin đã xong (REGULAR_AT). Lỡ mốc vì phin đó nhận món dịp thì
//   phin sau bù lại; khách cũ đã làm nhiều phin thì mỗi phin mới nhận dần từng món
//
// Hình vẽ bằng lưới ký tự (mỗi ký tự 1 ô, '.' = trong suốt), khoảng 20×20 ô có sáng tối
// (vẽ lại 2026-10-20, gấp đôi độ chi tiết bản đầu), phóng ×ART_SCALE theo px gốc
// 640×360 như lọ tip. scene.ts vẽ vào lớp đồ vật rồi tô màu theo giờ như nội thất.

import type {TimeOfDay, Weather} from './scene'

const KEY = 'chill:shelf'
export const ART_SCALE = 1
// Kệ bày tối đa bấy nhiêu món; mỗi phòng có số ô riêng (themes.ts: shelf), thừa thì không hiện
export const SHELF_MAX = 8

type Sprite = {rows: string[]; palette: Record<string, string>}

export type ItemKind = 'regular' | 'place' | 'rain' | 'mist' | 'night'

export type ShelfItem = Sprite & {
  id: string
  kind: ItemKind
  // regular: số phin đã xong để có món này · place: id điểm đến (Studio)
  phins?: number
  places?: string[]
}

const O = '#2e211b'

export const ITEMS: ShelfItem[] = [
  // ---------- Món thường, theo số phin ----------
  {
    id: 'porcelain-cup',
    kind: 'regular',
    phins: 1,
    palette: {o: O, W: '#f7f3e9', h: '#ffffff', w: '#e2dccd', s: '#c4baa5', B: '#3a68b0', b: '#86a8dc', d: '#24477f', c: '#4a2a12', C: '#7a4a24', k: '#a8723f', S: '#efe9db', T: '#d6ccb6'},
    rows: [
      '....oooooooooo......',
      '...oWWWWWWWWWWo.....',
      '..oWkCCCCCCCCkWo....',
      '..oWcCCkkkCCCcwo....',
      '..ohWcccccccccwoooo.',
      '..ohWWWWWWWWWwsoWWo.',
      '..ohWbBBbWWbBbwo.oWo',
      '..ohWBWWBWbBWBwo..Wo',
      '..ohWbBBbWWbBbwo.oWo',
      '..ohWWWWWWWWWwsoWWo.',
      '..owddddddddddsoooo.',
      '...owWWWWWWWwso.....',
      '....oowwwwwssoo.....',
      '.ooTSSSSSSSSSSSTTo..',
      'oSShSSSSSSSSSSSSSTo.',
      '.ooTTTTTTTTTTTTToo..',
      '...ooooooooooooo....',
    ],
  },
  {
    id: 'cactus',
    kind: 'regular',
    phins: 3,
    palette: {o: O, G: '#7cbf5a', g: '#4f8f3c', d: '#356b2c', h: '#b8e48f', P: '#f08aa6', p: '#c95c7c', T: '#d07a4c', t: '#a85a34', u: '#7d3f22', L: '#e8a070', s: '#5a3418'},
    rows: [
      '........oPo.........',
      '.......oPpPo........',
      '........ogo.........',
      '.......oGhGo........',
      '..oo...oGhgo...oo...',
      '.oGGo..oGhgo..oGgo..',
      '.oGho..oGhgo..oGgo..',
      '.oGhgooGGhgo..oGgo..',
      '..oGhggGGhgoooGGgo..',
      '...oooGGGhgggGGgo...',
      '......oGGhgdoooo....',
      '......oGGhgdo.......',
      '...ooooooooooooo....',
      '..oLTTTTTTTTTTtto...',
      '..ouuuuuuuuuuuuuo...',
      '...oLTTTTTTTTttto...',
      '...oLTTTTTTTTttto...',
      '....oTTTTTTTTtto....',
      '....oTTTTTTTttto....',
      '.....oooooooooo.....',
    ],
  },
  {
    id: 'candle',
    kind: 'regular',
    phins: 5,
    palette: {o: O, Y: '#ffe08a', y: '#f5a742', r: '#e0603a', w: '#3a2a1a', C: '#f3e6cc', c: '#ddcba6', k: '#c0ab82', G: '#cfe3e6', g: '#a9c4c9', h: '#ffffff', L: '#b9874f', l: '#8a5a2b'},
    rows: [
      '.........o..........',
      '........oYo.........',
      '.......oYYyo........',
      '.......oYyyo........',
      '........oro.........',
      '.........w..........',
      '....oooooooooooo....',
      '...ohGGGGGGGGGGgo...',
      '...ohCCCCCCCCCcgo...',
      '...ohCCCCCCCCCcgo...',
      '...ohCLLLLLLLLcgo...',
      '...ohCLlllllllcgo...',
      '...ohCLLLLLLLLcgo...',
      '...ohCCCCCCCCCcgo...',
      '...ohCCCCCCCCckgo...',
      '...ohcccccccckkgo...',
      '...oGGGGGGGGGGggo...',
      '....oooooooooooo....',
    ],
  },
  {
    id: 'radio',
    kind: 'regular',
    phins: 8,
    palette: {o: O, W: '#a8723f', w: '#7a4a24', h: '#c8945c', d: '#5a3418', S: '#e6cfae', s: '#bfa27c', g: '#8a6a50', Y: '#ffd27a', y: '#e09a3a', k: '#2a1a10', m: '#9a9aa4'},
    rows: [
      '................o.....',
      '...............om.....',
      '..............om......',
      '.............om.......',
      '..oooooooooooooooooo..',
      '.ohhhhhhhhhhhhhhhhWo..',
      '.ohWWWWWWWWWWWWWWWwo..',
      '.ohWSsSsSsSWoYYYoWwo..',
      '.ohWsgsgsgsWoyYkoWwo..',
      '.ohWSsSsSsSWoYYYoWwo..',
      '.ohWsgsgsgsWWWWWWWwo..',
      '.ohWSsSsSsSWkWkWkWwo..',
      '.ohWsgsgsgsWWWWWWWwo..',
      '.ohWWWWWWWWWWWWWWWWwo.',
      '.owwwwwwwwwwwwwwwwwwo.',
      '..odo............odo..',
      '..ooo............ooo..',
    ],
  },
  {
    id: 'piggy-bank',
    kind: 'regular',
    phins: 12,
    palette: {o: O, P: '#f4a6b8', p: '#e07f99', q: '#b85a74', h: '#ffd3dd', k: '#2a1a10', n: '#c95c7c', Y: '#f2cf6b', y: '#c8962c'},
    rows: [
      '.........oYo.........',
      '.........oyo.........',
      '.....oo.oooooo.......',
      '....oPpoPPPPPPoo.....',
      '...oPhhPPPPPPPPPo....',
      '..ohhPPPkPPPPPPPpo...',
      '.ooPPPPPPPPPPPPPPpo..',
      'onnoPPPPPPPPPPPPPpoo.',
      'onkoPPPPPPPPPPPPPppo.',
      'onnoPPPPPPPPPPPPPpqo.',
      '.ooPPPPPPPPPPPPPppqoo',
      '..opPPPPPPPPPPPpppqo.',
      '...oppqoooooooqpqqo..',
      '...opqo......opqqo...',
      '....oo........ooo....',
    ],
  },
  {
    id: 'iced-tea',
    kind: 'regular',
    phins: 16,
    palette: {o: O, G: '#d9ecef', g: '#a9c4c9', h: '#ffffff', T: '#d68a3a', t: '#b0662a', u: '#8c4d1e', I: '#f2fbff', i: '#bfe2ee', L: '#9fd36b'},
    rows: [
      '...ooooooooooooo...',
      '..ohGGGGGGGGGGGgo..',
      '..ohIiTTTTTIiTTgo..',
      '..ohiIiTTTIIiTtgo..',
      '..ohTTTIiTTiTTtgo..',
      '...ohTTiIiTTTtgo...',
      '...ohTTTTTIiTtgo...',
      '...ohTIiTTiItugo...',
      '...ohTiITTTTtugo...',
      '...ohTTTTTTttugo...',
      '....ohTTTTtuugo....',
      '....ohttttuuugo....',
      '....ohGGGGGGggo....',
      '....oooooooooooo...',
    ],
  },
  {
    id: 'alarm-clock',
    kind: 'regular',
    phins: 21,
    palette: {o: O, R: '#d8564a', r: '#a83a32', h: '#f08a7a', Y: '#f2cf6b', y: '#c8962c', W: '#fbf4e4', w: '#e2d8c2', k: '#2a1a10', m: '#8a8a94'},
    rows: [
      '..ooo..........ooo..',
      '.oYYyo...oo...oYyyo.',
      '.oYyyooooYYoooooyyo.',
      '..ooohRRRRRRRRRooo..',
      '....ohRRRRRRRRRro...',
      '...ohRoooooooooRro..',
      '..ohRoWWWWkWWWWoRro.',
      '..ohRoWWWWkWWWWoRro.',
      '..ohRoWkWWkWWkWoRro.',
      '..ohRoWWWWkkkWWoRro.',
      '..ohRoWWWWWWWWwoRro.',
      '..ohRowWWWkWWwwoRro.',
      '...ohRoowwwwwooRro..',
      '....ohRRooooorRro...',
      '.....oorrrrrrroo....',
      '....omo.......omo...',
      '....oo.........oo...',
    ],
  },
  {
    id: 'film-camera',
    kind: 'regular',
    phins: 27,
    palette: {o: O, K: '#3a3640', k: '#2a2630', S: '#d8d8de', s: '#a8a8b2', h: '#f4f4f8', L: '#1c1a22', l: '#4a6a9a', b: '#8fb4e8', R: '#c8423a', B: '#7a5232', n: '#5a3a22'},
    rows: [
      '...oooo....oooooo.....',
      '..ohSSso..ohSSSsso....',
      '.oooooooooooooooooooo.',
      '.ohSSSSSSSSSSSSSSSSso.',
      '.oBBBBBBooooooBBBBBBo.',
      '.oBnBnBoKkkkkKoBnBnBo.',
      '.oBBBBoKLLLLLLKoBBBBo.',
      '.oBnBnoKLllbbLLKoBnBo.',
      '.oBBBBoKLlbhbLLKoBBBo.',
      '.oBnBnoKLLllLLLKoBnBo.',
      '.oBBBBBoKLLLLLKoBBBBo.',
      '.oSSSSSSoKkkkKoSSSsso.',
      '.osssssssooooosssssso.',
      '..oooooooooooooooooo..',
    ],
  },
  {
    id: 'lucky-cat',
    kind: 'regular',
    phins: 34,
    palette: {o: O, W: '#fbf6ea', w: '#e6dcc6', h: '#ffffff', k: '#2a1a10', R: '#d8453a', r: '#a83228', Y: '#f2cf6b', y: '#c8962c', P: '#f4a6b8', O: '#e8a84a'},
    rows: [
      '..............oo....',
      '.............oWWo...',
      '..oo....oo...oWWo...',
      '.oPWo..oWPo..oWwo...',
      '.oWWWooWWWWo.oWwo...',
      '.oWOWWWWWWWWooWwo...',
      '.oWWkWWWWkWWWoWwo...',
      '.oWWWWWkWWWWWWwo....',
      '.ohWWwWkwWWWWwo.....',
      '..oRRRRRYRRRRro.....',
      '..ohWWWoYoWWWwo.....',
      '.ohWWWWWoWWWWWwo....',
      '.ohWWYYYYYYYWWwo....',
      '.ohWWYyYYYyYWWwo....',
      '.ohWWYYYYYYYWwwo....',
      '.ohWWWWWWWWWWwwo....',
      '..owwWWWWWWWwwo.....',
      '..oRRRRRRRRRRro.....',
      '..orrrrrrrrrrro.....',
      '...oooooooooooo.....',
    ],
  },
  {
    id: 'ceramic-vase',
    kind: 'regular',
    phins: 42,
    palette: {o: O, W: '#f5f1e6', w: '#ddd6c4', s: '#bdb39c', h: '#ffffff', B: '#3a68b0', b: '#86a8dc', G: '#6aa84f', g: '#3f7438', P: '#f2b8c6', p: '#d97a92', n: '#7a4a24'},
    rows: [
      '.....oPo...oPPo.....',
      '....oPpPo.oPpPo.....',
      '.....oPo.oo.oPo.....',
      '..oGo.on.n..on......',
      '.oGgo..nn..nn.oGo...',
      '..oo....nnnn.oGgo...',
      '.........nn...oo....',
      '.......oooooo.......',
      '......ohWWWWwo......',
      '.......oWWWwo.......',
      '......ohWWWWwo......',
      '.....ohWWbBbWwo.....',
      '....ohWWbBBBbWwso...',
      '....ohWbBWBWBbwso...',
      '....ohWWbBBBbWwso...',
      '....ohWWWbBbWWwso...',
      '.....ohWWWWWWwso....',
      '.....oBBBBBBBBBo....',
      '......oWWWWWwso.....',
      '......ooooooooo.....',
    ],
  },
  {
    id: 'golden-phin',
    kind: 'regular',
    phins: 50,
    palette: {o: O, Y: '#f2cf6b', y: '#d9a441', d: '#a8752a', h: '#fff2c0', G: '#d9ecef', g: '#a9c4c9', C: '#4a2a12', c: '#7a4a24', k: '#2a1a10', w: '#ffffff'},
    rows: [
      '.......oooooo.......',
      '......ohYYYYdo......',
      '......oyyyyydo......',
      '....oooooooooooo....',
      '...ohYYYYYYYYYYdo...',
      '....ohYYYYYYYYdo....',
      '....ohYYYYYYYYdo....',
      '....ohyYYYYYYddo....',
      '..oooooooooooooooo..',
      '..ohYYYYYYYYYYYYdo..',
      '...oooooodoooooo....',
      '...ohGGGGkGGGGGgo...',
      '...ohGGGGkGGGGGgo...',
      '...ohGcccccccccgo...',
      '...ohGCCCCCCCCCgo...',
      '...ohGCCCCCCCCcgo...',
      '...ohGCCCCCCCccgo...',
      '...ohGGGGGGGGGGgo...',
      '....oooooooooooo....',
    ],
  },

  // ---------- Món theo điểm đến (id điểm đến trong Studio) ----------
  {
    id: 'egg-coffee',
    kind: 'place',
    places: ['hanoi-tau', 'hanoi'],
    palette: {o: O, F: '#f8e7a8', f: '#e8c46a', h: '#fff6d6', C: '#7a4a24', W: '#f7f3e9', w: '#ddd6c4', s: '#bdb39c', A: '#bfe2ee', a: '#8fc2d4', S: '#efe9db', v: '#e8e8ee'},
    rows: [
      '......v....v........',
      '.......v..v.........',
      '......v....v........',
      '....oooooooooo......',
      '...ohFFFFFFFFfo.....',
      '...ohFhFFFFFFfoooo..',
      '...oWWWWWWWWWwsoWWo.',
      '...ohWWWWWWWWwso.oWo',
      '.oooohWWWWWWWwsooWo.',
      'oAAAaohWWWWWwsoaaooo',
      'oAaAAaoowwwwsooaaAao',
      '.oAAAAAAAAAAAAAAAaao',
      '.ohSSSSSSSSSSSSSSso.',
      '..ohSSSSSSSSSSSSso..',
      '...oSSSSSSSSSSSso...',
      '....oooooooooooo....',
    ],
  },
  {
    id: 'strawberry-jam',
    kind: 'place',
    places: ['dalat'],
    palette: {o: O, R: '#c8343a', r: '#8e1f28', h: '#f47a7a', W: '#fbf4e4', K: '#d8453a', k: '#fbf4e4', G: '#d9ecef', g: '#a9c4c9', L: '#f5e9cc', l: '#d9c08a', S: '#e8404a', n: '#6aa84f', y: '#f2cf6b'},
    rows: [
      '.....oooooooooo.....',
      '....oKkKkKkKkKko....',
      '...okKkKkKkKkKkKo...',
      '...oKkKkKkKkKkKko...',
      '....oooooooooooo....',
      '....oGGGGGGGGGgo....',
      '...ohRRRRRRRRRRgo...',
      '...ohRLLLLLLLLRgo...',
      '...ohRLLnSnLLLRgo...',
      '...ohRLLSySLLlRgo...',
      '...ohRLLLSLLLlRgo...',
      '...ohRLlllllllRgo...',
      '...ohRRRRRRRRrRgo...',
      '...ohRRRRRRRrrRgo...',
      '...ohRRRRRRrrrrgo...',
      '....ogggggggggo.....',
      '.....oooooooooo.....',
    ],
  },
  {
    id: 'bag-coffee',
    kind: 'place',
    places: ['saigon'],
    palette: {o: O, P: '#f2eee6', p: '#d9d2c4', g: '#c9c1b2', h: '#ffffff', c: '#5a3418', C: '#7d4a22', m: '#a86b38', i: '#e9f3f7', I: '#bcd9e4', j: '#9cc4d2', r: '#e0557a', R: '#f6c3d1', k: '#3f2410'},
    rows: [
      '.......oo.oo.......',
      '......oPPoPPo......',
      '......oPgPgPo......',
      '.......oPPPo..rR...',
      '........oPo...Rr...',
      '.......oPpPo..rR...',
      '......oPpppPo.Ro...',
      '.....oPhCCCCCooRo..',
      '....oPhCmiImCCRrCo.',
      '....ohCiIjICCmRrco.',
      '...ohCmIijmCCCrRCco',
      '...ohCCCCCiIjCRrCco',
      '...ohCiImCIijCrRcco',
      '...ohCIjICCCCCRrcco',
      '...ohCCCCmiImCrRcco',
      '...oPcCCCCIjICRrcco',
      '....oPcCCCCCCCrRco.',
      '....oPpcccccccRrco.',
      '.....oPpccccccccoo.',
      '......ooPpppppoo...',
      '........oooooo.....',
    ],
  },
  {
    id: 'conical-hat',
    kind: 'place',
    places: ['hue'],
    palette: {o: O, Y: '#f3e2b8', y: '#d9c08a', d: '#b89a62', h: '#fff6dc', l: '#c8a970', R: '#c8423a'},
    rows: [
      '..........o...........',
      '.........oYo..........',
      '........ohYyo.........',
      '.......ohYYyyo........',
      '......ohYYlYyyo.......',
      '.....ohYYYYYlyyo......',
      '....ohYYlYYYYYyyo.....',
      '...ohYYYYYYlYYYyyo....',
      '..ohYYYlYYYYYYlyyyo...',
      '.ohYYYYYYYYlYYYYyyyo..',
      'ohyyyyyyyyyyyyyyyddddo',
      '.oooooooooooooooooooo.',
      '......oR........Ro....',
      '.......oR......Ro.....',
      '........oRRRRRRo......',
    ],
  },
  {
    id: 'coconut',
    kind: 'place',
    places: ['mientay', 'cantho', 'tiengiang'],
    palette: {o: O, G: '#7cbf5a', g: '#4f8f3c', d: '#356b2c', h: '#b8e48f', W: '#f7f3e9', w: '#e2dccd', P: '#e0557a', p: '#f6c3d1', b: '#9a6a3a'},
    rows: [
      '.............oPo....',
      '............oPpo....',
      '...........oPpo.....',
      '..........oPpo......',
      '....ooooooPpoooo....',
      '...oWWWWWoPowwwo....',
      '..ohWWWwwoowwwwgo...',
      '..ohGWWwwwwwwwGgo...',
      '.ohGGGWWWWWWGGGggo..',
      '.ohGGGGGGGGGGGGggo..',
      '.ohGhGGGGGGGGGgggo..',
      '.ohGGGGGGGGGGGggdo..',
      '.ohGGGGGGGGGGgggdo..',
      '..ohGGGGGGGGgggdo...',
      '..ohGGGGGGGgggddo...',
      '...ogGGGGGgggddo....',
      '....oogggggdddo.....',
      '......ooooooo.......',
    ],
  },
  {
    id: 'seashell',
    kind: 'place',
    places: ['nhatrang'],
    palette: {o: O, S: '#f6d8c0', s: '#e3b08e', d: '#c08060', h: '#fff2e6', P: '#f2a8a8', p: '#d88080'},
    rows: [
      '.......ooo..........',
      '......ohSo..........',
      '.....ohSSso.........',
      '.....ohSsso.........',
      '....ohSSSsdo........',
      '....ohSsssddo.......',
      '...ohSSSSssddo......',
      '...ohSsssssddo......',
      '..ohSSSSSSsssdo.....',
      '..ohSssssssssddoo...',
      '.ohSSSSSSSSsssPPPoo.',
      '.ohSsssssssssPPPpppo',
      'ohSSSSSSSSSSsPPpppo.',
      'oddddddddddddddppo..',
      '.ooooooooooooooo....',
    ],
  },

  // ---------- Món theo trời, theo giờ ----------
  {
    id: 'umbrella',
    kind: 'rain',
    palette: {o: O, R: '#c8423a', r: '#e36b55', q: '#922c27', Y: '#f3e2b8', y: '#d9c08a', h: '#ffd9c9', w: '#7a4a24', W: '#a8723f', b: '#9cc8ff', B: '#d7ecff', m: '#5a5560'},
    rows: [
      '..........o..........',
      '.........omo.........',
      '.......ooYooo........',
      '.....ooRrYYrRoo......',
      '....oRrhYYYYrRRo.....',
      '...oRrhrYYYYYrRRo....',
      '..oRrhrRYYYYYYrRRo...',
      '..oRhrRRYyyyYYrRqo...',
      '.oRrrRRRyyyyyyRRqqo..',
      '.oRrRRRRyyyyyyRRRqo..',
      'oqRRRRRRyyyyyyRRRqqo.',
      'oooqqoooyyoooqqooooo.',
      '..o..o...oWo..o...o..',
      '..b......oWo.....b...',
      '.........oWo.........',
      '..B......oWo.....b...',
      '.........oWo..b......',
      '.....b...oWo.........',
      '.........oWoo.oo.....',
      '..........owWoWo.....',
      '...........oooo......',
    ],
  },
  {
    id: 'teapot',
    kind: 'mist',
    palette: {o: O, W: '#f5f1e6', w: '#ddd6c4', s: '#bdb39c', h: '#ffffff', B: '#3a68b0', b: '#86a8dc', n: '#7a4a24', v: '#e8e8ee'},
    rows: [
      '.......v....v..........',
      '........v..v...........',
      '.......v....v..........',
      '........onno...........',
      '.......oWWWWo..........',
      '.....oooooooooo........',
      '....ohWWWWWWWWwo..oo...',
      '...ohWWWWWWWWWwso.oWo..',
      'oo.ohWWbBBbWWWwsooWo...',
      'oWoohWbBWWBbWWwsoWo....',
      '.oWohWbBWWBbWWwsWo.....',
      '..oWhWWbBBbWWWwso......',
      '...ohWWWWWWWWWwso......',
      '...ohWWWWWWWWwwso......',
      '....ohwwwwwwwwso.......',
      '.....oooooooooo........',
    ],
  },
  {
    id: 'oil-lamp',
    kind: 'night',
    palette: {o: O, Y: '#ffe08a', y: '#f5a742', r: '#e0603a', G: '#e3f1f4', g: '#b4d0d6', h: '#ffffff', B: '#d9a441', b: '#a8752a', d: '#7a5218', K: '#c8e0e6', k: '#9cc4d2', F: '#fff6c8'},
    rows: [
      '.......oooooo........',
      '......ohGGGGgo.......',
      '.......ohGGgo........',
      '.......ohGFgo........',
      '......ohGGYGgo.......',
      '.....ohGGYYyGgo......',
      '.....ohGYYyyGgo......',
      '.....ohGGryGGgo......',
      '......ohGGGGgo.......',
      '.....ooBBBBBBoo......',
      '....ohBBBBBBBBbo.....',
      '...ohKKKKKKKKKKko....',
      '..ohKKkkkkkkkkKkko...',
      '..ohKkkkkkkkkkkkko...',
      '...ohKKKKKKKKKKko....',
      '....ooBBBBBBBBoo.....',
      '.....ohBBBBBBbo......',
      '....ohBBBBBBBBbo.....',
      '...oooooooooooooo....',
    ],
  },
]

export const itemById = (id: string) => ITEMS.find((i) => i.id === id)
const REGULAR = ITEMS.filter((i) => i.kind === 'regular')

// ---------- Lưu trên máy ----------

// Lúc nhận món: điểm đến, trời, giờ, phin thứ mấy — hiện trên thẻ sưu tầm. Món nhận trước
// khi có thẻ thì không có (chỉ còn ngày)
export type GiftContext = {place?: string; weather?: Weather; time?: TimeOfDay; phin?: number}

export type ShelfState = {
  // Món đã có, theo thứ tự nhận
  owned: {id: string; at: string; ctx?: GiftContext}[]
  // Món đang bày trên kệ, trái → phải (tối đa SHELF_MAX)
  shown: string[]
  // Món mới nhận mà khách chưa mở xem (dấu "MỚI" trong kệ)
  unseen?: string[]
}

// Độ hiếm: món thường theo số phin · theo dịp (điểm đến) · rất hiếm (trời mưa / sương / đêm)
export type Rarity = 'common' | 'place' | 'rare'
export const rarityOf = (item: ShelfItem): Rarity => (item.kind === 'regular' ? 'common' : item.kind === 'place' ? 'place' : 'rare')

const EMPTY: ShelfState = {owned: [], shown: []}
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function loadShelf(): ShelfState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ShelfState> | null
    if (!saved || !Array.isArray(saved.owned)) return EMPTY
    const owned = saved.owned
      .filter((o) => o && typeof o.id === 'string' && itemById(o.id))
      .map((o) => ({id: o.id, at: String(o.at ?? ''), ...(o.ctx && typeof o.ctx === 'object' ? {ctx: cleanCtx(o.ctx)} : {})}))
    const have = new Set(owned.map((o) => o.id))
    const shown = (Array.isArray(saved.shown) ? saved.shown : []).filter((id) => have.has(id)).slice(0, SHELF_MAX)
    const unseen = (Array.isArray(saved.unseen) ? saved.unseen : []).filter((id) => have.has(id))
    return {owned, shown, unseen}
  } catch {
    return EMPTY
  }
}

const WEATHERS: Weather[] = ['clear', 'rain', 'mist']
const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'night']
function cleanCtx(c: GiftContext): GiftContext {
  return {
    ...(typeof c.place === 'string' ? {place: c.place} : {}),
    ...(WEATHERS.includes(c.weather as Weather) ? {weather: c.weather} : {}),
    ...(TIMES.includes(c.time as TimeOfDay) ? {time: c.time} : {}),
    ...(typeof c.phin === 'number' && c.phin > 0 ? {phin: Math.round(c.phin)} : {}),
  }
}

function save(s: ShelfState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Chặn storage — kệ chỉ có trong lần xem này
  }
}

export type Moment = {phins: number; place: string | undefined; weather: Weather; time: TimeOfDay}

// Món cho phin vừa xong (`phins` = tổng số phin đã xong, tính cả phin này); null = lần này chưa có
export function pickGift(s: ShelfState, m: Moment): ShelfItem | null {
  // Phin đầu tiên luôn được ly sứ (chuyện của nó là "ly đầu tiên ở quán")
  if (!s.owned.length) return REGULAR[0]
  const have = new Set(s.owned.map((o) => o.id))
  const fresh = (i: ShelfItem) => !have.has(i.id)
  const special = ITEMS.find(
    (i) =>
      fresh(i) &&
      ((i.kind === 'place' && m.place && i.places?.includes(m.place)) ||
        (i.kind === 'rain' && m.weather === 'rain') ||
        (i.kind === 'mist' && m.weather === 'mist') ||
        (i.kind === 'night' && m.time === 'night')),
  )
  if (special) return special
  return REGULAR.find((i) => fresh(i) && (i.phins ?? 0) <= m.phins) ?? null
}

// Nhận món: kệ còn chỗ thì bày luôn
export function addItem(s: ShelfState, id: string, now = new Date(), ctx?: GiftContext): ShelfState {
  if (s.owned.some((o) => o.id === id)) return s
  const next = {
    owned: [...s.owned, {id, at: dayKey(now), ...(ctx ? {ctx: cleanCtx(ctx)} : {})}],
    shown: s.shown.length < SHELF_MAX ? [...s.shown, id] : s.shown,
    unseen: [...(s.unseen ?? []), id],
  }
  save(next)
  return next
}

// Khách đã mở xem món → bỏ dấu "MỚI"
export function markSeen(s: ShelfState, id: string): ShelfState {
  if (!s.unseen?.includes(id)) return s
  const next = {...s, unseen: s.unseen.filter((x) => x !== id)}
  save(next)
  return next
}

// Bày / cất một món. Kệ đầy thì cất món bày lâu nhất để nhường chỗ
export function toggleShown(s: ShelfState, id: string): ShelfState {
  if (!s.owned.some((o) => o.id === id)) return s
  const shown = s.shown.includes(id) ? s.shown.filter((x) => x !== id) : [...s.shown, id].slice(-SHELF_MAX)
  const next = {...s, shown}
  save(next)
  return next
}

// Gợi ý cho món chưa có — trả về khoá i18n kiểu món + số phin (món thường)
export const nextRegular = (s: ShelfState) => REGULAR.find((i) => !s.owned.some((o) => o.id === i.id))

// Còn mấy phin nữa thì có món thường `item` (0 = đã có). Mỗi phin mèo mang ra tối đa 1 món,
// món thường theo thứ tự (pickGift) → khách pha nhiều phin từ trước khi có kệ vẫn phải nhận
// dần các món đứng trước. Món hiếm có thể chen vào nên đây là số ít nhất
export function phinsLeft(s: ShelfState, item: ShelfItem, phins: number) {
  let left = 0
  for (const i of REGULAR) {
    const have = s.owned.some((o) => o.id === i.id)
    if (!have) left = Math.max(left + 1, (i.phins ?? 0) - phins)
    if (i.id === item.id) return have ? 0 : left
  }
  return left
}

// ---------- Vẽ ----------

export const spriteSize = (item: Sprite) => ({w: Math.max(...item.rows.map((r) => r.length)), h: item.rows.length})

// Vẽ món quanh gốc (x, y) = giữa đáy. `shadow` = tô cả hình một màu (món chưa có trong sổ)
export function drawItem(ctx: CanvasRenderingContext2D, item: Sprite, x: number, y: number, scale = ART_SCALE, shadow?: string) {
  const {w, h} = spriteSize(item)
  const left = Math.round(x - (w * scale) / 2)
  const top = y - h * scale
  item.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = row[i] === '.' ? null : (shadow ?? item.palette[row[i]])
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(left + i * scale, top + j * scale, scale, scale)
    }
  })
}

// Vùng bấm quanh món đặt ở (x, y) đáy giữa, theo px gốc
export function itemHitBox(item: Sprite, x: number, y: number) {
  const {w, h} = spriteSize(item)
  return {x: x - (w * ART_SCALE) / 2 - 3, y: y - h * ART_SCALE - 3, w: w * ART_SCALE + 6, h: h * ART_SCALE + 5}
}
