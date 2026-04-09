sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheJournalEntryPrintList.iSeeThisPage();
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Company Code");
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Fiscal Year");
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Journal Entry");
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Posting Date");
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Code bénéficiaire");
            Then.onTheJournalEntryPrintList.onFilterBar().iCheckFilterField("Currency");
            Then.onTheJournalEntryPrintList.onTable().iCheckColumns(10, {"companyCode":{"header":"Company Code"},"fiscalYear":{"header":"Fiscal Year"},"journalEntry":{"header":"Journal Entry"},"postingDate":{"header":"Posting Date"},"beneficiaryCode":{"header":"Code bénéficiaire"},"beneficiaryName":{"header":"Libellé bénéficiaire"},"rib":{"header":"RIB"},"bankName":{"header":"Banque"},"amount":{"header":"Montant"},"currency":{"header":"Currency"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheJournalEntryPrintList.onFilterBar().iExecuteSearch();
            
            Then.onTheJournalEntryPrintList.onTable().iCheckRows();

            When.onTheJournalEntryPrintList.onTable().iPressRow(0);
            Then.onTheJournalEntryPrintObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});