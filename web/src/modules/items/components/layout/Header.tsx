interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
      <h1 className="text-lg font-medium text-text">{title}</h1>
    </header>
  )
}
