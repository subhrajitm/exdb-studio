import React from 'react'

export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, row: T, index: number) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string | number
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  keyExtractor?: (row: T, index: number) => string | number
  onRowClick?: (row: T, index: number) => void
  emptyMessage?: string | React.ReactNode
  className?: string
}

export function Table<T = any>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}: TableProps<T>) {
  const getKey = (row: T, index: number): string | number => {
    if (keyExtractor) {
      return keyExtractor(row, index)
    }
    if (typeof row === 'object' && row !== null && 'id' in row) {
      return (row as any).id || index
    }
    return index
  }
  
  if (data.length === 0) {
    return (
      <div className={`border border-black/10 bg-white ${className}`}>
        <div className="p-8 text-center text-sm text-black/60">
          {emptyMessage}
        </div>
      </div>
    )
  }
  
  return (
    <div className={`border border-black/10 bg-white overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 border-b border-black/10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-2 text-left text-xs font-medium text-black/70 uppercase ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                  }`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.map((row, rowIndex) => (
              <tr
                key={getKey(row, rowIndex)}
                className={`transition-colors ${onRowClick ? 'hover:bg-black/5 cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((column) => {
                  const value = (row as any)[column.key]
                  const content = column.render ? column.render(value, row, rowIndex) : value
                  
                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                      }`}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

