import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { MOCK_SANKEY_DATA } from '@/constants';

const LearningSankeyChart: React.FC = () => {
  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isRight = x + width + 6 > containerWidth / 2;

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x} y={y} width={width} height={height}
          fill="#10b981" fillOpacity={0.85}
          radius={[3, 3, 3, 3]}
        />
        <text
          textAnchor={isRight ? 'end' : 'start'}
          x={isRight ? x - 6 : x + width + 6}
          y={y + height / 2 - 5}
          fontSize="10"
          fill="#334155"
          fontWeight="600"
          dominantBaseline="middle"
        >
          {payload.name}
        </text>
        <text
          textAnchor={isRight ? 'end' : 'start'}
          x={isRight ? x - 6 : x + width + 6}
          y={y + height / 2 + 8}
          fontSize="9"
          fill="#94a3b8"
          dominantBaseline="middle"
        >
          {payload.value}
        </text>
      </Layer>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Sankey
        data={MOCK_SANKEY_DATA}
        node={renderNode}
        nodePadding={40}
        nodeWidth={8}
        margin={{ left: 80, right: 80, top: 10, bottom: 10 }}
        link={{ stroke: '#d1fae5', strokeOpacity: 0.6 }}
      >
        <Tooltip
          contentStyle={{
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
};

export default LearningSankeyChart;
