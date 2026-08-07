interface APIMorphicLogoProps {
  className?: string;
}

export default function APIMorphicLogo({ className }: APIMorphicLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="APIMorphic Logo"
      className={className}
    />
  );
}
