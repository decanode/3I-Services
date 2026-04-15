const COUNTER_FIELDS = [
    'src_master',
    'src_outstanding',
    'totaldebit',
    'totalcredit',
    'src_master_date',
    'src_outstanding_date',
    'totalLedgers',
];

const COUNTER_COLLECTION = 'counters';
const COUNTER_DOC_ID = 'app_stats';

module.exports = { COUNTER_FIELDS, COUNTER_COLLECTION, COUNTER_DOC_ID };
