interface Props {
  type: string
  width: number
  height: number
  selected?: boolean
}

export function EquipmentShape({ type, width, height, selected }: Props) {
  const w = width
  const h = height
  const stroke = selected ? 'var(--accent)' : 'var(--border-strong)'
  const fill = 'var(--bg-elevated)'

  switch (type) {
    case 'bioreactor':
      return (
        <g className="eq-body">
          <ellipse cx={w / 2} cy={h * 0.15} rx={w * 0.35} ry={h * 0.08} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <rect x={w * 0.15} y={h * 0.15} width={w * 0.7} height={h * 0.65} rx={4} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.35} ry={h * 0.08} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <line x1={w * 0.5} y1={h * 0.25} x2={w * 0.5} y2={h * 0.72} stroke={stroke} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
          <circle cx={w * 0.5} cy={h * 0.48} r={w * 0.12} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} opacity={0.6} />
        </g>
      )
    case 'tank':
      return (
        <g className="eq-body">
          <rect x={w * 0.2} y={h * 0.1} width={w * 0.6} height={h * 0.75} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <rect x={w * 0.35} y={h * 0.02} width={w * 0.3} height={h * 0.1} rx={2} fill={fill} stroke={stroke} strokeWidth={1} />
          <line x1={w * 0.25} y1={h * 0.5} x2={w * 0.75} y2={h * 0.5} stroke={stroke} strokeWidth={0.5} opacity={0.3} />
        </g>
      )
    case 'mixer':
      return (
        <g className="eq-body">
          <rect x={w * 0.15} y={h * 0.2} width={w * 0.7} height={h * 0.6} rx={4} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <line x1={w * 0.5} y1={h * 0.05} x2={w * 0.5} y2={h * 0.25} stroke={stroke} strokeWidth={1.5} />
          <polygon points={`${w * 0.5},${h * 0.45} ${w * 0.35},${h * 0.65} ${w * 0.65},${h * 0.65}`} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />
        </g>
      )
    case 'filter':
      return (
        <g className="eq-body">
          <rect x={w * 0.2} y={h * 0.25} width={w * 0.6} height={h * 0.5} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />
          {[0.35, 0.5, 0.65].map((y, i) => (
            <line key={i} x1={w * 0.25} y1={h * y} x2={w * 0.75} y2={h * y} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
          ))}
        </g>
      )
    case 'centrifuge':
      return (
        <g className="eq-body">
          <circle cx={w / 2} cy={h / 2} r={w * 0.32} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <circle cx={w / 2} cy={h / 2} r={w * 0.15} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />
          <line x1={w / 2} y1={h * 0.18} x2={w / 2} y2={h * 0.35} stroke={stroke} strokeWidth={1} />
        </g>
      )
    case 'column':
      return (
        <g className="eq-body">
          <rect x={w * 0.35} y={h * 0.08} width={w * 0.3} height={h * 0.84} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />
          {[0.3, 0.5, 0.7].map((y, i) => (
            <rect key={i} x={w * 0.38} y={h * y} width={w * 0.24} height={h * 0.06} rx={1} fill="var(--accent-soft)" opacity={0.5} />
          ))}
        </g>
      )
    case 'pump':
      return (
        <g className="eq-body">
          <circle cx={w / 2} cy={h / 2} r={w * 0.28} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <polygon points={`${w * 0.65},${h * 0.35} ${w * 0.65},${h * 0.65} ${w * 0.85},${h * 0.5}`} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />
        </g>
      )
    case 'heat_exchanger':
      return (
        <g className="eq-body">
          <rect x={w * 0.15} y={h * 0.25} width={w * 0.7} height={h * 0.5} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />
          {[0.35, 0.5, 0.65].map((x, i) => (
            <line key={i} x1={w * x} y1={h * 0.28} x2={w * x} y2={h * 0.72} stroke="var(--stream)" strokeWidth={1} opacity={0.5} />
          ))}
        </g>
      )
    default:
      return (
        <g className="eq-body">
          <rect x={w * 0.1} y={h * 0.15} width={w * 0.8} height={h * 0.7} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
        </g>
      )
  }
}
