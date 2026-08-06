"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyCount } from "@/lib/dashboard-stats";

interface MonthlyAbsencesChartProps {
  data: MonthlyCount[];
}

export function MonthlyAbsencesChart({ data }: MonthlyAbsencesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ausentismos por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                className="fill-muted-foreground"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                className="fill-muted-foreground"
                width={32}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: "0.8rem",
                }}
                labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                formatter={(value) => [value, "Solicitudes"]}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
