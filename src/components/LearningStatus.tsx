import React from 'react';
import type { StandardKnowledgePoint } from '../services/knowledgeBase';

interface LearningStatusProps {
  matchedPoints: StandardKnowledgePoint[];
  isLearning: boolean;
}

export const LearningStatus: React.FC<LearningStatusProps> = ({ matchedPoints, isLearning }) => {
  if (isLearning) {
    return (
      <div className="rounded-xl bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-blue-700">正在学习相关考点...</span>
        </div>
      </div>
    );
  }

  if (matchedPoints.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-green-50 p-4">
      <h4 className="text-sm font-semibold text-green-800">
        ✓ 已学习 {matchedPoints.length} 个标准考点
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {matchedPoints.map(point => (
          <span
            key={point.id}
            className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
          >
            {point.title}
            {point.examFrequency === '高频' && ' 🔥'}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LearningStatus;
