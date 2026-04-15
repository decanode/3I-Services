const { db } = require('../config/firebase');
const { COUNTER_COLLECTION, COUNTER_DOC_ID } = require('../models/counter');
const { COLLECTION_NAME: EXCEL_MASTER_COLLECTION } = require('../models/excelMaster');
const { LEDGER_REMAINDER_COLLECTION_NAME } = require('../models/ledgerRemainder');

const counterRef = () => db.collection(COUNTER_COLLECTION).doc(COUNTER_DOC_ID);


async function updateMasterUpload(fileName) {
    const countSnap = await db.collection(EXCEL_MASTER_COLLECTION).count().get();
    const totalLedgers = countSnap.data().count;
    await counterRef().set({
        src_master: fileName || null,
        src_master_date: new Date().toISOString(),
        totalLedgers,
    }, { merge: true });
}


async function _sumDebitCredit() {
    const snap = await db.collection(LEDGER_REMAINDER_COLLECTION_NAME)
        .select('debit', 'credit')
        .get();
    let totalDebit = 0;
    let totalCredit = 0;
    snap.forEach(doc => {
        const d = doc.data();
        totalDebit += parseFloat(d.debit || 0) || 0;
        totalCredit += parseFloat(d.credit || 0) || 0;
    });
    return { totalDebit, totalCredit };
}


async function updateOutstandingUpload(fileName) {
    const [countSnap, { totalDebit, totalCredit }] = await Promise.all([
        db.collection(EXCEL_MASTER_COLLECTION).count().get(),
        _sumDebitCredit(),
    ]);
    await counterRef().set({
        src_outstanding: fileName || null,
        src_outstanding_date: new Date().toISOString(),
        totalLedgers: countSnap.data().count,
        totaldebit: totalDebit,
        totalcredit: totalCredit,
    }, { merge: true });
}


async function updateLedgerTotals() {
    const { totalDebit, totalCredit } = await _sumDebitCredit();
    await counterRef().set({
        totaldebit: totalDebit,
        totalcredit: totalCredit,
    }, { merge: true });
}

/**
 * Returns the current counter document, or {} if it does not exist yet.
 */
async function getCounter() {
    const snap = await counterRef().get();
    return snap.exists ? snap.data() : {};
}

module.exports = { updateMasterUpload, updateOutstandingUpload, updateLedgerTotals, getCounter };
