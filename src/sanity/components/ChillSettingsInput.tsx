import {Badge, Box, Button, Card, Flex, Grid, Heading, Stack, Switch, Text, TextArea, TextInput} from '@sanity/ui'
import {set, unset, type ObjectInputProps} from 'sanity'

// Form riêng cho "Chill · Cài đặt" (thay form mặc định của Sanity):
//
// - Tính năng: mỗi tính năng một thẻ — biểu tượng, tên, trạng thái Đang bật / Đang tắt,
//   1 dòng giải thích, công tắc bên phải. Tuỳ chọn đi kèm (số người mỗi bàn) nằm trong thẻ,
//   chỉ hiện khi đã bật. Đầu mục đếm số tính năng đang bật.
// - Nội dung hôm nay: mỗi loại chữ một thẻ, ô nhập bên trái, bản xem trước giống mẩu giấy
//   trên /chill bên phải. Trạng thái "Tự động theo ngày" / "Câu riêng" + nút về câu tự động.
//
// Tên trường giữ nguyên như schema (chillSettings.ts) nên API /chill đọc như cũ.

type Value = {
  chatOpen?: boolean
  groupTableOpen?: boolean
  groupMaxMembers?: number
  diaryOpen?: boolean
  shelfOpen?: boolean
  playCountsOpen?: boolean
  diaryNoteVi?: string
  diaryNoteEn?: string
  diaryQuoteEn?: string
  diaryQuoteVi?: string
  diaryQuoteBy?: string
}

type FeatureKey = 'chatOpen' | 'groupTableOpen' | 'diaryOpen' | 'shelfOpen' | 'playCountsOpen'

const FEATURES: {key: FeatureKey; icon: string; title: string; desc: string; beta?: boolean; delay: string}[] = [
  {key: 'chatOpen', icon: '💬', title: 'Phòng chat', desc: 'Khách nhắn tin với nhau trong quán. Tắt khi bị spam: nút chat ẩn đi, tin cũ tự xoá sau 24 giờ.', delay: '30 giây'},
  {key: 'groupTableOpen', icon: '🪑', title: 'Bàn nhóm', desc: 'Khách tạo bàn, mời bạn qua link và ngồi chung một bàn.', beta: true, delay: '30 giây'},
  {key: 'diaryOpen', icon: '📓', title: 'Bảng nhật ký', desc: 'Mỗi khách viết 2 mẩu giấy một ngày, cả quán đọc trong một tuần.', beta: true, delay: '30 giây'},
  {key: 'shelfOpen', icon: '🏺', title: 'Kệ sưu tầm', desc: 'Xong phin, mèo mang ra một món cho kệ. 20 món, chỉ lưu trên máy khách.', beta: true, delay: '1 phút'},
  {key: 'playCountsOpen', icon: '🎧', title: 'Lượt nghe', desc: 'Đếm lượt nghe từng bài (nghe đủ 30 giây, 1 máy 1 lượt mỗi ngày). Bài từ 50 lượt mới hiện số trong danh sách.', beta: true, delay: '5 phút'},
]

const DEFAULT_MAX = 8

// Chat mặc định bật (API: open !== false), các tính năng thử nghiệm mặc định tắt
const isOn = (v: Value, key: FeatureKey) => (key === 'chatOpen' ? v[key] !== false : v[key] === true)

export function ChillSettingsInput(props: ObjectInputProps) {
  const value = (props.value ?? {}) as Value
  const readOnly = Boolean(props.readOnly)
  const put = (field: keyof Value, v: unknown) => props.onChange(v === '' || v === undefined ? unset([field]) : set(v, [field]))
  const onCount = FEATURES.filter((f) => isOn(value, f.key)).length

  return (
    <Stack gap={6} paddingBottom={6}>
      {/* ---------- Tính năng ---------- */}
      <Stack gap={4}>
        <SectionHeader
          title="Tính năng"
          sub="Bật / tắt từng phần của /chill. Đổi xong bấm Publish, khách thấy sau 30 giây – 1 phút."
          aside={<Badge tone={onCount ? 'positive' : 'default'} fontSize={1} padding={2}>{`${onCount} / ${FEATURES.length} đang bật`}</Badge>}
        />
        <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
          {FEATURES.map((f) => {
            const on = isOn(value, f.key)
            return (
              <Card key={f.key} radius={3} border padding={4} tone={on ? 'positive' : 'default'}>
                <Stack gap={4}>
                  <Flex align="flex-start" gap={3}>
                    <Card radius={2} padding={2} tone="transparent" border style={{lineHeight: 1}}>
                      <Text size={3}>{f.icon}</Text>
                    </Card>
                    <Stack gap={2} flex={1}>
                      <Flex align="center" gap={2} wrap="wrap">
                        <Text size={2} weight="semibold">
                          {f.title}
                        </Text>
                        {f.beta && (
                          <Badge tone="caution" fontSize={0}>
                            Thử nghiệm
                          </Badge>
                        )}
                      </Flex>
                      <Text size={1} muted>
                        {on ? 'Đang bật' : 'Đang tắt'} · có hiệu lực sau {f.delay}
                      </Text>
                    </Stack>
                    <Switch
                      checked={on}
                      disabled={readOnly}
                      aria-label={`${on ? 'Tắt' : 'Bật'} ${f.title}`}
                      onChange={() => put(f.key, !on)}
                    />
                  </Flex>
                  <Text size={1} muted style={{lineHeight: 1.5}}>
                    {f.desc}
                  </Text>
                  {f.key === 'groupTableOpen' && on && (
                    <Card radius={2} padding={3} border tone="transparent">
                      <Flex align="center" gap={3}>
                        <Stack gap={2} flex={1}>
                          <Text size={1} weight="medium">
                            Số người tối đa mỗi bàn
                          </Text>
                          <Text size={0} muted>
                            Bàn có 4 ghế, người thứ 5 trở đi hiện nhãn “+n”. Từ 2 đến 12.
                          </Text>
                        </Stack>
                        <Box style={{width: 72}}>
                          <TextInput
                            type="number"
                            min={2}
                            max={12}
                            readOnly={readOnly}
                            value={String(value.groupMaxMembers ?? DEFAULT_MAX)}
                            onChange={(e) => {
                              const n = Math.round(Number(e.currentTarget.value))
                              if (Number.isFinite(n)) put('groupMaxMembers', Math.min(12, Math.max(2, n)))
                            }}
                          />
                        </Box>
                      </Flex>
                    </Card>
                  )}
                </Stack>
              </Card>
            )
          })}
        </Grid>
      </Stack>

      {/* ---------- Nội dung hôm nay ---------- */}
      <Stack gap={4}>
        <SectionHeader
          title="Nội dung hôm nay"
          sub="Chữ của quán trong bảng nhật ký. Để trống thì quán tự chọn câu theo ngày; điền vào để thay bằng câu riêng cho dịp đặc biệt."
        />

        <ContentCard
          title="Mẩu giấy của quán"
          custom={Boolean(value.diaryNoteVi || value.diaryNoteEn)}
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
    </Stack>
  )
}

function SectionHeader({title, sub, aside}: {title: string; sub: string; aside?: React.ReactNode}) {
  return (
    <Flex align="flex-end" gap={3} wrap="wrap">
      <Stack gap={3} flex={1} style={{minWidth: 240}}>
        <Heading size={2}>{title}</Heading>
        <Text size={1} muted style={{lineHeight: 1.5, maxWidth: 560}}>
          {sub}
        </Text>
      </Stack>
      {aside}
    </Flex>
  )
}

function ContentCard({
  title,
  custom,
  readOnly,
  onReset,
  fields,
  preview,
}: {
  title: string
  custom: boolean
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
