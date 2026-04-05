import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Exporta un array de objetos a un archivo Excel profesionalmente estilizado.
 * @param data Array de objetos con los datos a exportar.
 * @param fileName Nombre del archivo (sin extensión).
 * @param sheetName Nombre de la pestaña en el Excel.
 */
export const exportToExcel = async (data: any[], fileName: string = 'Reporte', sheetName: string = 'Datos') => {
    try {
        if (!data || data.length === 0) {
            console.warn("No hay datos para exportar");
            return;
        }

        // 1. Crear el libro y la hoja
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // 2. Extraer cabeceras
        const headers = Object.keys(data[0]);
        worksheet.columns = headers.map(header => ({
            header: header.toUpperCase(),
            key: header,
            width: header.length < 15 ? 20 : header.length + 5
        }));

        // Estilizar cabecera (Premium Dark Style)
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0F172A' } // Slate-900
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 3. Añadir filas
        worksheet.addRows(data);

        // Estilizar filas de datos
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Saltar cabecera
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };

                // Formatear números si parecen moneda o cantidades
                if (typeof cell.value === 'number') {
                    cell.numFmt = '#,##0.00';
                }
            });
            row.height = 20;
        });

        // 4. Generar el archivo y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Error exportando a Excel:", error);
    }
};
