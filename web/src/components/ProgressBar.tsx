/**
 * ============================================================================
 * PROGRESS BAR COMPONENT
 * ============================================================================
 * 
 * Visual progress indicator for file uploads
 */

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export default function ProgressBar({
  progress,
  label,
  size = 'md',
  showPercentage = true,
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {showPercentage && (
            <p className="text-sm font-medium text-gray-600">{Math.round(progress)}%</p>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}

