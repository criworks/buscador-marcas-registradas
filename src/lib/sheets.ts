const FOLDER_URL = 'https://drive.google.com/drive/folders/10T-OTucPFU6ys7xfqsjIHbWURlIE7fAB';

async function getSpreadsheetIds() {
  try {
    const response = await fetch(FOLDER_URL);
    const html = await response.text();
    
    // Buscar IDs de hojas de cálculo válidos
    const matches = html.match(/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/g) || [];
    
    // Extraer y limpiar IDs únicos
    const uniqueIds = [...new Set(matches.map(match => 
      match.replace('spreadsheets/d/', '')
    ))];

    // Filtrar IDs inválidos o que no correspondan al patrón esperado
    return uniqueIds.filter(id => 
      id.length >= 20 && 
      !id.includes('AIzaSy') && 
      !id.includes('ANONYMOUS') &&
      !id.includes('SELECTION')
    );
  } catch (error) {
    console.error('Error al obtener IDs:', error);
    return [];
  }
}

async function fetchSheetData(id: string) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    console.log(`Intentando acceder a: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    try {
      // Extraer solo la parte JSON usando regex
      const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
      if (!match || !match[1]) {
        throw new Error('No se pudo extraer el JSON de la respuesta');
      }

      const data = JSON.parse(match[1]);
      if (!data.table || !data.table.rows) {
        throw new Error('Formato de datos inválido');
      }

      // Convertir el formato de Google a filas simples
      const headers = data.table.cols.map((col: any) => col.label);
      const rows = data.table.rows.map((row: any) => 
        row.c.map((cell: any) => cell?.v?.toString() || '')
      );

      return [headers, ...rows];
    } catch (e) {
      console.error(`Error al procesar datos de la hoja ${id}:`, e);
      return [];
    }
  } catch (error) {
    console.error(`Error al obtener datos de la hoja ${id}:`, error);
    return [];
  }
}

export async function searchBrands(query: string) {
  try {
    const sheetIds = await getSpreadsheetIds();
    console.log('Hojas encontradas:', sheetIds);

    const searchPromises = sheetIds.map(async (id) => {
      try {
        const rows = await fetchSheetData(id);
        if (!rows.length) return [];

        const headers = rows[0];
        console.log(`Hoja ${id} - Headers encontrados:`, headers);
        
        const columnIndexes = {
          BrandName: headers.findIndex((h: string) => 
            h?.toLowerCase().includes('brandname') || 
            h?.toLowerCase().includes('brand name')
          ),
          IMAGE: headers.findIndex((h: string) => h?.includes('IMAGE')),
          RegistrationDate: headers.findIndex((h: string) => h?.includes('RegistrationDate')),
          ExpirationDate: headers.findIndex((h: string) => h?.includes('ExpirationDate')),
          LastUpdatedDate: headers.findIndex((h: string) => h?.includes('LastUpdatedDate')),
          Applicants: headers.findIndex((h: string) => h?.includes('Applicants')),
          Representatives: headers.findIndex((h: string) => h?.includes('Representatives'))
        };

        if (columnIndexes.BrandName === -1) {
          console.log(`Hoja ${id} - No se encontró la columna BrandName`);
          return [];
        }

        const matches = rows.slice(1).filter(row => {
          const brandName = row[columnIndexes.BrandName];
          return brandName && 
                 brandName.toLowerCase().trim()
                         .includes(query.toLowerCase().trim());
        });

        console.log(`Hoja ${id} - Coincidencias encontradas:`, matches.length);
        if (matches.length > 0) {
          console.log(`Hoja ${id} - Primera coincidencia:`, matches[0]);
        }

        return matches.map(row => ({
          sheetId: id,
          BrandName: row[columnIndexes.BrandName],
          IMAGE: row[columnIndexes.IMAGE],
          RegistrationDate: row[columnIndexes.RegistrationDate],
          ExpirationDate: row[columnIndexes.ExpirationDate],
          LastUpdatedDate: row[columnIndexes.LastUpdatedDate],
          Applicants: row[columnIndexes.Applicants],
          Representatives: row[columnIndexes.Representatives]
        }));
      } catch (error) {
        console.error(`Error en hoja ${id}:`, error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    const flatResults = results.flat();
    console.log('Total de resultados:', flatResults.length);
    
    return flatResults;
  } catch (error) {
    console.error('Error al buscar marcas:', error);
    return [];
  }
}