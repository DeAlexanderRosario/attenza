/**
 * Converts an array of objects to CSV and triggers a download
 */
export function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvRows = []

    // Add Headers
    csvRows.push(headers.join(","))

    // Add Data Rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header]
            const escaped = ('' + val).replace(/"/g, '""') // Escape quotes
            return `"${escaped}"`
        })
        csvRows.push(values.join(","))
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
