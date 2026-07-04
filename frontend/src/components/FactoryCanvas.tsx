import { useMemo } from 'react'
import type { Equipment, FactoryModel, ProcessArea } from '../types/factory'
import { findEquipmentPos } from '../hooks/navigation'
import { EquipmentShape } from './EquipmentShape'

interface Props {
  model: FactoryModel
  selectedEquipment?: string
  selectedStream?: string
  highlightArea?: string
  onEquipmentClick: (tag: string) => void
  onStreamClick: (tag: string) => void
  onAreaClick: (areaId: string) => void
}

function streamPath(
  model: FactoryModel,
  fromTag: string,
  toTag: string,
): string {
  const from = findEquipmentPos(model, fromTag)
  const to = findEquipmentPos(model, toTag)
  const midX = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
}

function StreamFlow({ path }: { path: string }) {
  return (
    <circle r={3} className="stream-flow">
      <animateMotion dur="3s" repeatCount="indefinite" path={path} />
    </circle>
  )
}

function EquipmentNode({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment
  selected: boolean
  onClick: () => void
}) {
  const hasLive = eq.properties.temperature_C !== undefined

  return (
    <g
      className={`equipment-node${selected ? ' equipment-node--selected' : ''}`}
      transform={`translate(${eq.x}, ${eq.y})`}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <EquipmentShape type={eq.equipment_type} width={eq.width} height={eq.height} selected={selected} />
      {hasLive && (
        <circle
          className="eq-indicator"
          cx={eq.width - 8}
          cy={8}
          r={3}
        />
      )}
      <text className="eq-tag" x={eq.width / 2} y={eq.height + 14} textAnchor="middle">
        {eq.tag}
      </text>
      {eq.tag === 'BR-201' && (
        <>
          <text className="eq-name" x={eq.width / 2} y={eq.height + 24} textAnchor="middle">
            {String(eq.properties.working_volume_L?.toLocaleString())} L
          </text>
          <text className="eq-name" x={eq.width / 2} y={eq.height / 2 + 4} textAnchor="middle" fill="var(--accent)" fontSize={8}>
            {eq.properties.temperature_C}°C · pH {eq.properties.pH}
          </text>
        </>
      )}
    </g>
  )
}

function AreaGroup({
  area,
  highlighted,
  onClick,
}: {
  area: ProcessArea
  highlighted: boolean
  onClick: () => void
}) {
  return (
    <g className="area-group" onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        className="area-bg"
        x={area.x}
        y={area.y}
        width={area.width}
        height={area.height}
        opacity={highlighted ? 1 : 0.6}
      />
      <text className="area-label" x={area.x + 12} y={area.y + 20}>
        {area.name.toUpperCase()}
      </text>
    </g>
  )
}

export function FactoryCanvas({
  model,
  selectedEquipment,
  selectedStream,
  highlightArea,
  onEquipmentClick,
  onStreamClick,
  onAreaClick,
}: Props) {
  const streamPaths = useMemo(
    () => model.streams.map((s) => ({
      ...s,
      d: streamPath(model, s.from_tag, s.to_tag),
    })),
    [model],
  )

  const viewW = 1720
  const viewH = 480

  return (
    <svg
      className="factory-svg"
      viewBox={`0 0 ${viewW} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--stream)" opacity={0.6} />
        </marker>
      </defs>

      {model.areas.map((area) => (
        <AreaGroup
          key={area.id}
          area={area}
          highlighted={!highlightArea || highlightArea === area.id}
          onClick={() => onAreaClick(area.id)}
        />
      ))}

      {streamPaths.map((s) => (
        <g key={s.tag}>
          <path
            d={s.d}
            className={`stream-line${selectedStream === s.tag ? ' stream-line--selected' : ''}`}
            markerEnd="url(#arrow)"
            onClick={(e) => { e.stopPropagation(); onStreamClick(s.tag) }}
          />
          <StreamFlow path={s.d} />
          <text
            className="stream-label"
            onClick={(e) => { e.stopPropagation(); onStreamClick(s.tag) }}
          >
            <textPath href={`#path-${s.tag}`} startOffset="50%" textAnchor="middle">
              {s.tag}
            </textPath>
          </text>
          <path id={`path-${s.tag}`} d={s.d} fill="none" />
        </g>
      ))}

      {model.equipment.map((eq) => (
        <EquipmentNode
          key={eq.tag}
          eq={eq}
          selected={selectedEquipment === eq.tag}
          onClick={() => onEquipmentClick(eq.tag)}
        />
      ))}

      {/* Raw materials inlet */}
      <g transform="translate(60, 310)">
        <rect x={0} y={0} width={80} height={40} rx={8} fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeWidth={1} />
        <text x={40} y={24} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontFamily="var(--font)">
          RAW
        </text>
      </g>
    </svg>
  )
}
