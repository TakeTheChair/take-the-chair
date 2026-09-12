// The blue security strip that runs down the page.
export default function Ribbon() {
  return (
    <div className="ribbon" aria-hidden="true">
      <div className="ribbon-text">{"BRRR ".repeat(900)}</div>
    </div>
  );
}
