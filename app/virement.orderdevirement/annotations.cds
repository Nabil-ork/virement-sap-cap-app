using virementSrv as service from '../../srv/service';


annotate service.JournalEntryPrint with @UI.HeaderInfo: {
  TypeName       : 'Journal Entry',
  TypeNamePlural : 'Journal Entries',
  Title          : { Value: journalEntry },
  Description    : { Value: beneficiaryName }
};

annotate service.JournalEntryPrint with {
  ID              @UI.Hidden;
  companyCode     @title: 'Company Code';
  fiscalYear      @title: 'Fiscal Year';
  journalEntry    @title: 'Journal Entry';
  postingDate     @title: 'Posting Date';
  currency        @title: 'Currency';
  beneficiaryCode @title: 'Code bénéficiaire';
  beneficiaryName @title: 'Libellé bénéficiaire';
  rib             @title: 'RIB';
  bankName        @title: 'Banque';
  amount          @title: 'Montant';
  companyName     @title: 'Company Name';
  payingBank      @title: 'Paying Bank';
  status          @title: 'Status';
};

annotate service.JournalEntryPrint with {
  amount @Measures.ISOCurrency: currency;
};

annotate service.JournalEntryPrint with @UI.LineItem: [
  {
    $Type  : 'UI.DataFieldForAction',
    Action : 'virementSrv.print',
    Label  : 'Print',
    ![@UI.Importance] : #High
  },
  { $Type: 'UI.DataField', Value: companyCode },
  { $Type: 'UI.DataField', Value: fiscalYear },
  { $Type: 'UI.DataField', Value: journalEntry },
  { $Type: 'UI.DataField', Value: postingDate },
  { $Type: 'UI.DataField', Value: beneficiaryCode },
  { $Type: 'UI.DataField', Value: beneficiaryName },
  { $Type: 'UI.DataField', Value: rib },
  { $Type: 'UI.DataField', Value: bankName },
  { $Type: 'UI.DataField', Value: amount },
  { $Type: 'UI.DataField', Value: currency }
];

annotate service.JournalEntryPrint with @UI.Identification: [
  {
    $Type  : 'UI.DataFieldForAction',
    Action : 'virementSrv.print',
    Label  : 'Print'
  }
];

annotate service.JournalEntryPrint with @UI.SelectionFields: [
  companyCode,
  fiscalYear,
  journalEntry,
  postingDate,
  beneficiaryCode,
  currency
];

annotate service.JournalEntryPrint with @UI.FieldGroup #JournalInfo: {
  $Type : 'UI.FieldGroupType',
  Label : 'Journal Information',
  Data  : [
    { $Type: 'UI.DataField', Value: companyCode },
    { $Type: 'UI.DataField', Value: fiscalYear },
    { $Type: 'UI.DataField', Value: journalEntry },
    { $Type: 'UI.DataField', Value: postingDate },
    { $Type: 'UI.DataField', Value: currency },
    { $Type: 'UI.DataField', Value: amount },
    { $Type: 'UI.DataField', Value: companyName },
    { $Type: 'UI.DataField', Value: payingBank },
    { $Type: 'UI.DataField', Value: status }
  ]
};

annotate service.JournalEntryPrint with @UI.FieldGroup #BeneficiaryInfo: {
  $Type : 'UI.FieldGroupType',
  Label : 'Beneficiary Information',
  Data  : [
    { $Type: 'UI.DataField', Value: beneficiaryCode },
    { $Type: 'UI.DataField', Value: beneficiaryName },
    { $Type: 'UI.DataField', Value: rib },
    { $Type: 'UI.DataField', Value: bankName }
  ]
};

annotate service.JournalEntryPrint with @UI.Facets: [
  {
    $Type  : 'UI.ReferenceFacet',
    ID     : 'JournalInfo',
    Label  : 'Journal Information',
    Target : '@UI.FieldGroup#JournalInfo'
  },
  {
    $Type  : 'UI.ReferenceFacet',
    ID     : 'BeneficiaryInfo',
    Label  : 'Beneficiary Information',
    Target : '@UI.FieldGroup#BeneficiaryInfo'
  }
];