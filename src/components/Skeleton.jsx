export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 animate-pulse">
      <div className="h-48 bg-slate-200 rounded-2xl mb-4" />
      <div className="h-4 bg-slate-200 rounded-full mb-2 w-3/4" />
      <div className="h-3 bg-slate-200 rounded-full w-1/2" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 bg-slate-200 rounded-full w-32" /></td>
      <td className="p-4"><div className="h-4 bg-slate-200 rounded-full w-24" /></td>
      <td className="p-4"><div className="h-4 bg-slate-200 rounded-full w-16" /></td>
      <td className="p-4"><div className="h-8 bg-slate-200 rounded-xl w-20" /></td>
    </tr>
  )
}

export function SkeletonText({ className = '' }) {
  return <div className={`h-4 bg-slate-200 rounded-full animate-pulse ${className}`} />
}
