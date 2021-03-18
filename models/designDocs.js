var dd = {
    ALL_PENDING_MSG_BY_TIMESTAMP: {
        design: 'all-pending-msg-by-timestamp',
        view: 'view',
        dd: {
            _id: "_design/all-pending-msg-by-timestamp",
            views: {
                view: {
                    map: `function(doc) {
                    if (doc.docType && doc.docType == "msg" && doc.status && doc.status == "pending") {
                        emit(doc.lastUpdated)
                    }
                }`
                }
            }
        }
    }
};

module.exports = dd;