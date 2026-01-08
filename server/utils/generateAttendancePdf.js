const PDFDocument = require('pdfkit')

module.exports = function generateAttendancePdf(res, reportData, meta) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=attendance-report-${Date.now()}.pdf`
  )

  doc.pipe(res)

  /* =========================
     HELPERS
  ========================= */
  const drawLine = (y) => {
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cccccc').stroke()
  }

  const addFooter = () => {
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      doc.fontSize(9)
        .fillColor('#666')
        .text(
          `Page ${i + 1} of ${range.count}`,
          40,
          800,
          { align: 'center' }
        )
    }
  }

  /* =========================
     HEADER
  ========================= */
  doc
    .fontSize(20)
    .fillColor('#0f172a')
    .text('Attendance Report', { align: 'center' })

  doc.moveDown(0.5)

  doc
    .fontSize(11)
    .fillColor('#334155')
    .text(`From: ${meta.startDate}`)
    .text(`To: ${meta.endDate}`)
    .text(
      `Committee: ${
        meta.committee === 'all' ? 'All Committees' : meta.committee
      }`
    )

  drawLine(doc.y + 10)
  doc.moveDown()

  /* =========================
     BODY
  ========================= */
  let overall = {
    attendance: 0,
    hours: 0,
  }

  for (const committee of reportData) {
    doc
      .fontSize(16)
      .fillColor('#1e293b')
      .text(`Committee: ${committee.committee}`)

    doc
      .fontSize(11)
      .fillColor('#475569')
      .text(`Head: ${committee.head || 'N/A'}`)

    doc.moveDown(0.5)

    // Table Header
    doc
      .fontSize(10)
      .fillColor('#0f172a')
      .text('Member Name', 40, doc.y, { width: 140 })
      .text('Attendance', 190, doc.y, { width: 70 })
      .text('Total Hours', 270, doc.y, { width: 80 })
      .text('Weekly Avg', 360, doc.y, { width: 80 })
      .text('Daily Avg', 450, doc.y, { width: 80 })

    drawLine(doc.y + 12)
    doc.moveDown(0.3)

    let committeeTotal = {
      attendance: 0,
      hours: 0,
    }

    committee.members.forEach((m) => {
      if (doc.y > 740) doc.addPage()

      doc
        .fontSize(10)
        .fillColor('#000')
        .text(m.name, 40, doc.y, { width: 140 })
        .text(`${m.attendance} days`, 190, doc.y, { width: 70 })
        .text(`${m.totalHours}`, 270, doc.y, { width: 80 })
        .text(`${m.weeklyAvg}`, 360, doc.y, { width: 80 })
        .text(`${m.dailyAvg}`, 450, doc.y, { width: 80 })

      committeeTotal.attendance += m.attendance
      committeeTotal.hours += Number(m.totalHours)

      overall.attendance += m.attendance
      overall.hours += Number(m.totalHours)

      doc.moveDown(0.3)
    })

    drawLine(doc.y + 5)

    // Committee Total
    doc
      .fontSize(11)
      .fillColor('#020617')
      .text('Committee Total', 40, doc.y + 5)
      .text(`${committeeTotal.attendance} days`, 190, doc.y + 5)
      .text(`${committeeTotal.hours.toFixed(2)} hrs`, 270, doc.y + 5)

    doc.moveDown(1.5)
  }

  /* =========================
     OVERALL SUMMARY
  ========================= */
  drawLine(doc.y)

  doc
    .fontSize(14)
    .fillColor('#020617')
    .text('Grand Total Summary')

  doc.moveDown(0.5)

  doc
    .fontSize(11)
    .fillColor('#000')
    .text(`Total Attendance Days: ${overall.attendance}`)
    .text(`Total Working Hours: ${overall.hours.toFixed(2)} hrs`)

  /* =========================
     FOOTER
  ========================= */
  addFooter()

  doc.end()
}
