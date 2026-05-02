import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function PasswordField({ value, onChange, placeholder, className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
