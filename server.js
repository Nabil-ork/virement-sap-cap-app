'use strict'
const cds = require('@sap/cds')
const PDFDocument = require('pdfkit')

// ── French amount-to-words (Tunisian Dinar) ────────────────────────────────
function amountToWords(amount) {
    if (!amount && amount !== 0) return ''
    const num = parseFloat(amount)
    if (isNaN(num)) return ''

    const parts = num.toFixed(3).split('.')
    const intPart = parseInt(parts[0], 10)
    const decPart = parseInt(parts[1], 10)

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
        const tenWords = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
        return tenWords[t] + (o === 1 ? '-et-un' : o ? '-' + ones[o] : '')
    }

    function belowThousand(n) {
        if (n === 0) return ''
        if (n < 100) return belowHundred(n)
        const h = Math.floor(n / 100)
        const r = n % 100
        const cent = (h > 1 ? ones[h] + '-' : '') + 'cent' + (r === 0 && h > 1 ? 's' : '')
        return cent + (r ? '-' + belowHundred(r) : '')
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

    let words = convert(intPart) + (intPart > 1 ? ' dinars' : ' dinar')
    if (decPart > 0) {
        words += ' et ' + convert(decPart) + (decPart > 1 ? ' millimes' : ' millime')
    }
    return words.charAt(0).toUpperCase() + words.slice(1)
}

// ── Build PDF matching "Ordre de Virement" layout ─────────────────────────
function buildPDF(row, doc) {
    const PAGE_W = doc.page.width   // 595.28 pt for A4
    const MARGIN = 50
    const W = PAGE_W - 2 * MARGIN   // ≈ 495 pt

    const amount = parseFloat(row.amount || 0)
    const amountStr = amount.toFixed(3)
    const bankName = row.payingBank || row.bankName || ''

    // ── Page header ──────────────────────────────────────────────────────────
    const now = new Date()
    const p = n => String(n).padStart(2, '0')
    const dateStr = `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ` +
                    `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`

    doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
       .text(row.companyName || '', MARGIN, 40)
    doc.font('Helvetica').fontSize(10)
       .text(dateStr, MARGIN, 40, { width: W, align: 'right' })
    doc.font('Helvetica').fontSize(10)
       .text('Page - 1', MARGIN, 56, { width: W, align: 'center' })

    // ── Title ────────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14)
       .text('ORDRE DE VIREMENT', MARGIN, 82, { width: W, align: 'center', underline: true })

    // ── Addressee block ───────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10)
       .text(`A Monsieur le directeur de la ${bankName}`, MARGIN, 118)
       .text('Veuillez effectuer les virements suivants :', MARGIN, 134)
    doc.font('Helvetica-Bold').fontSize(10)
       .text(`Banque : ${bankName}`, MARGIN, 152)

    // ── Table ─────────────────────────────────────────────────────────────────
    const TY = 172                          // table top Y
    const COL_W = [75, 110, 155, 90, 65]   // sum = 495 = W
    const HDR_H = 28
    const ROW_H = 20

    // column left-edge x positions
    const cx = []
    let xPos = MARGIN
    for (const w of COL_W) { cx.push(xPos); xPos += w }

    // header background (grey fill + black stroke)
    doc.rect(MARGIN, TY, W, HDR_H).fillAndStroke('#d0d0d0', 'black')

    // outer border of the whole table
    doc.rect(MARGIN, TY, W, HDR_H + ROW_H).stroke('black')

    // header / data separator
    doc.moveTo(MARGIN, TY + HDR_H).lineTo(MARGIN + W, TY + HDR_H).stroke('black')

    // vertical column dividers
    cx.slice(1).forEach(x => {
        doc.moveTo(x, TY).lineTo(x, TY + HDR_H + ROW_H).stroke('black')
    })

    // header labels
    const headers = ['Code\nBeneficiaire', 'Libelle\nBeneficiaire', 'RIB', 'Banque', 'Montant\n(DTN)']
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('black')
    headers.forEach((h, i) => {
        doc.text(h, cx[i] + 3, TY + 5, { width: COL_W[i] - 6, align: 'center', lineGap: 0 })
    })

    // data cells
    const cells = [
        row.beneficiaryCode || '',
        row.beneficiaryName || '',
        row.rib || '',
        row.bankName || '',
        amountStr
    ]
    doc.font('Helvetica').fontSize(8).fillColor('black')
    cells.forEach((val, i) => {
        doc.text(String(val), cx[i] + 3, TY + HDR_H + 6, {
            width: COL_W[i] - 6,
            align: i === 4 ? 'right' : 'left',
            lineBreak: false
        })
    })

    // ── Summary ───────────────────────────────────────────────────────────────
    let y = TY + HDR_H + ROW_H + 12
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
       .text('Nbre Virement : 1', MARGIN, y)
    y += 15
    doc.text(`TOTAL : ${bankName} ${amountStr} ****`, MARGIN, y)

    // ── Separator line ────────────────────────────────────────────────────────
    y += 22
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).stroke('black')
    y += 8

    // ── Amount in words ───────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
       .text('Montant en toutes lettres :', MARGIN, y)
    y += 15
    doc.font('Helvetica').fontSize(10)
       .text(`${amountStr} DTN ****`, MARGIN, y)

    // ── Separator line ────────────────────────────────────────────────────────
    y += 22
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).stroke('black')
    y += 15

    // ── Salutation ────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10)
       .text('Veuillez agreer, Monsieur, nos meilleures salutations.', MARGIN, y)

    // ── Signature ────────────────────────────────────────────────────────────
    doc.text('Signature', MARGIN, y + 80, { width: W, align: 'right' })
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
