'use strict'
const cds = require('@sap/cds')
const PDFDocument = require('pdfkit')

// ── European amount format: 2500.500 → "2.500,500" ────────────────────────
function formatAmount(num) {
    const fixed = parseFloat(num || 0).toFixed(3)
    const [intStr, decStr] = fixed.split('.')
    const intFormatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return intFormatted + ',' + decStr
}

// ── French amount-to-words: "DEUX MILLE CINQ CENTS DINARS 500 MILLIMES" ──
function amountToWords(amount) {
    if (!amount && amount !== 0) return ''
    const num = parseFloat(amount)
    if (isNaN(num)) return ''

    const fixed = num.toFixed(3).split('.')
    const intPart = parseInt(fixed[0], 10)
    const decPart = parseInt(fixed[1], 10)

    const ones = [
        '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf'
    ]

    function belowHundred(n) {
        if (n < 20) return ones[n]
        const t = Math.floor(n / 10)
        const o = n % 10
        if (t === 7) return 'soixante-' + ones[10 + o]
        if (t === 8) return o === 0 ? 'quatre-vingts' : 'quatre-vingt-' + ones[o]
        if (t === 9) return 'quatre-vingt-' + ones[10 + o]
        const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
        return tens[t] + (o === 1 ? '-et-un' : o ? '-' + ones[o] : '')
    }

    function belowThousand(n) {
        if (n === 0) return ''
        if (n < 100) return belowHundred(n)
        const h = Math.floor(n / 100)
        const r = n % 100
        const cent = (h > 1 ? ones[h] + ' ' : '') + 'cent' + (r === 0 && h > 1 ? 's' : '')
        return r ? cent + ' ' + belowHundred(r) : cent
    }

    function convert(n) {
        if (n === 0) return 'zéro'
        let res = ''
        if (n >= 1000000) {
            const m = Math.floor(n / 1000000)
            res += (m === 1 ? 'un million' : belowThousand(m) + ' millions') + ' '
            n %= 1000000
        }
        if (n >= 1000) {
            const k = Math.floor(n / 1000)
            res += (k === 1 ? 'mille' : belowThousand(k) + ' mille') + ' '
            n %= 1000
        }
        if (n > 0) res += belowThousand(n)
        return res.trim()
    }

    // Dinars in French words (uppercase) + millimes as a number
    let words = convert(intPart).toUpperCase() + (intPart > 1 ? ' DINARS' : ' DINAR')
    if (decPart > 0) {
        words += ' ' + decPart + ' MILLIMES'
    }
    return words
}

// ── Build PDF matching the reference "Ordre de Virement" layout ───────────
function buildPDF(row, doc) {
    const PAGE_W = doc.page.width   // 595.28 pt for A4
    const MARGIN = 50
    const W = PAGE_W - 2 * MARGIN   // ≈ 495 pt

    const amount      = parseFloat(row.amount || 0)
    const amountStr   = formatAmount(amount)
    const amountWords = amountToWords(amount)
    const bankName    = row.payingBank || row.bankName || ''

    // ── Date & Page (top right, italic) ──────────────────────────────────
    const now = new Date()
    const p = n => String(n).padStart(2, '0')
    const dateStr = `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ` +
                    `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`

    doc.font('Helvetica-Oblique').fontSize(10).fillColor('black')
       .text(dateStr, MARGIN, 28, { width: W, align: 'right' })
    doc.font('Helvetica-Oblique').fontSize(10)
       .text('Page -    1', MARGIN, 42, { width: W, align: 'right' })

    // ── Company name (bold italic, centered) ──────────────────────────────
    doc.font('Helvetica-BoldOblique').fontSize(10).fillColor('black')
       .text('Sté Délice des Eaux Minérales', MARGIN, 28, { width: W, align: 'center' })

    // ── "ORDRE DE VIREMENT" (bold italic, centered) ───────────────────────
    doc.font('Helvetica-BoldOblique').fontSize(12).fillColor('black')
       .text('ORDRE DE VIREMENT', MARGIN, 44, { width: W, align: 'center' })

    // ── Separator ─────────────────────────────────────────────────────────
    //doc.moveTo(MARGIN, 64).lineTo(MARGIN + W, 64).lineWidth(0.75).stroke('black')

    // ── Addressee block ───────────────────────────────────────────────────
    let y = 120
    doc.font('Helvetica').fontSize(10).fillColor('black')
       .text('A Monsieur le directeur de la ', MARGIN, y, { continued: true })
    doc.font('Helvetica-Bold').text(bankName)

    y = doc.y + 4
    doc.font('Helvetica').fontSize(10)
       .text('Par le débit de notre compte N°  ', MARGIN, y, { continued: true })
    doc.font('Helvetica-Bold').text((row.bankNumber || '') + '  ', { continued: true })
    doc.font('Helvetica-Bold').text(row.bankAccount || '', { continued: true })
    doc.font('Helvetica').text('  ,veuillez effectuer les virements suivants :')

    y = doc.y + 22
    doc.font('Helvetica-Bold').fontSize(10)
       .text('Banque :  ', MARGIN, y, { continued: true })
    doc.font('Helvetica').text((row.bankControlKey ? row.bankControlKey + '  ' : ''), { continued: true })
    doc.font('Helvetica-Bold').text(bankName)

    // ── Table ─────────────────────────────────────────────────────────────
    const TY = doc.y + 14
    const COL_W = [75, 110, 155, 90, 65]   // sum = 495 = W
    const HDR_H = 22
    const ROW_H = 18

    const cx = []
    let xPos = MARGIN
    for (const w of COL_W) { cx.push(xPos); xPos += w }

    // Top border
    //doc.moveTo(MARGIN, TY).lineTo(MARGIN + W, TY).lineWidth(0.75).stroke('black')

    // Thick separator between header and data (double-line effect)
    doc.moveTo(MARGIN, TY + HDR_H - 1).lineTo(MARGIN + W, TY + HDR_H - 1).lineWidth(0.5).stroke('black')
    doc.moveTo(MARGIN, TY + HDR_H + 1).lineTo(MARGIN + W, TY + HDR_H + 1).lineWidth(0.5).stroke('black')

    // Bottom border
    //doc.moveTo(MARGIN, TY + HDR_H + ROW_H).lineTo(MARGIN + W, TY + HDR_H + ROW_H).lineWidth(0.75).stroke('black')

    // Vertical column dividers (span full table height)
    cx.slice(1).forEach(x => {
        doc.moveTo(x, TY).lineTo(x, TY + HDR_H + ROW_H).lineWidth(0.5).stroke('black')
    })

    // Header labels (regular weight, centred)
    const headers = ['Code\nBénéficiare', 'Libelle\nBénéficiaire', 'RIB', 'Banque', 'Montant\n(DTN)']
    doc.font('Helvetica').fontSize(8).fillColor('black')
    headers.forEach((h, i) => {
        doc.text(h, cx[i] + 3, TY + 4, { width: COL_W[i] - 6, align: 'center', lineGap: 0 })
    })

    // Data cells (regular weight)
    const cells = [
        row.beneficiaryCode || '',
        row.beneficiaryName || '',
        row.rib || '',
        row.bankName || '',
        amountStr
    ]
    doc.font('Helvetica').fontSize(8).fillColor('black')
    cells.forEach((val, i) => {
        doc.text(String(val), cx[i] + 3, TY + HDR_H + 5, {
            width: COL_W[i] - 6,
            align: i === 4 ? 'right' : 'left',
            lineBreak: false
        })
    })

    // ── Summary ───────────────────────────────────────────────────────────
    y = TY + HDR_H + ROW_H + 14

    // "Nbre Virement : 1"  — bold italic, visually centred below table
    doc.font('Helvetica-BoldOblique').fontSize(10).fillColor('black')
       .text('Nbre Virement :  1', 40, y, { width: W, align: 'center' })

    // TOTAL line: label + bank on the left; amount bold on the right
    y += 18
    doc.font('Helvetica').fontSize(10).fillColor('black')
       .text('TOTAL :  ' + bankName, 190, y)
    doc.font('Helvetica-Bold').fontSize(10)
       .text(amountStr + '  ****', MARGIN, y, { width: W, align: 'right' })

    // ── Separator ─────────────────────────────────────────────────────────
    y += 24
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.5).stroke('black')
    y += 10

    // ── Amount in words ───────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10).fillColor('black')
       .text('Montant en toutes lettres :', MARGIN, y)
    y += 14
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
       .text(amountWords + '****', MARGIN, y)

    // ── Separator ─────────────────────────────────────────────────────────
    y += 22
    //doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.5).stroke('black')
    y += 12

    // ── Salutation ────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10)
       .text('Veuillez agréer, Monsieur, nos meilleures salutations.', MARGIN, y)

    // ── Signature (large bold, right-aligned) ─────────────────────────────
    doc.font('Helvetica-Bold').fontSize(18)
       .text('Signature', MARGIN, y + 70, { width: W, align: 'right' })
}

// ── Register PDF download route BEFORE OData middleware ───────────────────
cds.on('bootstrap', (app) => {
    app.get('/api/pdf/journal-entry/:id', async (req, res) => {
        try {
            const { id } = req.params

            const row = await SELECT.one
                .from('Virement.JournalEntryPrint')
                .where({ ID: id })

            if (!row) {
                return res.status(404).json({ error: 'Record not found' })
            }

            const filename = `OrdreDeVirement_${row.journalEntry}_${Date.now()}.pdf`
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
            res.setHeader('Cache-Control', 'no-cache, no-store')

            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
            doc.pipe(res)
            buildPDF(row, doc)
            doc.end()

        } catch (err) {
            console.error('[PDF] generation error:', err)
            if (!res.headersSent) {
                res.status(500).json({ error: 'PDF generation failed', message: err.message })
            }
        }
    })
})

module.exports = cds.server
