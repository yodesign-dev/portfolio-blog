// Bàn nhóm (thử nghiệm) — phần dùng chung giữa nút mời (GroupTable.tsx) và
// cảnh canvas (scene.ts): 6 nhân vật có sẵn và cách xếp bạn bè vào 4 ghế.

export const SEATS = 4

// Tạm vẽ bằng khối màu (avatar ở thanh trên + người ngồi trong cảnh bàn nhóm);
// khi có sprite nhìn chính diện thì thay phần vẽ, giữ nguyên thứ tự này.
export const CHARACTERS = [
  {name: 'Áo đỏ', shirt: '#b85f5a', hair: '#2b1d16', skin: '#e8b98f'},
  {name: 'Áo xanh lá', shirt: '#56785a', hair: '#3a2618', skin: '#d9a77c'},
  {name: 'Áo tím', shirt: '#6a5fa0', hair: '#1f1a17', skin: '#f0c7a0'},
  {name: 'Áo xanh dương', shirt: '#3e6a8a', hair: '#5a3a22', skin: '#c99068'},
  {name: 'Áo vàng', shirt: '#b08a3e', hair: '#2b1d16', skin: '#e8b98f'},
  {name: 'Áo hồng', shirt: '#9a4e78', hair: '#3a2618', skin: '#d9a77c'},
]

export const STATUS_LABEL: Record<string, string> = {work: 'đang làm', coffee: 'uống cà phê', sleep: 'ngủ gật', away: 'đi vắng'}

export type TableMember = {name: string; character: number; status: string; seat: number; you: boolean; who?: string}
export type SeatedFriend = TableMember & {display: number}

// Server xếp ghế cho cả bàn, kể cả chính mình. Nhưng trên màn hình của mình,
// mình luôn ngồi ở quầy cửa sổ → ghế của mình nhường cho người bạn đang chờ
// sớm nhất. Bạn đã có ghế thì giữ đúng vị trí (không nhảy chỗ khi có người vào/ra).
export function arrangeFriends(members: TableMember[]) {
  const friends = members.filter((m) => !m.you)
  const seated: SeatedFriend[] = friends.filter((f) => f.seat >= 0 && f.seat < SEATS).map((f) => ({...f, display: f.seat}))
  const taken = new Set(seated.map((f) => f.display))
  const waiting = friends.filter((f) => f.seat < 0 || f.seat >= SEATS)
  const rest: TableMember[] = []
  for (const f of waiting) {
    const free = [...Array(SEATS).keys()].find((s) => !taken.has(s))
    if (free === undefined) rest.push(f)
    else {
      taken.add(free)
      seated.push({...f, display: free})
    }
  }
  return {seated: seated.sort((a, b) => a.display - b.display), rest, total: friends.length}
}
