export function TitleBar(): React.JSX.Element {
  return (
    <div className="drag-region flex h-6 w-full items-center justify-between px-2 text-white/60">
      <span className="text-[10px] font-medium tracking-wide">commitchi</span>
      <div className="no-drag flex gap-1">
        <button
          onClick={() => window.api.minimizeWindow()}
          title="Minimizar"
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] leading-none hover:bg-white/10"
        >
          –
        </button>
        <button
          onClick={() => window.api.hideWindow()}
          title="Esconder (continua rodando na bandeja do sistema)"
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] leading-none hover:bg-white/10"
        >
          ×
        </button>
      </div>
    </div>
  )
}
