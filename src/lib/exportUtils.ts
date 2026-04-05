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

        // 2. Extraer todas las cabeceras únicas de todo el set de datos
        const allKeys = new Set<string>();
        data.forEach(obj => Object.keys(obj).forEach(key => allKeys.add(key)));
        const headers = Array.from(allKeys);

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

        // 3. Estilizar Filas de Datos (Premium Zebra Style)
        data.forEach((item, index) => {
            const row = worksheet.addRow(item);
            const isAlternate = index % 2 !== 0;

            row.eachCell((cell) => {
                cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } }; // Slate-700
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                if (isAlternate) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' } // Slate-50
                    };
                }

                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };

                // Formatear números
                if (typeof cell.value === 'number') {
                    cell.numFmt = '#,##0.00';
                    cell.alignment = { horizontal: 'right' };
                    // Resaltar montos positivos
                    if (cell.value > 0) {
                        cell.font = { ...cell.font, color: { argb: 'FF059669' }, bold: true }; // Green-600
                    }
                }
            });
            row.height = 22;
        });

        // 4. Ajustar ancho de columnas dinámicamente
        worksheet.columns.forEach(column => {
            let maxColumnLength = 0;
            column.eachCell!({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxColumnLength) {
                    maxColumnLength = columnLength;
                }
            });
            column.width = maxColumnLength < 12 ? 15 : maxColumnLength + 5;
        });

        // Borde final de la tabla
        const lastRow = worksheet.lastRow;
        if (lastRow) {
            lastRow.eachCell((cell) => {
                cell.border = {
                    ...cell.border,
                    bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
                };
            });
        }

        // 4. Generar el archivo y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Error exportando a Excel:", error);
    }
};
