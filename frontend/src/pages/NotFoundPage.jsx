import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-900">
      <div className="text-center">
        <h1 className="text-5xl font-black">404</h1>
        <p className="mt-2 text-slate-500">Pagina nao encontrada.</p>
        <Link to="/" className="btn-primary mt-6 inline-block">Voltar ao início</Link>
      </div>
    </div>
  );
}
