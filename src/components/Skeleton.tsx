/** Shimmering placeholder rows shown while a list loads. */
export function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  )
}
