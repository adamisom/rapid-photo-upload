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
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {showPercentage && (
            <p className="text-sm font-semibold text-blue-600">{Math.round(progress)}%</p>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]} shadow-inner`}>
        <div
          className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-md"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}

