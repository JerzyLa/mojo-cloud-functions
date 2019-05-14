// Handler for getOpenedConversations function
// data - {} (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    // if (!context.auth) {
    //     throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
    //         'while authenticated.');
    // }

    const getById = (path, ids) => {
        return db.getAll(
            [].concat(ids).map(id => db.doc(`${path}/${id}`)
            )
        );
    }

    const fromUserId = 'cYXmb8rvI2Q3S0vyc07SQP9upCo2'; //context.auth.uid;

    const userRef = db.collection('users').doc(fromUserId);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => {
            const docData = doc.data();
            if (docData.conversations) {
                console.log('conversations: ', docData.conversations);
                return getById('conversations', Object.keys(docData.conversations))
                    .then(conversationsData => {
                        const conversationsDataExtracted = [];
                        console.log('conversations data: ', conversationsData);
                        for (let i = 0; i < conversationsData.length; i++) {
                            console.log('one: ', conversationsData[i].data());
                            conversationsData[i].get().then(after => console.log('after: ', after));
                            conversationsDataExtracted[i] = {
                                ...conversationsData[i].data(),
                                id: docData.conversations[i],
                            };
                        }
                        return conversationsDataExtracted.sort((a, b) => {
                            if(a.messages[a.messages.length - 1].date > b.messages[b.messages.length - 1].date)
                                return -1;
                            if(a.messages[a.messages.length - 1].date < b.messages[b.messages.length - 1].date)
                                return 1;
                            return 0;
                        }).map(item => item.id)
                    });
            } else {
                return [];
            }
        }),
    );
}
