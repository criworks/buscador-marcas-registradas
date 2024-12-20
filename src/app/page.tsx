import SearchForm from '../components/SearchForm';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold text-center mb-8">
        Buscador de Marcas Registradas
      </h1>
      <SearchForm />
    </main>
  );
}
