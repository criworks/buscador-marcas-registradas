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

interface GoogleVisualizationColumn {
  label: string;
  type: string;
  id: string;
}

interface GoogleVisualizationCell {
  v?: string | number | null;
  f?: string;
}

interface GoogleVisualizationRow {
  c: GoogleVisualizationCell[];
}

interface GoogleVisualizationResponse {
  table: {
    cols: GoogleVisualizationColumn[];
    rows: GoogleVisualizationRow[];
  };
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
      const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
      if (!match || !match[1]) {
        throw new Error('No se pudo extraer el JSON de la respuesta');
      }

      const data = JSON.parse(match[1]) as GoogleVisualizationResponse;
      if (!data.table || !data.table.rows) {
        throw new Error('Formato de datos inválido');
      }

      const headers = data.table.cols.map((col: GoogleVisualizationColumn) => col.label);
      const rows = data.table.rows.map((row: GoogleVisualizationRow) => 
        row.c.map((cell: GoogleVisualizationCell) => cell?.v?.toString() || '')
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
    console.log('Hojas encontradas:', sheetIds.length);

    // Limitar el número de hojas que se buscan simultáneamente
    const BATCH_SIZE = 3;
    const results: any[] = [];

    // Procesar las hojas en lotes
    for (let i = 0; i < sheetIds.length; i += BATCH_SIZE) {
      const batch = sheetIds.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (id) => {
        try {
          const rows = await fetchSheetData(id);
          if (!rows.length) return [];

          const headers = rows[0];
          const columnIndexes = {
            BrandName: headers.findIndex((h: string) => 
              h?.toLowerCase().includes('brandname')
            ),
            IMAGE: headers.findIndex((h: string) => h?.includes('IMAGE')),
            RegistrationDate: headers.findIndex((h: string) => h?.includes('RegistrationDate')),
            ExpirationDate: headers.findIndex((h: string) => h?.includes('ExpirationDate')),
            LastUpdatedDate: headers.findIndex((h: string) => h?.includes('LastUpdatedDate')),
            Applicants: headers.findIndex((h: string) => h?.includes('Applicants')),
            Representatives: headers.findIndex((h: string) => h?.includes('Representatives'))
          };

          if (columnIndexes.BrandName === -1) return [];

          return rows.slice(1)
            .filter(row => row[columnIndexes.BrandName]?.toLowerCase()
                          .includes(query.toLowerCase()))
            .map(row => ({
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

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Si ya encontramos resultados, podemos retornar temprano
      if (results.length > 0) {
        console.log('Encontrados resultados, retornando temprano');
        return results;
      }
    }

    console.log('Total de resultados:', results.length);
    return results;
  } catch (error) {
    console.error('Error al buscar marcas:', error);
    return [];
  }
}