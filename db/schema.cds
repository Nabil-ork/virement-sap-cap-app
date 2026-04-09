namespace Virement;
using { cuid, managed, Currency } from '@sap/cds/common';

entity JournalEntryPrint : cuid, managed {
  companyCode : String(4) @mandatory;
  fiscalYear : String(4) @mandatory;
  journalEntry : String(10) @mandatory;
  postingDate : Date;
  currency : Currency;
  beneficiaryCode : String(20);
  beneficiaryName : String(255);
  bankNumber : String(30);
  bankAccount : String(30);
  bankControlKey : String(10);
  bankName : String(255);
  rib : String(100);
  amount : Decimal(15,2);
  companyName : String(255);
  payingBank : String(255);
  status : String(30);
}