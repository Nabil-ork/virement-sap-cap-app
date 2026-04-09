using { Virement as db } from '../db/schema';

@path: '/service/virement'
service virementSrv {
    entity JournalEntryPrint as projection on db.JournalEntryPrint actions {
        action print() returns String;
    };
}