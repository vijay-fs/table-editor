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

const defaultTable = `<table>
  <tr>
    <td>TYPE</td>
    <td colspan="8">SIDE-MOUNTED FLOAT SENSOR NOHKEN FM-11</td>
  </tr>
  <tr>
    <td colspan="6">CUSTOMER</td>
    <td>APPR.</td>
    <td>CHECK</td>
    <td>DRAWN</td>
  </tr>
  <tr>
    <td>DATE</td>
    <td>Mar. 03. 2017</td>
    <td>SCALE</td>
    <td>1:2</td>
    <td>SIZE</td>
    <td>A3</td>
    <td>Y.I</td>
    <td>S.A</td>
    <td>J.M</td>
  </tr>
  <tr>
    <td colspan="6">YASHIMA BUSSAN CO.,LTD</td>
    <td colspan="3">DWG NO PLS-400-15b-00</td>
  </tr>
</table>`;

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
  const [inputHtml, setInputHtml] = useState(defaultTable);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ show: false, x: 0, y: 0, row: 0, col: 0 });
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedBgColor, setSelectedBgColor] = useState('#ffffff');
  const editInputRef = useRef<HTMLInputElement>(null);

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
    const tableName = `Table ${tables.length + 1}`;
    const parsed = parseHtmlTable(inputHtml, tableName);
    setTables(prev => [...prev, parsed]);
    setActiveTableIndex(tables.length);
    setShowImport(false);
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

  const addNewTable = () => {
    const newTableId = `table-${Date.now()}`;
    const newTableName = `Table ${tables.length + 1}`;

    setTables(prev => [
      ...prev,
      {
        id: newTableId,
        name: newTableName,
        rows: [
          [{ content: 'New Table', backgroundColor: '#ffffff', color: '#000000' }]
        ],
        isDirty: true
      }
    ]);

    // Switch to the new table
    setActiveTableIndex(tables.length);
  };

  useEffect(() => {
    if (tables.length === 0) {
      const parsed = parseHtmlTable(defaultTable, 'Table 1');
      setTables([parsed]);
    }
  }, []);

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

  const handleColorChange = (color: string, type: 'text' | 'background') => {
    if (!activeCell) return;

    if (type === 'text') setSelectedColor(color);
    else setSelectedBgColor(color);

    setTables(prev => {
      const updatedTables = [...prev];
      if (!updatedTables[activeTableIndex]) return prev;

      const currentTable = updatedTables[activeTableIndex];
      const updatedRows = currentTable.rows.map((row, i) =>
        i === activeCell.row
          ? row.map((cell, j) =>
            j === activeCell.col
              ? {
                ...cell,
                ...(type === 'text' ? { color } : { backgroundColor: color })
              }
              : cell
          )
          : row
      );

      updatedTables[activeTableIndex] = {
        ...currentTable,
        rows: updatedRows,
        isDirty: true
      };

      return updatedTables;
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
    <div className="table-editor">
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="toolbar-button" onClick={() => addRow()} title="Add Row">
            <span className="material-icons">add_row_below</span>
          </button>
          <button className="toolbar-button" onClick={() => addColumn()} title="Add Column">
            <span className="material-icons">add_column</span>
          </button>
        </div>
        <div className="toolbar-group">
          <button className="toolbar-button" onClick={() => setShowImport(true)} title="Import HTML">
            <span className="material-icons">upload_file</span>
          </button>
          <button className="toolbar-button" onClick={() => handleExport()} title="Export HTML">
            <span className="material-icons">download</span>
          </button>
          <button className="toolbar-button" onClick={() => addNewTable()} title="Add New Table">
            <span className="material-icons">add_box</span>
          </button>
        </div>
      </div>

      <div className="table-selector">
        {tables.map((table, index) => (
          <div
            key={table.id}
            className={`table-tab ${activeTableIndex === index ? 'active' : ''}`}
            onClick={() => setActiveTableIndex(index)}
          >
            <span>{table.name}</span>
            {table.isDirty && <span className="dirty-indicator">*</span>}
            <button
              className="save-button"
              onClick={(e) => {
                e.stopPropagation();
                saveTable(index);
              }}
              title="Save Table"
            >
              <span className="material-icons">save</span>
            </button>
          </div>
        ))}
      </div>

      <div className="editor-layout">
        {tables.length > 0 && tables[activeTableIndex] && (
          <div className="table-container">
            <table className="sheet-table">
              <tbody>
                {tables[activeTableIndex].rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`sheet-cell ${activeCell?.row === rowIndex && activeCell?.col === cellIndex ? 'active' : ''}`}
                        onClick={() => handleCellClick(rowIndex, cellIndex)}
                        onContextMenu={(e) => handleContextMenu(e, rowIndex, cellIndex)}
                        colSpan={cell.colspan}
                        rowSpan={cell.rowspan}
                        style={{
                          backgroundColor: cell.backgroundColor || '#ffffff',
                          color: cell.color || '#000000'
                        }}
                      >
                        {activeCell?.row === rowIndex && activeCell?.col === cellIndex ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={cell.content}
                            onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, cellIndex)}
                            onBlur={() => setActiveCell(null)}
                            className="cell-input"
                          />
                        ) : (
                          <span className="cell-content">{cell.content}</span>
                        )}
                        {activeCell?.row === rowIndex && activeCell?.col === cellIndex && (
                          <div className="cell-controls">
                            <input
                              type="number"
                              min="1"
                              value={cell.colspan || 1}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || undefined;
                                setTables(prev => {
                                  const updatedTables = [...prev];
                                  if (!updatedTables[activeTableIndex]) return prev;

                                  const currentTable = updatedTables[activeTableIndex];
                                  const updatedRows = currentTable.rows.map((r, i) =>
                                    i === rowIndex
                                      ? r.map((c, j) =>
                                        j === cellIndex ? { ...c, colspan: value } : c
                                      )
                                      : r
                                  );

                                  updatedTables[activeTableIndex] = {
                                    ...currentTable,
                                    rows: updatedRows,
                                    isDirty: true
                                  };

                                  return updatedTables;
                                });
                              }}
                              className="span-input"
                              title="Colspan"
                            />
                            <input
                              type="number"
                              min="1"
                              value={cell.rowspan || 1}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || undefined;
                                setTables(prev => {
                                  const updatedTables = [...prev];
                                  if (!updatedTables[activeTableIndex]) return prev;

                                  const currentTable = updatedTables[activeTableIndex];
                                  const updatedRows = currentTable.rows.map((r, i) =>
                                    i === rowIndex
                                      ? r.map((c, j) =>
                                        j === cellIndex ? { ...c, rowspan: value } : c
                                      )
                                      : r
                                  );

                                  updatedTables[activeTableIndex] = {
                                    ...currentTable,
                                    rows: updatedRows,
                                    isDirty: true
                                  };

                                  return updatedTables;
                                });
                              }}
                              className="span-input"
                              title="Rowspan"
                            />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeCell && (
          <div className="side-panel">
            <div className="panel-section">
              <h3>Cell Style</h3>
              <div className="color-controls">
                <div className="color-control">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value, 'text')}
                  />
                </div>
                <div className="color-control">
                  <label>Background</label>
                  <input
                    type="color"
                    value={selectedBgColor}
                    onChange={(e) => handleColorChange(e.target.value, 'background')}
                  />
                </div>
              </div>
            </div>
            <div className="panel-section">
              <h3>Table Operations</h3>
              <div className="operation-buttons">
                <button onClick={() => addRow('before', activeCell.row)}>Add Row Above</button>
                <button onClick={() => addRow('after', activeCell.row)}>Add Row Below</button>
                <button onClick={() => addColumn('before', activeCell.col)}>Add Column Left</button>
                <button onClick={() => addColumn('after', activeCell.col)}>Add Column Right</button>
                <button onClick={() => deleteRow(activeCell.row)} className="danger">Delete Row</button>
                <button onClick={() => deleteColumn(activeCell.col)} className="danger">Delete Column</button>
              </div>
              <div className="operation-buttons">
                <button onClick={() => addCellRight(activeCell.row, activeCell.col)}>Add Cell Right</button>
                <button onClick={() => addCellLeft(activeCell.row, activeCell.col)}>Add Cell Left</button>
                <button onClick={() => addCellBelow(activeCell.row, activeCell.col)}>Add Cell Below</button>
              </div>
            </div>
          </div>
        )}
      </div>

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

      {showImport && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Import HTML Table</h2>
            <textarea
              value={inputHtml}
              onChange={(e) => setInputHtml(e.target.value)}
              placeholder="Paste your HTML table here..."
            />
            <div className="modal-buttons">
              <button onClick={() => setShowImport(false)}>Cancel</button>
              <button onClick={handleImport}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
