export type ImpactMetric = {_key: string; value: string; label: string}

// Stat block cho các con số Impact của case study: số to màu brand, mô tả
// nhỏ bên dưới, ngăn cách bằng đường kẻ dọc — dễ quét hơn dạng 1 dòng chữ.
// Dùng chung cho card (/work, trang chủ) và trang chi tiết case study.
export function ImpactStats({
  metrics,
  size = 'md',
  className = '',
}: {
  metrics: ImpactMetric[]
  size?: 'md' | 'lg'
  className?: string
}) {
  if (metrics.length === 0) return null

  // 2 chỉ số → luôn 2 cột (vừa cả mobile); 3 chỉ số → xuống hàng trên mobile
  const cols = metrics.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'

  return (
    <ul className={`grid gap-y-5 ${cols} ${className}`}>
      {metrics.map((metric) => (
        <li
          key={metric._key}
          className="border-l border-neutral-200 pl-4 first:border-l-0 first:pl-0 sm:[&:nth-child(3)]:border-l sm:[&:nth-child(3)]:pl-4 [&:nth-child(3)]:border-l-0 [&:nth-child(3)]:pl-0"
        >
          <p
            className={`font-semibold leading-none tracking-tight text-[#002fff] tabular-nums ${
              size === 'lg' ? 'text-4xl' : 'text-[28px] sm:text-[32px]'
            }`}
          >
            {metric.value}
          </p>
          <p className="mt-2 text-sm leading-snug text-neutral-500">{metric.label}</p>
        </li>
      ))}
    </ul>
  )
}
