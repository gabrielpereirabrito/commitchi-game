interface AttributeBarProps {
  label: string
  value: number
  colorClassName: string
}

export function AttributeBar({ label, value, colorClassName }: AttributeBarProps): React.JSX.Element {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-white/70">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClassName}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}
