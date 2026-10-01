type HeaderProps = {
  title: string;
  subtitle: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-0 font-sans">
      <h1 className="font-serif text-[20px] font-bold leading-tight text-[#120D06]">{title}</h1>
      <p className="mt-[2px] text-[13px] text-[#120D06]/45">{subtitle}</p>
    </header>
  );
}
