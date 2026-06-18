import { getSizeChartRows } from "@/config/size-chart";

const SIZES = getSizeChartRows();

export const metadata = { title: "Size Guide" };

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-primary">Size Guide</h1>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-primary">
            <th className="py-2">Size</th><th>Bust (in)</th><th>Waist (in)</th><th>Shoulder (in)</th>
          </tr>
        </thead>
        <tbody>
          {SIZES.map((s) => (
            <tr key={s.name} className="border-b">
              <td className="py-2 font-medium">{s.name}</td>
              <td>{s.bust}</td>
              <td>{s.waist}</td>
              <td>{s.shoulder}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 text-sm text-foreground/70">
        For best results, use our <a href="/ai-features/size-finder" className="text-primary underline">AI Size Finder</a>.
      </p>
    </div>
  );
}
