export const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div
        className={`${sizeClasses[size]} border-4 border-surface border-t-primary rounded-full animate-spin`}
      />
      <p className="mt-4 text-muted">{message}</p>
    </div>
  )
}

export default LoadingSpinner