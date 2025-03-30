import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface BarChartProps {
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showYAxis?: boolean;
  dataKey?: string;
  height?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  barColors?: string[];
}

export function BarChart({
  data,
  xAxisLabel,
  yAxisLabel,
  showYAxis = true,
  dataKey = "value",
  height = 300,
  isCurrency = false,
  isPercentage = false,
  barColors = ["#4F46E5", "#8982F2", "#B0ACF6", "#D7D5FB"]
}: BarChartProps) {
  
  // Format the tooltip label based on the data type
  const formatValue = (value: number) => {
    if (isCurrency) return formatCurrency(value);
    if (isPercentage) return `${value}%`;
    return value;
  };

  // Prepare the data for the chart
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || barColors[index % barColors.length]
    }));
  }, [data, barColors]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-700">
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 30
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: 12 }}
            label={
              xAxisLabel 
                ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } 
                : undefined
            }
          />
          {showYAxis && (
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={isCurrency ? (value) => `$${value}` : undefined}
              label={
                yAxisLabel 
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } 
                  : undefined
              }
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={dataKey} 
            radius={[4, 4, 0, 0]}
            fill="#4F46E5"
            // Use individual colors for each bar if available
            {...(chartData[0].color && { fill: undefined })}
          >
            {chartData.map((entry, index) => (
              <Bar 
                key={`cell-${index}`}
                dataKey={dataKey} 
                fill={entry.color} 
                name={entry.name}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
