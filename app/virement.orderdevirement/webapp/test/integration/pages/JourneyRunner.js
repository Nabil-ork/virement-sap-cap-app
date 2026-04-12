sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"virement/orderdevirement/test/integration/pages/JournalEntryPrintList",
	"virement/orderdevirement/test/integration/pages/JournalEntryPrintObjectPage"
], function (JourneyRunner, JournalEntryPrintList, JournalEntryPrintObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('virement/orderdevirement') + '/test/flpSandbox.html#virementorderdevirement-tile',
        pages: {
			onTheJournalEntryPrintList: JournalEntryPrintList,
			onTheJournalEntryPrintObjectPage: JournalEntryPrintObjectPage
        },
        async: true
    });

    return runner;
});

