import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a un archivo Excel y dispara la descarga en el navegador.
 * @param data Array de objetos con los datos a exportar.
 * @param fileName Nombre del archivo (sin extensión).
 * @param sheetName Nombre de la pestaña en el Excel.
 */
export const exportToExcel = (data: any[], fileName: string = 'Reporte', sheetName: string = 'Datos') => {
    try {
        if (!data || data.length === 0) {
            console.warn("No hay datos para exportar");
            return;
        }

        // 1. Crear el libro y la hoja
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 2. Generar el archivo y descargar
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
        console.error("Error exportando a Excel:", error);
    }
};
