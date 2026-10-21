import {useState} from 'react'
import {Badge, Box, Button, Card, Flex, Grid, Stack, Switch, Tab, TabList, TabPanel, Text, TextArea, TextInput} from '@sanity/ui'
import {set, unset, useEditState, type ObjectInputProps} from 'sanity'

// Form riêng cho "Chill · Cài đặt" (thay form mặc định của Sanity), chia ba tab:
//
// - Tính năng: công tắc thành hàng gọn chia nhóm — biểu tượng, tên, 1 dòng ngắn + thời gian
//   có hiệu lực, chấm Bật / Tắt, công tắc. Bấm vào hàng để đọc mô tả đầy đủ. Tuỳ chọn đi kèm
//   (số người mỗi bàn) nằm dưới hàng, chỉ hiện khi đã bật.
// - Thử thách chung: công tắc + khối Mùa + bảng lựa chọn bỏ phiếu Việt / Anh.
// - Mẩu giấy hôm nay: mỗi loại chữ một thẻ, ô nhập bên trái, bản xem trước giống mẩu giấy
//   trên /chill bên phải. Trạng thái "Tự động theo ngày" / "Câu riêng" + nút về câu tự động.
//
// Nhãn tab mang trạng thái của tab đó. Trường nào khác bản đã Publish thì có chấm vàng
// "chưa Publish" (ở hàng và ở tab) — khách chỉ thấy bản đã Publish.
//
// Tên trường giữ nguyên như schema (chillSettings.ts) nên API /chill đọc như cũ.

type Value = {
  chatOpen?: boolean
  groupTableOpen?: boolean
  groupMaxMembers?: number
  diaryOpen?: boolean
  shelfOpen?: boolean
  playCountsOpen?: boolean
  catToyOpen?: boolean
  seatPickOpen?: boolean
  streetMotionOpen?: boolean
  questOpen?: boolean
  questSeason?: string
  questTitle?: string
  questTitleEn?: string
  questGoal?: number
  questVoteDays?: number
  questOpt1?: string
  questOpt1En?: string
  questOpt2?: string
  questOpt2En?: string
  questOpt3?: string
  questOpt3En?: string
  questOpt4?: string
  questOpt4En?: string
  diaryNoteVi?: string
  diaryNoteEn?: string
  diaryQuoteEn?: string
  diaryQuoteVi?: string
  diaryQuoteBy?: string
}

type FeatureKey = 'chatOpen' | 'groupTableOpen' | 'diaryOpen' | 'shelfOpen' | 'playCountsOpen' | 'questOpen' | 'catToyOpen' | 'seatPickOpen' | 'streetMotionOpen'

type Feature = {key: FeatureKey; icon: string; title: string; short: string; desc: string; delay: string}

const FEATURE_GROUPS: {title: string; items: Feature[]}[] = [
  {
    title: 'Trong quán',
    items: [
      {key: 'chatOpen', icon: '💬', title: 'Phòng chat', short: 'Khách nhắn tin với nhau', desc: 'Khách nhắn tin với nhau trong quán. Tắt khi bị spam: nút chat ẩn đi, tin cũ tự xoá sau 24 giờ.', delay: '30 giây'},
      {key: 'groupTableOpen', icon: '🪑', title: 'Bàn nhóm', short: 'Tạo bàn, mời bạn qua link', desc: 'Khách tạo bàn, mời bạn qua link và ngồi chung một bàn.', delay: '30 giây'},
      {key: 'diaryOpen', icon: '📓', title: 'Bảng nhật ký', short: '2 mẩu giấy mỗi ngày, treo 7 ngày', desc: 'Mỗi khách viết 2 mẩu giấy một ngày, cả quán đọc trong một tuần.', delay: '30 giây'},
      {key: 'seatPickOpen', icon: '👩', title: 'Chọn người ngồi', short: 'Anh / Chị ở màn chào', desc: 'Màn chào và Cài đặt › Cảnh có thêm lựa chọn Anh / Chị. Hiện mới phòng Cửa sổ quán có bản nữ, phòng khác vẫn là nam.', delay: '1 phút'},
      {key: 'streetMotionOpen', icon: '🛵', title: 'Phố chuyển động mượt', short: 'Xe nảy, nan bánh quay, người nhún bước', desc: 'Người, chó, xe ngoài phố chuyển động mượt hơn: xe nảy nhẹ theo nhịp riêng và qua mối nối mặt đường, ô tô chúi mũi khi phanh, nan xe đạp / xích lô quay, người nhún theo bước, dừng có hãm, đứng so le trên vỉa hè. Tắt là về như cũ. Áp dụng cả trang quay /chill/record.', delay: '1 phút'},
    ],
  },
  {
    title: 'Đồ chơi & sưu tầm',
    items: [
      {key: 'shelfOpen', icon: '🏺', title: 'Kệ sưu tầm', short: 'Xong phin, mèo mang ra một món', desc: 'Xong phin, mèo mang ra một món cho kệ. 20 món, chỉ lưu trên máy khách.', delay: '1 phút'},
      {key: 'catToyOpen', icon: '🪶', title: 'Trêu mèo', short: 'Cần câu lông vũ cạnh mèo', desc: 'Cần câu lông vũ dựng cạnh mèo. Khách cầm lên đung đưa, mèo rình, lắc mông, vồ, khều. Chơi chừng 7 lần vồ là mèo đi ngủ.', delay: '1 phút'},
      {key: 'playCountsOpen', icon: '🎧', title: 'Lượt nghe', short: 'Từ 50 lượt mới hiện số', desc: 'Đếm lượt nghe từng bài (nghe đủ 30 giây, 1 máy 1 lượt mỗi ngày). Bài từ 50 lượt mới hiện số trong danh sách.', delay: '5 phút'},
    ],
  },
]

const FEATURES = FEATURE_GROUPS.flatMap((g) => g.items)

const QUEST: Feature = {key: 'questOpen', icon: '☕', title: 'Cả quán cùng pha phin', short: 'Phin của mọi khách cộng vào một con số chung', desc: 'Phin của mọi khách cộng vào một con số chung. Đủ mục tiêu thì cả quán bỏ phiếu chọn thứ được mở khoá tiếp theo.', delay: '30 giây'}

const QUEST_OPTS = [1, 2, 3, 4] as const

const QUEST_FIELDS: (keyof Value)[] = ['questOpen', 'questSeason', 'questTitle', 'questTitleEn', 'questGoal', 'questVoteDays', ...QUEST_OPTS.flatMap((i) => [`questOpt${i}`, `questOpt${i}En`] as const)]
const DIARY_FIELDS: (keyof Value)[] = ['diaryNoteVi', 'diaryNoteEn', 'diaryQuoteEn', 'diaryQuoteVi', 'diaryQuoteBy']

const DEFAULT_MAX = 8

const TABS = [
  {id: 'features', title: 'Tính năng'},
  {id: 'quest', title: 'Thử thách chung'},
  {id: 'diary', title: 'Mẩu giấy hôm nay'},
] as const
type TabId = (typeof TABS)[number]['id']
const TAB_KEY = 'chillSettings.tab'

// Chat mặc định bật (API: open !== false), các tính năng khác mặc định tắt
const isOn = (v: Value, key: FeatureKey) => (key === 'chatOpen' ? v[key] !== false : v[key] === true)

// Giá trị như API /chill hiểu: công tắc theo isOn, chữ rỗng = chưa điền
const norm = (v: Value, field: keyof Value) => {
  if (field.endsWith('Open')) return isOn(v, field as FeatureKey)
  const x = v[field]
  return x === '' ? undefined : x
}

export function ChillSettingsInput(props: ObjectInputProps) {
  const value = (props.value ?? {}) as Value
  const readOnly = Boolean(props.readOnly)
  const put = (field: keyof Value, v: unknown) => props.onChange(v === '' || v === undefined ? unset([field]) : set(v, [field]))

  // So bản đang sửa với bản đã Publish: chỉ khi có bản nháp mới có thể lệch
  const {draft, published} = useEditState('chillSettings', 'chillSettings')
  const pub = (published ?? {}) as Value
  const pending = (field: keyof Value) => Boolean(draft) && norm(value, field) !== norm(pub, field)
  const anyPending = (fields: (keyof Value)[]) => fields.some(pending)

  // Nhớ tab đang mở trên máy này (Studio chỉ chạy phía trình duyệt)
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY)
      if (TABS.some((t) => t.id === saved)) return saved as TabId
    } catch {}
    return 'features'
  })
  const pick = (id: TabId) => {
    setTab(id)
    try {
      localStorage.setItem(TAB_KEY, id)
    } catch {}
  }

  const onCount = FEATURES.filter((f) => isOn(value, f.key)).length
  const questOn = isOn(value, 'questOpen')
  const diaryCustom = DIARY_FIELDS.some((f) => value[f])

  const tabStatus: Record<TabId, {text: string; tone: 'positive' | 'default' | 'caution'; pending: boolean}> = {
    features: {text: `${onCount} / ${FEATURES.length} đang bật`, tone: onCount ? 'positive' : 'default', pending: anyPending([...FEATURES.map((f) => f.key), 'groupMaxMembers'])},
    quest: {text: `${value.questTitle || 'Mùa 1'} · ${questOn ? 'bật' : 'tắt'}`, tone: questOn ? 'positive' : 'default', pending: anyPending(QUEST_FIELDS)},
    diary: {text: diaryCustom ? 'Câu riêng' : 'Tự động', tone: diaryCustom ? 'caution' : 'default', pending: anyPending(DIARY_FIELDS)},
  }

  return (
    <Stack gap={5} paddingBottom={6}>
      <Card borderBottom>
        <TabList gap={1}>
          {TABS.map((t) => (
            <Tab
              key={t.id}
              id={`chill-tab-${t.id}`}
              aria-controls={`chill-panel-${t.id}`}
              selected={tab === t.id}
              onClick={() => pick(t.id)}
              padding={3}
              label={
                <Flex align="center" gap={2}>
                  <Text size={1} weight="medium">
                    {t.title}
                  </Text>
                  <Badge tone={tabStatus[t.id].tone} fontSize={0}>
                    {tabStatus[t.id].text}
                  </Badge>
                  {tabStatus[t.id].pending && <Dot title="Có thay đổi chưa Publish" />}
                </Flex>
              }
            />
          ))}
        </TabList>
      </Card>

      {/* ---------- Tính năng ---------- */}
      <TabPanel id="chill-panel-features" aria-labelledby="chill-tab-features" hidden={tab !== 'features'}>
        <Stack gap={5}>
          <Text size={1} muted style={{lineHeight: 1.5, maxWidth: 560}}>
            Bật / tắt từng phần của /chill. Đổi xong bấm Publish, khách thấy sau thời gian ghi ở mỗi dòng. Bấm vào dòng để đọc mô tả đầy đủ.
          </Text>
          {FEATURE_GROUPS.map((g) => (
            <Stack key={g.title} gap={3}>
              <GroupLabel>{g.title}</GroupLabel>
              <Card radius={3} border overflow="hidden">
                {g.items.map((f, i) => (
                  <FeatureRow key={f.key} f={f} first={i === 0} on={isOn(value, f.key)} pending={pending(f.key)} readOnly={readOnly} onToggle={() => put(f.key, !isOn(value, f.key))}>
                    {f.key === 'groupTableOpen' && (
                      <Flex align="center" gap={3}>
                        <Stack gap={2} flex={1}>
                          <Flex align="center" gap={2}>
                            <Text size={1} weight="medium">
                              Số người tối đa mỗi bàn
                            </Text>
                            {pending('groupMaxMembers') && <PendingBadge />}
                          </Flex>
                          <Text size={0} muted>
                            Bàn có 4 ghế, người thứ 5 trở đi hiện nhãn “+n”. Từ 2 đến 12.
                          </Text>
                        </Stack>
                        <Box style={{width: 72}}>
                          <NumberInput value={value.groupMaxMembers ?? DEFAULT_MAX} min={2} max={12} readOnly={readOnly} onChange={(n) => put('groupMaxMembers', n)} />
                        </Box>
                      </Flex>
                    )}
                  </FeatureRow>
                ))}
              </Card>
            </Stack>
          ))}
        </Stack>
      </TabPanel>

      {/* ---------- Thử thách chung ---------- */}
      <TabPanel id="chill-panel-quest" aria-labelledby="chill-tab-quest" hidden={tab !== 'quest'}>
        <Stack gap={5}>
          <Card radius={3} border overflow="hidden">
            <FeatureRow f={QUEST} first on={questOn} pending={pending('questOpen')} readOnly={readOnly} onToggle={() => put('questOpen', !questOn)} />
          </Card>
          {!questOn && (
            <Text size={1} muted style={{lineHeight: 1.5}}>
              Đang tắt: có thể chuẩn bị mùa và lựa chọn trước, khách chỉ thấy khi bật và Publish.
            </Text>
          )}

          <Stack gap={3}>
            <GroupLabel>Mùa</GroupLabel>
            <Card radius={3} border padding={4}>
              <Stack gap={4}>
                <Grid gridTemplateColumns={[1, 3]} gap={3}>
                  <LabeledField label="Mã mùa" pending={pending('questSeason')}>
                    <TextInput value={value.questSeason ?? 'mua-1'} readOnly={readOnly} onChange={(e) => put('questSeason', e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24))} />
                  </LabeledField>
                  <LabeledField label="Mục tiêu (phin)" pending={pending('questGoal')}>
                    <NumberInput value={value.questGoal ?? 100} min={10} max={100000} readOnly={readOnly} onChange={(n) => put('questGoal', n)} />
                  </LabeledField>
                  <LabeledField label="Ngày bỏ phiếu" pending={pending('questVoteDays')}>
                    <NumberInput value={value.questVoteDays ?? 3} min={1} max={14} readOnly={readOnly} onChange={(n) => put('questVoteDays', n)} />
                  </LabeledField>
                </Grid>
                <Grid gridTemplateColumns={[1, 2]} gap={3}>
                  <LabeledField label="Tên mùa" pending={pending('questTitle')}>
                    <TextInput value={value.questTitle ?? ''} placeholder="Mùa 1" readOnly={readOnly} onChange={(e) => put('questTitle', e.currentTarget.value)} />
                  </LabeledField>
                  <LabeledField label="Tên mùa (tiếng Anh)" pending={pending('questTitleEn')}>
                    <TextInput value={value.questTitleEn ?? ''} placeholder="Season 1" readOnly={readOnly} onChange={(e) => put('questTitleEn', e.currentTarget.value)} />
                  </LabeledField>
                </Grid>
                <Card radius={2} padding={3} tone="caution">
                  <Text size={1} style={{lineHeight: 1.5}}>
                    Đổi mã mùa (vd. mua-2) là mở mùa mới: bộ đếm và phiếu bắt đầu lại từ 0.
                  </Text>
                </Card>
              </Stack>
            </Card>
          </Stack>

          <Stack gap={3}>
            <GroupLabel>Lựa chọn bỏ phiếu · cần ít nhất 2</GroupLabel>
            <Card radius={3} border padding={4}>
              <Stack gap={3}>
                <Grid gap={3} style={{gridTemplateColumns: '24px 1fr 1fr'}}>
                  <span />
                  <ColumnLabel>Tiếng Việt</ColumnLabel>
                  <ColumnLabel>Tiếng Anh</ColumnLabel>
                </Grid>
                {QUEST_OPTS.map((i) => (
                  <Grid key={i} gap={3} style={{gridTemplateColumns: '24px 1fr 1fr', alignItems: 'center'}}>
                    <Flex direction="column" align="center" gap={1}>
                      <Text size={1} muted align="center" style={{fontVariantNumeric: 'tabular-nums'}}>
                        {i}
                      </Text>
                      {(pending(`questOpt${i}`) || pending(`questOpt${i}En`)) && <Dot title="Chưa Publish" />}
                    </Flex>
                    <TextInput value={value[`questOpt${i}`] ?? ''} placeholder={i <= 2 ? 'Vd. Mèo học trò' : 'Để trống nếu không cần'} readOnly={readOnly} onChange={(e) => put(`questOpt${i}`, e.currentTarget.value)} />
                    <TextInput value={value[`questOpt${i}En`] ?? ''} placeholder="Trống thì dùng bản tiếng Việt" readOnly={readOnly} onChange={(e) => put(`questOpt${i}En`, e.currentTarget.value)} />
                  </Grid>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Stack>
      </TabPanel>

      {/* ---------- Mẩu giấy hôm nay ---------- */}
      <TabPanel id="chill-panel-diary" aria-labelledby="chill-tab-diary" hidden={tab !== 'diary'}>
        <Stack gap={4}>
          <Text size={1} muted style={{lineHeight: 1.5, maxWidth: 560}}>
            Chữ của quán trong bảng nhật ký. Để trống thì quán tự chọn câu theo ngày; điền vào để thay bằng câu riêng cho dịp đặc biệt.
          </Text>

          <ContentCard
            title="Mẩu giấy của quán"
            custom={Boolean(value.diaryNoteVi || value.diaryNoteEn)}
            pending={anyPending(['diaryNoteVi', 'diaryNoteEn'])}
            readOnly={readOnly}
            onReset={() => props.onChange([unset(['diaryNoteVi']), unset(['diaryNoteEn'])])}
            fields={
              <>
                <Field label="Tiếng Việt" max={140} value={value.diaryNoteVi} readOnly={readOnly} onChange={(v) => put('diaryNoteVi', v)} placeholder="Vd. Tết rồi, quán mở cửa muộn một chút nha" />
                <Field label="Tiếng Anh" max={140} value={value.diaryNoteEn} readOnly={readOnly} onChange={(v) => put('diaryNoteEn', v)} placeholder="Trống thì khách xem tiếng Anh thấy câu tiếng Việt" />
              </>
            }
            preview={
              <Paper>
                <Text size={0} style={{letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9a7b5c'}}>
                  Mẩu giấy của quán
                </Text>
                <Text size={2} style={{color: '#2a1a10', lineHeight: 1.5}}>
                  {value.diaryNoteVi || <Auto />}
                </Text>
                {value.diaryNoteEn && (
                  <Text size={1} style={{color: '#7a6250', lineHeight: 1.5}}>
                    {value.diaryNoteEn}
                  </Text>
                )}
              </Paper>
            }
          />

          <ContentCard
            title="Câu danh ngôn"
            custom={Boolean(value.diaryQuoteEn || value.diaryQuoteVi || value.diaryQuoteBy)}
            pending={anyPending(['diaryQuoteEn', 'diaryQuoteVi', 'diaryQuoteBy'])}
            readOnly={readOnly}
            onReset={() => props.onChange([unset(['diaryQuoteEn']), unset(['diaryQuoteVi']), unset(['diaryQuoteBy'])])}
            fields={
              <>
                <Field label="Tiếng Anh · chữ lớn" max={200} value={value.diaryQuoteEn} readOnly={readOnly} onChange={(v) => put('diaryQuoteEn', v)} placeholder="Vd. Slow is smooth, smooth is fast." />
                <Field label="Tiếng Việt · chữ nhỏ" max={200} value={value.diaryQuoteVi} readOnly={readOnly} onChange={(v) => put('diaryQuoteVi', v)} placeholder="Trống thì chỉ hiện câu tiếng Anh" />
                <Field label="Tác giả" max={60} rows={1} value={value.diaryQuoteBy} readOnly={readOnly} onChange={(v) => put('diaryQuoteBy', v)} placeholder="Vd. Seneca · Confucius · Khổng Tử" />
              </>
            }
            preview={
              <Paper>
                <Text size={3} style={{color: '#2a1a10', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.35}}>
                  {value.diaryQuoteEn ? `“${value.diaryQuoteEn}”` : <Auto />}
                </Text>
                {value.diaryQuoteVi && (
                  <Text size={1} style={{color: '#7a6250', lineHeight: 1.5}}>
                    {value.diaryQuoteVi}
                  </Text>
                )}
                {value.diaryQuoteBy && (
                  <Text size={1} style={{color: '#9a7b5c'}}>
                    — {value.diaryQuoteBy}
                  </Text>
                )}
              </Paper>
            }
          />
        </Stack>
      </TabPanel>
    </Stack>
  )
}

// Một hàng công tắc: bấm vào hàng (ngoài công tắc) để mở / đóng mô tả đầy đủ
function FeatureRow({
  f,
  first,
  on,
  pending,
  readOnly,
  onToggle,
  children,
}: {
  f: Feature
  first: boolean
  on: boolean
  pending: boolean
  readOnly: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card borderTop={!first} padding={3} paddingX={4}>
      <Stack gap={3}>
        <Flex align="center" gap={3}>
          <Flex
            align="center"
            gap={3}
            flex={1}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setOpen((o) => !o)
              }
            }}
            style={{cursor: 'pointer', minWidth: 0}}
          >
            <Box style={{width: 24, textAlign: 'center', flex: 'none'}}>
              <Text size={2}>{f.icon}</Text>
            </Box>
            <Stack gap={2} flex={1} style={{minWidth: 0}}>
              <Text size={1} weight="semibold">
                {f.title}
              </Text>
              <Text size={1} muted textOverflow="ellipsis">
                {f.short} · {f.delay}
              </Text>
            </Stack>
          </Flex>
          {pending && <PendingBadge />}
          <Status on={on} />
          <Switch checked={on} disabled={readOnly} aria-label={`${on ? 'Tắt' : 'Bật'} ${f.title}`} onChange={onToggle} />
        </Flex>
        {open && (
          <Box paddingLeft={6}>
            <Text size={1} muted style={{lineHeight: 1.5}}>
              {f.desc}
            </Text>
          </Box>
        )}
        {on && children && (
          <Card marginLeft={6} radius={2} padding={3} border tone="transparent">
            {children}
          </Card>
        )}
      </Stack>
    </Card>
  )
}

// Chấm + chữ Bật / Tắt: màu cộng hình, đọc được cả khi không phân biệt màu
function Status({on}: {on: boolean}) {
  return (
    <Flex align="center" gap={2} style={{width: 44, flex: 'none'}}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          boxSizing: 'border-box',
          border: '1.5px solid',
          borderColor: on ? 'var(--card-badge-positive-dot-color, #3dbb7a)' : 'var(--card-muted-fg-color)',
          background: on ? 'var(--card-badge-positive-dot-color, #3dbb7a)' : 'transparent',
        }}
      />
      <Text size={1} weight="medium" style={{color: on ? 'var(--card-badge-positive-fg-color, #3dbb7a)' : undefined}} muted={!on}>
        {on ? 'Bật' : 'Tắt'}
      </Text>
    </Flex>
  )
}

function PendingBadge() {
  return (
    <Badge tone="caution" fontSize={0}>
      chưa Publish
    </Badge>
  )
}

function Dot({title}: {title: string}) {
  return <span title={title} aria-label={title} style={{width: 7, height: 7, borderRadius: '50%', background: 'var(--card-badge-caution-dot-color, #e3a63a)', flex: 'none', display: 'inline-block'}} />
}

function GroupLabel({children}: {children: React.ReactNode}) {
  return (
    <Text size={0} muted weight="semibold" style={{letterSpacing: '0.12em', textTransform: 'uppercase'}}>
      {children}
    </Text>
  )
}

function ColumnLabel({children}: {children: React.ReactNode}) {
  return (
    <Text size={0} muted weight="medium" style={{letterSpacing: '0.08em', textTransform: 'uppercase'}}>
      {children}
    </Text>
  )
}

function LabeledField({label, pending, children}: {label: string; pending: boolean; children: React.ReactNode}) {
  return (
    <Stack gap={2}>
      <Flex align="center" gap={2}>
        <Text size={1} weight="medium">
          {label}
        </Text>
        {pending && <Dot title="Chưa Publish" />}
      </Flex>
      {children}
    </Stack>
  )
}

// Ô số: giữ trong khoảng min–max như validation của schema
function NumberInput({value, min, max, readOnly, onChange}: {value: number; min: number; max: number; readOnly: boolean; onChange: (n: number) => void}) {
  return (
    <TextInput
      type="number"
      min={min}
      max={max}
      readOnly={readOnly}
      value={String(value)}
      onChange={(e) => {
        const n = Math.round(Number(e.currentTarget.value))
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
      }}
    />
  )
}

function ContentCard({
  title,
  custom,
  pending,
  readOnly,
  onReset,
  fields,
  preview,
}: {
  title: string
  custom: boolean
  pending: boolean
  readOnly: boolean
  onReset: () => void
  fields: React.ReactNode
  preview: React.ReactNode
}) {
  return (
    <Card radius={3} border padding={4}>
      <Stack gap={4}>
        <Flex align="center" gap={2} wrap="wrap">
          <Text size={2} weight="semibold">
            {title}
          </Text>
          <Badge tone={custom ? 'caution' : 'default'} fontSize={0}>
            {custom ? 'Câu riêng · nhớ xoá khi hết dịp' : 'Tự động theo ngày'}
          </Badge>
          {pending && <PendingBadge />}
          <Box flex={1} />
          {custom && <Button mode="ghost" fontSize={1} padding={2} text="Về câu tự động" disabled={readOnly} onClick={onReset} />}
        </Flex>
        <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
          <Stack gap={4}>{fields}</Stack>
          <Stack gap={2}>
            <Text size={0} muted weight="medium" style={{letterSpacing: '0.12em', textTransform: 'uppercase'}}>
              Xem trước
            </Text>
            {preview}
          </Stack>
        </Grid>
      </Stack>
    </Card>
  )
}

function Field({
  label,
  max,
  value,
  onChange,
  placeholder,
  readOnly,
  rows = 2,
}: {
  label: string
  max: number
  value: string | undefined
  onChange: (v: string) => void
  placeholder: string
  readOnly: boolean
  rows?: number
}) {
  const length = value?.length ?? 0
  return (
    <Stack gap={2}>
      <Flex align="center" justify="space-between">
        <Text size={1} weight="medium">
          {label}
        </Text>
        <Text size={0} muted style={{color: length > max ? 'var(--card-badge-critical-fg-color, #e5484d)' : undefined}}>
          {length} / {max}
        </Text>
      </Flex>
      {rows === 1 ? (
        <TextInput value={value ?? ''} placeholder={placeholder} readOnly={readOnly} onChange={(e) => onChange(e.currentTarget.value)} />
      ) : (
        <TextArea rows={rows} value={value ?? ''} placeholder={placeholder} readOnly={readOnly} onChange={(e) => onChange(e.currentTarget.value)} style={{resize: 'vertical'}} />
      )}
    </Stack>
  )
}

// Giấy kem như mẩu giấy trên /chill
function Paper({children}: {children: React.ReactNode}) {
  return (
    <div
      style={{
        background: '#fbf1d2',
        borderRadius: 4,
        padding: '18px 18px 16px',
        boxShadow: '0 10px 24px -12px rgba(0,0,0,0.6)',
        transform: 'rotate(-0.6deg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 120,
      }}
    >
      {children}
    </div>
  )
}

function Auto() {
  return <span style={{color: '#9a7b5c', fontStyle: 'italic'}}>Câu tự động của hôm nay</span>
}
