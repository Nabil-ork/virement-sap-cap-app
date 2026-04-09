const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {

    this.on('print', 'JournalEntryPrint', async (req) => {

        // Instance-bound: the key of the selected record is in req.params[0]
        const id = req.params?.[0]?.ID

        console.log('>>> print called with ID:', id)

        // ── Validation ─────────────────────────────────────────────────
        if (!id) {
            req.error(400, 'Please select exactly one Journal Entry to print')
            return
        }

        // ── Fetch the record ───────────────────────────────────────────
        const row = await SELECT.one
            .from('virementSrv.JournalEntryPrint')
            .where({ ID: id })

        if (!row) {
            req.error(404, `Journal Entry not found`)
            return
        }

        if (!row.journalEntry) {
            req.error(422, 'Selected record has no Journal Entry number')
            return
        }

        // ── Success ────────────────────────────────────────────────────
        // Later: replace this line with real PDF generation
        req.notify(`Form generated for Journal Entry ${row.journalEntry} — ${row.beneficiaryName ?? ''}`)
    })

})