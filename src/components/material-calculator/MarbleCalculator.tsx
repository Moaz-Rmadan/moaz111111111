import React from 'react';
import { MarbleCalculation } from './types';

export const MarbleCalculator = ({ onAdd }: { onAdd: (calc: MarbleCalculation) => void }) => {
  return <div className="p-4 bg-white rounded-xl">Marble Calculator UI</div>;
};
