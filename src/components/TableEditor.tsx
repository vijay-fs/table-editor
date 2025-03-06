import React, { useState, useEffect, useRef } from 'react';
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
  rows: Cell[][];
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
  const [tableData, setTableData] = useState<TableData>({ rows: [] });
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [inputHtml, setInputHtml] = useState(defaultTable);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ show: false, x: 0, y: 0, row: 0, col: 0 });
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedBgColor, setSelectedBgColor] = useState('#ffffff');
  const editInputRef = useRef<HTMLInputElement>(null);

  const parseHtmlTable = (html: string) => {
    const cleanHtml = html.replace(/\\n/g, '\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return { rows: [] };

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
    return { rows };
  };

  const generateHtmlTable = () => {
    let html = '<table>\n';
    tableData.rows.forEach(row => {
      html += '  <tr>\n';
      row.forEach(cell => {
        html += '    <td';
        if (cell.colspan) html += ` colspan="${cell.colspan}"`;
        if (cell.rowspan) html += ` rowspan="${cell.rowspan}"`;
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
    setTableData(prev => ({
      rows: prev.rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) =>
              j === cellIndex ? { ...cell, content: value } : cell
            )
          : row
      )
    }));
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
    if (moveDown) {
      if (currentRow < tableData.rows.length - 1) {
        return { row: currentRow + 1, col: currentCol };
      }
      return null;
    } else {
      if (currentCol < tableData.rows[currentRow].length - 1) {
        return { row: currentRow, col: currentCol + 1 };
      } else if (currentRow < tableData.rows.length - 1) {
        return { row: currentRow + 1, col: 0 };
      }
      return null;
    }
  };

  const addRow = (position: 'before' | 'after' = 'after', targetRow: number = tableData.rows.length) => {
    setTableData(prev => {
      const newRows = [...prev.rows];
      const maxCols = Math.max(...prev.rows.map(row => row.length)) || 1;
      const newRow = Array(maxCols).fill(null).map(() => ({
        content: '',
        backgroundColor: '#ffffff',
        color: '#000000'
      }));
      const insertIndex = position === 'before' ? targetRow : targetRow + 1;
      newRows.splice(insertIndex, 0, newRow);
      return { rows: newRows };
    });
    setActiveCell(null);
  };

  const addColumn = (position: 'before' | 'after' = 'after', targetCol: number = -1) => {
    setTableData(prev => {
      const newRows = prev.rows.map(row => {
        const newRow = [...row];
        const insertIndex = targetCol === -1 ? row.length : (position === 'before' ? targetCol : targetCol + 1);
        newRow.splice(insertIndex, 0, {
          content: '',
          backgroundColor: '#ffffff',
          color: '#000000'
        });
        return newRow;
      });
      return { rows: newRows };
    });
    setActiveCell(null);
  };

  const handleImport = () => {
    const parsed = parseHtmlTable(inputHtml);
    setTableData(parsed);
    setShowImport(false);
  };

  const handleExport = () => {
    const html = generateHtmlTable();
    navigator.clipboard.writeText(html);
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.textContent = 'HTML copied to clipboard!';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  useEffect(() => {
    const parsed = parseHtmlTable(defaultTable);
    setTableData(parsed);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, cellIndex: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      row: rowIndex,
      col: cellIndex
    });
    setActiveCell({ row: rowIndex, col: cellIndex });
  };

  const handleColorChange = (color: string, type: 'text' | 'background') => {
    if (!activeCell) return;

    if (type === 'text') setSelectedColor(color);
    else setSelectedBgColor(color);

    setTableData(prev => ({
      rows: prev.rows.map((row, i) =>
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
      )
    }));
  };

  const deleteRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) return; // Prevent deleting the last row
    setTableData(prev => ({
      rows: prev.rows.filter((_, index) => index !== rowIndex)
    }));
    setActiveCell(null);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const deleteColumn = (colIndex: number) => {
    if (tableData.rows[0]?.length <= 1) return; // Prevent deleting the last column
    setTableData(prev => ({
      rows: prev.rows.map(row => row.filter((_, index) => index !== colIndex))
    }));
    setActiveCell(null);
    setContextMenu(prev => ({ ...prev, show: false }));
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
          <button 
            className="toolbar-button" 
            onClick={() => addRow('after', tableData.rows.length - 1)} 
            title="Add Row"
          >
            <span className="material-icons">add_row_below</span>
          </button>
          <button 
            className="toolbar-button" 
            onClick={() => addColumn('after', tableData.rows[0]?.length - 1)} 
            title="Add Column"
          >
            <span className="material-icons">add_column</span>
          </button>
        </div>
        <div className="toolbar-group">
          <button className="toolbar-button" onClick={() => setShowImport(true)} title="Import HTML">
            <span className="material-icons">upload_file</span>
          </button>
          <button className="toolbar-button" onClick={handleExport} title="Export HTML">
            <span className="material-icons">download</span>
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="table-container">
        <table className="sheet-table">
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
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
                            setTableData(prev => ({
                              rows: prev.rows.map((r, i) =>
                                i === rowIndex
                                  ? r.map((c, j) =>
                                      j === cellIndex ? { ...c, colspan: value } : c
                                    )
                                  : r
                              )
                            }));
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
                            setTableData(prev => ({
                              rows: prev.rows.map((r, i) =>
                                i === rowIndex
                                  ? r.map((c, j) =>
                                      j === cellIndex ? { ...c, rowspan: value } : c
                                    )
                                  : r
                              )
                            }));
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
