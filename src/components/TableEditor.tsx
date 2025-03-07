import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import './TableEditor.css';

interface Cell {
  content: string;
  colspan?: number;
  rowspan?: number;
  isEditing?: boolean;
  backgroundColor?: string;
  color?: string;
}

interface TableData {
  id: string;
  name: string;
  rows: Cell[][];
  isDirty?: boolean;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  row: number;
  col: number;
}

export const TableEditor: React.FC = () => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableIndex, setActiveTableIndex] = useState<number>(0);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [inputHtml, setInputHtml] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ show: false, x: 0, y: 0, row: 0, col: 0 });
  const editInputRef = useRef<HTMLInputElement>(null);

  // useEffect(() => {
  //   // Initialize with default table
  //   const defaultTableData = parseHtmlTable(defaultTable, 'Table 1');
  //   setTables([defaultTableData]);
  // }, []);

  const parseHtmlTable = (html: string, tableName: string = 'Untitled Table') => {
    const cleanHtml = html.replace(/\\n/g, '\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return { id: `table-${Date.now()}`, name: tableName, rows: [], isDirty: false };

    const rows: Cell[][] = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells: Cell[] = [];
      tr.querySelectorAll('td').forEach(td => {
        cells.push({
          content: td.textContent || '',
          colspan: td.getAttribute('colspan') ? parseInt(td.getAttribute('colspan')!) : undefined,
          rowspan: td.getAttribute('rowspan') ? parseInt(td.getAttribute('rowspan')!) : undefined,
          backgroundColor: '#ffffff',
          color: '#000000'
        });
      });
      rows.push(cells);
    });
    return { id: `table-${Date.now()}`, name: tableName, rows, isDirty: false };
  };

  const generateHtmlTable = (tableData: TableData) => {
    let html = '<table>\n';
    tableData.rows.forEach(row => {
      html += '  <tr>\n';
      row.forEach(cell => {
        html += '    <td';
        if (cell.colspan) html += ` colspan="${cell.colspan}"`;
        if (cell.rowspan) html += ` rowspan="${cell.rowspan}"`;
        if (cell.backgroundColor && cell.backgroundColor !== '#ffffff') html += ` style="background-color: ${cell.backgroundColor};`;
        if (cell.color && cell.color !== '#000000') html += `${cell.backgroundColor && cell.backgroundColor !== '#ffffff' ? ' ' : ' style="'}color: ${cell.color};`;
        if ((cell.backgroundColor && cell.backgroundColor !== '#ffffff') || (cell.color && cell.color !== '#000000')) html += '"';
        html += `>${cell.content}</td>\n`;
      });
      html += '  </tr>\n';
    });
    html += '</table>';
    return html;
  };

  const handleCellClick = (rowIndex: number, cellIndex: number) => {
    setActiveCell({ row: rowIndex, col: cellIndex });
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };

  const handleCellChange = (rowIndex: number, cellIndex: number, value: string) => {
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const updatedRows = updatedTables[activeTableIndex].rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) =>
            j === cellIndex ? { ...cell, content: value } : cell
          )
          : row
      );

      updatedTables[activeTableIndex] = {
        ...updatedTables[activeTableIndex],
        rows: updatedRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, cellIndex: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextCell = getNextCell(rowIndex, cellIndex, e.key === 'Enter');
      if (nextCell) {
        setActiveCell(nextCell);
      }
    }
  };

  const getNextCell = (currentRow: number, currentCol: number, moveDown: boolean) => {
    if (!tables[activeTableIndex]) return null;

    const currentTable = tables[activeTableIndex];

    if (moveDown) {
      if (currentRow < currentTable.rows.length - 1) {
        return { row: currentRow + 1, col: currentCol };
      }
      return null;
    } else {
      if (currentCol < currentTable.rows[currentRow].length - 1) {
        return { row: currentRow, col: currentCol + 1 };
      } else if (currentRow < currentTable.rows.length - 1) {
        return { row: currentRow + 1, col: 0 };
      }
      return null;
    }
  };

  const addRow = (position: 'before' | 'after' = 'after', targetRow: number = -1) => {
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      const actualTargetRow = targetRow === -1 ? currentTable.rows.length : targetRow;

      const newRows = [...currentTable.rows];
      const maxCols = Math.max(...currentTable.rows.map(row => row.length)) || 1;
      // Create a new row with unique cell objects
      const newRow = Array.from({ length: maxCols }, () => ({
        content: '',
        backgroundColor: '#ffffff',
        color: '#000000'
      }));
      newRows.splice(position === 'before' ? actualTargetRow : actualTargetRow + 1, 0, newRow);

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: newRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const addColumn = (position: 'before' | 'after' = 'after', targetCol: number = -1) => {
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];

      const newRows = currentTable.rows.map(row => {
        const newRow = [...row];
        const insertIndex = targetCol === -1 ? row.length : (position === 'before' ? targetCol : targetCol + 1);
        newRow.splice(insertIndex, 0, { content: '', backgroundColor: '#ffffff', color: '#000000' });
        return newRow;
      });

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: newRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const handleImport = () => {
    if (!inputHtml.trim()) return;
    const tableName = `Table ${tables.length + 1}`;
    const parsed = parseHtmlTable(inputHtml, tableName);
    setTables(prev => [...prev, parsed]);
    setActiveTableIndex(tables.length);
    setShowImport(false);
    setInputHtml('');
  };

  const handleExport = (tableIndex: number = activeTableIndex) => {
    if (!tables[tableIndex]) return;

    const html = generateHtmlTable(tables[tableIndex]);
    navigator.clipboard.writeText(html);
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.textContent = `Table "${tables[tableIndex].name}" HTML copied to clipboard!`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  const saveTable = (tableIndex: number = activeTableIndex) => {
    if (!tables[tableIndex]) return;

    setTables(prev => {
      const updatedTables = [...prev];
      updatedTables[tableIndex] = {
        ...updatedTables[tableIndex],
        isDirty: false
      };
      return updatedTables;
    });

    // Here you would implement actual saving logic
    const html = generateHtmlTable(tables[tableIndex]);
    console.log(`Saved table ${tables[tableIndex].name}:`, html);

    // Show notification
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.textContent = `Table "${tables[tableIndex].name}" saved!`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, cellIndex: number) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      row: rowIndex,
      col: cellIndex
    });
  };


  const deleteRow = (rowIndex: number) => {
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      const updatedRows = currentTable.rows.filter((_, index) => index !== rowIndex);

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: updatedRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const deleteColumn = (colIndex: number) => {
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      const updatedRows = currentTable.rows.map(row => row.filter((_, index) => index !== colIndex));

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: updatedRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const addCellRight = (rowIndex: number, colIndex: number) => {
    console.log('Adding cell right at:', rowIndex, colIndex);
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      // Deep clone to avoid reference issues
      const newRows = JSON.parse(JSON.stringify(currentTable.rows));

      // Insert a new cell to the right of the current cell
      newRows[rowIndex].splice(colIndex + 1, 0, {
        content: '',
        backgroundColor: '#ffffff',
        color: '#000000'
      });

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: newRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const addCellLeft = (rowIndex: number, colIndex: number) => {
    console.log('Adding cell left at:', rowIndex, colIndex);
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      // Deep clone to avoid reference issues
      const newRows = JSON.parse(JSON.stringify(currentTable.rows));

      // Insert a new cell to the left of the current cell
      newRows[rowIndex].splice(colIndex, 0, {
        content: '',
        backgroundColor: '#ffffff',
        color: '#000000'
      });

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: newRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  const addCellBelow = (rowIndex: number, colIndex: number) => {
    console.log('Adding cell below at:', rowIndex, colIndex);
    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      // Deep clone to avoid reference issues
      const newRows = JSON.parse(JSON.stringify(currentTable.rows));

      // If we're at the last row, add a new row
      if (rowIndex === newRows.length - 1) {
        // Create a new row with unique cell objects
        const newRow = [];
        for (let i = 0; i < newRows[rowIndex].length; i++) {
          newRow.push({
            content: '',
            backgroundColor: '#ffffff',
            color: '#000000'
          });
        }
        newRows.push(newRow);
      } else {
        // Otherwise, insert a new cell in the row below at the same column position
        // First, ensure the row below has enough cells
        while (newRows[rowIndex + 1].length <= colIndex) {
          newRows[rowIndex + 1].push({
            content: '',
            backgroundColor: '#ffffff',
            color: '#000000'
          });
        }
        // Shift cells to the right to make room for the new cell
        newRows[rowIndex + 1].splice(colIndex, 0, {
          content: '',
          backgroundColor: '#ffffff',
          color: '#000000'
        });
      }

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: newRows,
        isDirty: true
      };

      return updatedTables;
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, show: false }));
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar with table names */}
      <div className="w-64 bg-gray-100 p-4 border-r border-gray-200 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Tables</h2>
        <div className="space-y-2">
          {tables.map((table, index) => (
            <div
              key={table.id}
              className={`p-2 rounded cursor-pointer ${index === activeTableIndex ? 'bg-blue-100' : 'hover:bg-gray-200'
                }`}
              onClick={() => setActiveTableIndex(index)}
            >
              <span className="font-medium">{table.name}</span>
              {table.isDirty && <span className="ml-2 text-red-500">*</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setShowImport(true)}
          >
            Import Table
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Table toolbar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => handleExport()}
              >
                Export HTML
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => saveTable()}
              >
                Save
              </button>
            </div>
          </div>

          {/* Table preview/edit area */}
          <div className="flex-1 overflow-auto p-4">
            {tables[activeTableIndex] && (
              <div className="table-container">
                <table className="border-collapse">
                  <tbody>
                    {tables[activeTableIndex].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${rowIndex}-${cellIndex}`}
                            colSpan={cell.colspan}
                            rowSpan={cell.rowspan}
                            className={`border border-gray-300 p-2 ${activeCell?.row === rowIndex && activeCell?.col === cellIndex
                              ? 'bg-blue-50'
                              : ''
                              }`}
                            style={{
                              backgroundColor: cell.backgroundColor,
                              color: cell.color,
                              position: 'relative',
                              minWidth: '100px'
                            }}
                            onClick={() => handleCellClick(rowIndex, cellIndex)}
                            onContextMenu={(e) => handleContextMenu(e, rowIndex, cellIndex)}
                          >
                            {activeCell?.row === rowIndex && activeCell?.col === cellIndex ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={cell.content}
                                onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, cellIndex)}
                                className="w-full h-full border-none bg-transparent outline-none"
                                autoFocus
                              />
                            ) : (
                              cell.content
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[600px]">
            <h2 className="text-xl font-semibold mb-4">Import Table HTML</h2>
            <textarea
              className="w-full h-48 p-2 border rounded mb-4"
              value={inputHtml}
              onChange={(e) => setInputHtml(e.target.value)}
              placeholder="Paste table HTML here..."
            />
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setShowImport(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleImport}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu.show && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => addRow('before', contextMenu.row)}>Add Row Above</button>
          <button onClick={() => addRow('after', contextMenu.row)}>Add Row Below</button>
          <button onClick={() => addColumn('before', contextMenu.col)}>Add Column Left</button>
          <button onClick={() => addColumn('after', contextMenu.col)}>Add Column Right</button>
          <div className="context-menu-separator" />
          <button onClick={() => addCellRight(contextMenu.row, contextMenu.col)}>Add Cell Right</button>
          <button onClick={() => addCellLeft(contextMenu.row, contextMenu.col)}>Add Cell Left</button>
          <button onClick={() => addCellBelow(contextMenu.row, contextMenu.col)}>Add Cell Below</button>
          <div className="context-menu-separator" />
          <button onClick={() => deleteRow(contextMenu.row)} className="danger">Delete Row</button>
          <button onClick={() => deleteColumn(contextMenu.col)} className="danger">Delete Column</button>
        </div>
      )}


    </div>
  );
};
