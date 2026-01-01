const PDFDocument = require('pdfkit')

module.exports = function generateCommitteePdf(res, data) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  })

  /* ================= HTTP HEADERS ================= */
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=committee-insights.pdf'
  )

  doc.pipe(res)

  /* ================= HELPERS ================= */
  const drawDivider = () => {
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor('#E5E7EB')
      .stroke()
      .moveDown(1)
  }

  const drawKeyValue = (label, value) => {
    doc
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(label, { continued: true })
      .font('Helvetica')
      .fillColor('#374151')
      .text(` ${value}`)
  }

  /* ================= HEADER ================= */
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text('Committee Insights Report', { align: 'center' })

  doc
    .moveDown(0.5)
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#6B7280')
    .text(`Generated on: ${new Date().toLocaleString()}`, {
      align: 'center',
    })

  drawDivider()

  /* ================= SUMMARY ================= */
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text('Committee Summary')

  doc.moveDown(0.5)

  drawKeyValue('Committee:', data.summary.committee)
  drawKeyValue('Total Members:', data.summary.totalMembers)
  if (data.summary.attendanceRate !== undefined) {
    drawKeyValue('Attendance Rate:', `${data.summary.attendanceRate}%`)
  }
  if (data.summary.pendingLeaves !== undefined) {
    drawKeyValue('Pending Leaves:', data.summary.pendingLeaves)
  }
  if (data.summary.submittedReports !== undefined) {
    drawKeyValue('Submitted Reports:', data.summary.submittedReports)
  }

  doc.moveDown()
  drawDivider()

  /* ================= ATTENDANCE CHART ================= */
  if (data.chartImage) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Attendance Trend')

    doc.moveDown(0.5)

    const base64 = data.chartImage.replace(
      /^data:image\/png;base64,/,
      ''
    )
    const imgBuffer = Buffer.from(base64, 'base64')

    doc.image(imgBuffer, {
      fit: [480, 260],
      align: 'center',
    })

    doc.moveDown()
    drawDivider()
  }

  /* ================= MEMBERS TABLE ================= */
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text('Committee Members')

  doc.moveDown(0.5)

  /* ---- Table Header ---- */
  const tableTop = doc.y
  const colX = {
    council: 40,
    name: 140,
    position: 340,
    attendance: 460,
  }

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text('Council ID', colX.council, tableTop)
    .text('Name', colX.name, tableTop)
    .text('Position', colX.position, tableTop)
    .text('Attendance', colX.attendance, tableTop)

  doc.moveDown(0.3)
  drawDivider()

  /* ---- Table Rows ---- */
  doc.font('Helvetica').fontSize(10)

  data.members.forEach((m, index) => {
    if (doc.y > 760) {
      doc.addPage()
    }

    doc
      .fillColor('#374151')
      .text(m.council_id || '-', colX.council)
      .text(m.name || '-', colX.name)
      .text(m.position || '-', colX.position)
      .text(
        m.attendance_days !== undefined
          ? `${m.attendance_days} days`
          : '-',
        colX.attendance
      )

    doc.moveDown(0.4)
  })

  /* ================= FOOTER ================= */
  const pageCount = doc.bufferedPageRange().count
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    doc
      .fontSize(9)
      .fillColor('#9CA3AF')
      .text(
        `Page ${i + 1} of ${pageCount}`,
        40,
        800,
        { align: 'center' }
      )
  }

  doc.end()
}
