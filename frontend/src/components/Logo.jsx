import { Link } from 'react-router-dom';

function buildSize(size) {
  if (typeof size === 'number') {
    return { width: size, height: size };
  }

  return size || { width: 32, height: 32 };
}

export function Logo({
  size = 32,
  wordmark = true,
  wordmarkClassName = '',
  className = '',
  imageClassName = '',
  text = 'TrainFlow',
  to = null,
  priority = false
}) {
  const dimensions = buildSize(size);
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/logo.svg"
        alt="TrainFlow"
        width={dimensions.width}
        height={dimensions.height}
        loading={priority ? 'eager' : 'lazy'}
        className={`h-auto shrink-0 object-contain ${imageClassName}`}
      />
      {wordmark ? (
        <span className={wordmarkClassName || 'text-xl font-black tracking-tight text-slate-900'}>
          {text}
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} className="inline-flex items-center">
      {content}
    </Link>
  );
}
