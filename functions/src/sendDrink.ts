import * as functions from 'firebase-functions';

// data {uid: string, drinkid: string}
export const handler = async (data, context, db, messaging) => {
    if(!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'Signed out user call')
    }

    if(!(typeof data.drinkid === 'string') || data.drinkid === '') {
        throw new functions.https.HttpsError('invalid-argument', 'drink id shall be non empty string')
    }

    if(!(typeof data.uid === 'string') || data.uid.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid receiver uid')
    }

    try {
        // read current user
        const userDoc = await db.collection('users').doc(context.auth.uid).get()
        const userData = userDoc.data();

        const receiverDoc = await db.collection('users').doc(data.uid).get();
        const receiverData = await receiverDoc.data();

        // check if user is owner of drink
        const drinkDoc = await db.collection('drinks').doc(data.drinkid).get();
        const drinkData = drinkDoc.data();
        if(!(drinkData.owner === userData.uid)) {
            throw new functions.https.HttpsError('failed-precondition', `user is not owner of drink: ${data.drinkid}`)
        }
        if(!(drinkData.sentTo === '')) {
            throw new functions.https.HttpsError('failed-precondition', `drink: ${data.drinkid} was already sent in chat request`)
        }

        return await db.collection('drinks').doc(data.drinkid).update({
            owner: data.uid,
            sender: context.auth.uid
        })
        .then(() => {
            const payload = {
                notification: {
                    title: 'You received a gift!',
                    from: context.auth.uid,
                    body: userData.fullname + ' is sending you gift.',
                    categoryId: 'sendDrink',
                }
            }
            console.log(`message: ${userData.fullname} is sending you gift. to token: ${receiverData.token}`)
            return messaging.sendToDevice(receiverData.token, payload)
        });
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}