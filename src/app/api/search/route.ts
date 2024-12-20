import { NextResponse } from 'next/server';
import { searchBrands } from '../../../lib/sheets';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    console.log('Término de búsqueda:', query);
    const results = await searchBrands(query);
    console.log('Resultados encontrados:', results);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error detallado:', error);
    return NextResponse.json({ error: 'Error en la búsqueda' }, { status: 500 });
  }
}
