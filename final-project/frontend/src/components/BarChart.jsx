import React from "react"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// A component is a function. A special func. that returns an HTML.

export default function BarChartComponent()
{
    const data = [
        { name: "Apple Trees", value: 4 },
        { name: "Blueberry Bushes", value: 10 },
        { name: "Grape Vines", value: 6 },
        { name: "Peach Trees", value:30 },
    ];

    return(
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2f6fed" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}