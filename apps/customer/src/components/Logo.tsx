/** Standalone logo — renders just the icon portion for tight spaces */
export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <img
      src="/StormLogo.png"
      alt="StormBurger"
      style={{ height: size, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}
