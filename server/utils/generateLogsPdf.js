const PDFDocument = require('pdfkit')

module.exports = function generateLogsPdf(res, payload) {
  const { title, filters, logs } = payload

  const doc = new PDFDocument({ margin: 40, size: 'A4' })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`
  )

  doc.pipe(res)

  /* ================= HEADER ================= */
  doc
    .fontSize(18)
    .text('Council CRM – Logs Report', { align: 'center' })
    .moveDown(0.5)

  doc
    .fontSize(12)
    .text(title, { align: 'center' })
    .moveDown(1)

  /* ================= FILTER SUMMARY ================= */
  doc.fontSize(10)
  Object.entries(filters).forEach(([key, value]) => {
    if (value) doc.text(`${key}: ${value}`)
  })

  doc.moveDown()

  /* ================= TABLE HEADER ================= */
  doc
    .fontSize(10)
    .text(
      'User | Action | Severity | Committee | Description | Time',
      { underline: true }
    )
    .moveDown(0.5)

  /* ================= TABLE ROWS ================= */
  logs.forEach(log => {
    doc
      .fontSize(9)
      .text(
        `${log.user} | ${log.action} | ${log.severity} | ${
          log.committee || '-'
        } | ${log.description} | ${new Date(log.created_at).toLocaleString()}`,
        { width: 520 }
      )
      .moveDown(0.3)
  })

  /* ================= FOOTER ================= */
  doc
    .moveDown(1)
    .fontSize(8)
    .text(
      `Generated on ${new Date().toLocaleString()}`,
      { align: 'right' }
    )

  doc.end()
}
