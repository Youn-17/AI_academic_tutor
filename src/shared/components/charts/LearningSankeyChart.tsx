import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { MOCK_SANKEY_DATA } from '@/constants';

const LearningSankeyChart: React.FC = () => {
  // Custom Node Component
  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isOut = x + width + 6 > containerWidth;

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#4f46e5"
          fillOpacity="0.8"
          radius={[2, 2, 2, 2]}
        />
        <text
          textAnchor={isOut ? 'end' : 'start'}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2}
          fontSize="10"
          fill="#334155"
          fontFamily="Inter"
          fontWeight="600"
          dominantBaseline="middle"
        >
          {payload.name}
        </text>
        <text
          textAnchor={isOut ? 'end' : 'start'}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2 + 14}
          fontSize="9"
          fill="#94a3b8"
          fontFamily="Inter"
          dominantBaseline="middle"
        >
          {payload.value}
        </text>
      </Layer>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Sankey
        data={MOCK_SANKEY_DATA}
        node={renderNode}
        nodePadding={50}
        margin={{
          left: 0,
          right: 100, // Make space for labels on the right
          top: 20,
          bottom: 20,
        }}
        link={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
      >
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: '12px'
          }} />
      </Sankey>
    </ResponsiveContainer>
  );
};

export default LearningSankeyChart;
