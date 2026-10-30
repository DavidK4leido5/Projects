import { Circle, G, Line, Path, Rect, Svg, Text, View } from "@react-pdf/renderer";
import { ACCENT, ACCENT_TWO, CHART_COLORS, INK, MUTED, RULE, SOFT } from "@/lib/pdf/theme";
import { pdfMoney, pdfMoneyCompact } from "@/lib/pdf/format";
import type { ReportCategoryRow, ReportMonth } from "@/lib/report-data";

const CHART_WIDTH = 500;
const LABEL_SIZE = 6.5;

type LegendItem = { label: string; color: string };

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 4 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}
        >
          <View style={{ width: 7, height: 7, backgroundColor: item.color, marginRight: 3 }} />
          <Text style={{ fontSize: LABEL_SIZE, color: MUTED }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Grouped income/expense bars drawn with plain SVG primitives. */
export function CashFlowBars({
  series,
  currency,
  locale,
}: {
  series: ReportMonth[];
  currency: string;
  locale: string;
}) {
  const height = 132;
  const plotHeight = height - 8;
  const groupWidth = CHART_WIDTH / Math.max(1, series.length);
  const barWidth = Math.min(16, Math.max(3, groupWidth * 0.26));
  const max = Math.max(1, ...series.map((point) => Math.max(point.income, point.expense)));

  return (
    <View>
      <Legend
        items={[
          { label: "Income", color: ACCENT },
          { label: "Expenses", color: ACCENT_TWO },
        ]}
      />
      <Svg width={CHART_WIDTH} height={height} viewBox={"0 0 " + CHART_WIDTH + " " + height}>
        {[0, 0.5, 1].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            x2={CHART_WIDTH}
            y1={plotHeight - plotHeight * ratio}
            y2={plotHeight - plotHeight * ratio}
            stroke={RULE}
            strokeWidth={0.6}
          />
        ))}
        {series.map((point, index) => {
          const center = index * groupWidth + groupWidth / 2;
          const incomeHeight = Math.max(0, (point.income / max) * plotHeight);
          const expenseHeight = Math.max(0, (point.expense / max) * plotHeight);
          return (
            <G key={point.key}>
              <Rect
                x={center - barWidth - 1.5}
                y={plotHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill={ACCENT}
              />
              <Rect
                x={center + 1.5}
                y={plotHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                fill={ACCENT_TWO}
              />
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", width: CHART_WIDTH }}>
        {series.map((point) => (
          <Text
            key={point.key}
            style={{ flex: 1, fontSize: LABEL_SIZE, color: MUTED, textAlign: "center" }}
          >
            {point.label.slice(0, 3)}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: LABEL_SIZE, color: MUTED, marginTop: 3 }}>
        Peak month: {pdfMoneyCompact(max, currency, locale)}
      </Text>
    </View>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function slicePath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const [x1, y1] = polar(cx, cy, outer, start);
  const [x2, y2] = polar(cx, cy, outer, end);
  const [x3, y3] = polar(cx, cy, inner, end);
  const [x4, y4] = polar(cx, cy, inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  const n = (value: number) => value.toFixed(2);
  return (
    "M " +
    n(x1) +
    " " +
    n(y1) +
    " A " +
    outer +
    " " +
    outer +
    " 0 " +
    large +
    " 1 " +
    n(x2) +
    " " +
    n(y2) +
    " L " +
    n(x3) +
    " " +
    n(y3) +
    " A " +
    inner +
    " " +
    inner +
    " 0 " +
    large +
    " 0 " +
    n(x4) +
    " " +
    n(y4) +
    " Z"
  );
}

/** Donut built from filled arc paths, with a legend that doubles as the table key. */
export function CategoryDonut({
  categories,
  total,
  currency,
  locale,
}: {
  categories: ReportCategoryRow[];
  total: number;
  currency: string;
  locale: string;
}) {
  const size = 118;
  const center = size / 2;
  const outer = 52;
  const inner = 31;
  const visible = categories.slice(0, 8);
  const visibleTotal = visible.reduce((sum, category) => sum + category.amount, 0);
  const denominator = visibleTotal > 0 ? visibleTotal : total;

  const fractions = visible.map((category) =>
    denominator > 0 ? category.amount / denominator : 0,
  );
  const circumference = Math.PI * 2;
  const segments = visible.map((category, index) => {
    const preceding = fractions.slice(0, index).reduce((sum, value) => sum + value, 0);
    const fraction = fractions[index] ?? 0;
    const start = -Math.PI / 2 + preceding * circumference;
    const end =
      fraction >= 0.9999 ? start + circumference - 0.0001 : start + fraction * circumference;
    return {
      key: category.categoryId ?? category.name,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? ACCENT,
      d: slicePath(center, center, outer, inner, start, end),
      category,
    };
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
          <Circle cx={center} cy={center} r={outer} fill={SOFT} />
          {segments.map((segment) => (
            <Path key={segment.key} d={segment.d} fill={segment.color} />
          ))}
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 6, color: MUTED }}>TOTAL</Text>
          <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK }}>
            {pdfMoneyCompact(denominator, currency, locale)}
          </Text>
        </View>
      </View>
      <View style={{ flexGrow: 1, flexBasis: 0, marginLeft: 14 }}>
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 2.5 }}
          >
            <View style={{ width: 6, height: 6, backgroundColor: segment.color, marginRight: 4 }} />
            <Text style={{ flexGrow: 1, flexBasis: 0, fontSize: 7.5, color: INK, paddingRight: 6 }}>
              {segment.category.name + " (" + segment.category.share + "%)"}
            </Text>
            <Text style={{ fontSize: 7.5, color: MUTED }}>
              {pdfMoney(segment.category.amount, currency, locale)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
