import React from 'react';
import { formatStudentName } from '../utils';

interface SeatProps {
  id: string; // r-c
  studentName?: string;
  isLocked: boolean;
  isSelected: boolean;
  width: number;
  height: number;
  fontSize: number;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
}

export const Seat: React.FC<SeatProps> = ({
  id,
  studentName,
  isLocked,
  isSelected,
  width,
  height,
  fontSize,
  onClick,
  onDoubleClick,
}) => {
  let bgColor = 'bg-gray-300'; // Default empty
  let textColor = 'text-black';
  let content: React.ReactNode = id;
  let borderColor = isSelected ? 'border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.6)] z-10 scale-105' : 'border-gray-600';

  if (isLocked) {
    bgColor = 'bg-white';
    content = <span className="text-red-700 text-xl font-bold">✖</span>; // Lock icon
  } else if (studentName) {
    bgColor = isSelected ? 'bg-amber-100' : 'bg-white';
    textColor = 'text-black';
    content = (
        <div className="flex items-center justify-center w-full h-full p-0.5">
           <div className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full leading-tight">
             {formatStudentName(studentName)}
           </div>
        </div>
    );
  } else if (isSelected) {
      bgColor = 'bg-amber-400';
  }

  // Adjust font size dynamically for long names if occupied
  const adjustedFontSize = studentName && studentName.length > 3 ? fontSize * 0.85 : fontSize;

  return (
    <div
      className={`rounded-md border-2 flex items-center justify-center cursor-pointer select-none transition-all duration-100 ease-in-out ${bgColor} ${textColor} ${borderColor}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        fontSize: `${adjustedFontSize}px`,
      }}
      onClick={() => onClick(id)}
      onDoubleClick={() => onDoubleClick(id)}
    >
      {content}
    </div>
  );
};
