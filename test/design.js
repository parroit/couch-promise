module.exports = {
    _id: "_design/app",
    language: "javascript",
    views: {
        models: {
            map: function (doc) {
                if (doc.type === 'model') {
                    emit(doc.code, doc);
                }
            }
        }
    }

};