'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface Marca {
  BrandName: string;
  IMAGE?: string;
  RegistrationDate: string;
  ExpirationDate: string;
  LastUpdatedDate: string;
  Applicants: string;
  Representatives: string;
  sheetId?: string;
}

export default function SearchForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // Para saber si ya se realizó una búsqueda

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSearch} className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar marca registrada..."
          className="w-full p-2 border rounded"
        />
        <button 
          type="submit"
          disabled={loading}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Mostrar mensaje cuando no hay resultados y se ha realizado una búsqueda */}
      {searched && results.length === 0 && !loading && (
        <div className="text-center py-4 text-gray-600">
          No se encontró ninguna coincidencia
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((marca, index) => (
            <div key={index} className="border p-4 rounded">
              <h3 className="font-bold">{marca.BrandName}</h3>
              {marca.IMAGE && (
                <div className="relative h-32 w-full">
                  <Image
                    src={marca.IMAGE}
                    alt={marca.BrandName}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <p>Fecha de registro: {marca.RegistrationDate}</p>
              <p>Fecha de vencimiento: {marca.ExpirationDate}</p>
              <p>Última actualización: {marca.LastUpdatedDate}</p>
              <p>Solicitantes: {marca.Applicants}</p>
              <p>Representantes: {marca.Representatives}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}