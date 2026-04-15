import React from 'react';
import '../styles/componentstyles/Table.css';

/**
 * Reusable Table Component
 * 
 * Modes:
 * - Report Mode (default): For displaying data in reports
 * - Template Mode: For empty form tables used in SandLab and similar pages
 * 
 * Props:
 * - columns: Array of column definitions { key, label, width, align, bold, render, rowSpan, colSpan }
 * - data: Array of row data objects
 * - rows: Number of empty rows for template mode
 * - renderActions: Function to render action buttons
 * - noDataMessage: Message when no data
 * - minWidth: Minimum table width
 * - striped: Enable striped rows
 * - headerGradient: Enable gradient header
 * - defaultAlign: Default text alignment
 * - template: Enable template/form mode
 * - showHeader: Show/hide table header (default: true)
 * - bordered: Show all cell borders (default: true in template mode)
 * - renderCell: Custom cell renderer for template mode (rowIndex, colIndex, colKey) => ReactNode
 * - groupByColumn: Column key to group by (e.g., 'date')
 * - containerClassName: Extra class on the scroll wrapper
 * - tableClassName: Extra class on the <table>
 * - footer: ReactNode to render as table footer (e.g., pagination)
 */
const Table = ({
  columns = [],
  data = [],
  rows = 0,
  renderActions = null,
  noDataMessage = 'No records found',
  minWidth = 1400,
  striped = false,
  headerGradient = false,
  defaultAlign = 'left',
  template = false,
  showHeader = true,
  bordered = false,
  renderCell = null,
  groupByColumn = null,
  containerClassName = '',
  tableClassName = '',
  footer = null,
  onRowClick = null,
}) => {
  // Calculate rowspans for grouped column
  const calculateRowspans = () => {
    if (!groupByColumn) return {};
    
    const rowspans = {};
    let currentGroup = null;
    let groupStart = 0;
    
    data.forEach((item, index) => {
      const groupValue = item[groupByColumn];
      
      if (groupValue !== currentGroup) {
        // New group started
        if (currentGroup !== null) {
          // Set rowspan for previous group
          rowspans[groupStart] = index - groupStart;
        }
        currentGroup = groupValue;
        groupStart = index;
      }
      
      // Handle last group
      if (index === data.length - 1) {
        rowspans[groupStart] = index - groupStart + 1;
      }
    });
    
    return rowspans;
  };

  const rowspans = calculateRowspans();

  // Build class names for table
  const tableClasses = [
    'reusable-table',
    striped && 'table-striped',
    headerGradient && 'table-gradient-header',
    template && 'table-template',
    bordered && 'table-bordered',
    tableClassName
  ].filter(Boolean).join(' ');

  // Determine data to render (template mode or report mode)
  const templateData = template && rows > 0 
    ? Array.from({ length: rows }, (_, i) => ({ _id: `empty-${i}` }))
    : data;

  const columnsArray = columns;

  const containerClasses = ['reusable-table-container', containerClassName].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="reusable-table-wrapper">
        <table 
          className={tableClasses}
          style={{ minWidth: `${minWidth}px` }}
        >
        {showHeader ? (
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={col.key || index}
                style={{
                  width: col.width || 'auto',
                  textAlign: col.align || 'left'
                }}
              >
                {col.label}
              </th>
            ))}
            {renderActions && <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>
        ) : null}
        <tbody>
          {(template ? templateData : data).length === 0 ? (
            <tr>
              <td 
                colSpan={columnsArray.length + (renderActions ? 1 : 0)} 
                className="reusable-table-no-records"
              >
                <div style={{ position: 'sticky', left: 0, right: 0, display: 'inline-block', textAlign: 'center', width: '100%', maxWidth: '100vw' }}>
                  {noDataMessage}
                </div>
              </td>
            </tr>
          ) : (
            (template ? templateData : data).map((item, rowIndex) => (
              <tr
                key={item._id || item.id || rowIndex}
                onClick={onRowClick ? () => onRowClick(item, rowIndex) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col, colIndex) => {
                  // Check if this column should be grouped and if this row should be skipped
                  const isGroupedColumn = groupByColumn && col.key === groupByColumn;
                  const shouldSkip = isGroupedColumn && !rowspans[rowIndex];
                  
                  if (shouldSkip) {
                    return null; // Skip this cell (merged with cell above)
                  }

                  let value;
                  if (template && renderCell) {
                    value = renderCell(rowIndex, colIndex, col.key);
                  } else if (col.render) {
                    value = col.render(item, rowIndex);
                  } else {
                    value = item[col.key];
                  }
                  
                  const rowSpan = isGroupedColumn ? rowspans[rowIndex] : 1;
                  
                  return (
                    <td 
                      key={col.key || colIndex}
                      rowSpan={rowSpan}
                      style={{
                        width: col.width || 'auto',
                        textAlign: col.align || defaultAlign,
                        fontWeight: col.bold ? 600 : 'normal',
                        color: col.bold ? '#334155' : '#475569',
                        verticalAlign: 'middle'
                      }}
                    >
                      {template ? (value || '') : (value !== undefined && value !== null ? value : '-')}
                    </td>
                  );
                })}
                {renderActions && (
                  <td style={{ width: '120px', textAlign: 'center' }}>
                    <div className="action-buttons-group">
                      {renderActions(item, rowIndex)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      {footer && <div className="table-footer">{footer}</div>}
    </div>
  );
};

export default Table;