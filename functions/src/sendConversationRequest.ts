import * as functions from 'firebase-functions'
import * as util from './util'
import { buyDrinkFor } from './buyDrinkFor'
import { acceptRequest } from './onMessageCreate';

// Handler for sendConversationRequest function
// data - { uid: string, text: string, drinktypeid: string }
// context - Firebase https.onCall Context
// rtdb - realtime database to use in function
// db - firestore database to use in function
export const handler = (data, context, db, messaging) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.text === 'string' || data.text.length === 0 ||
        typeof data.uid === 'string' || data.uid.length === 0 ||
        typeof data.drinktypeid === 'string' || data.drinktypeid.length === 0)) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'arguments userId" containing user UID and "text" containing message for this user.');
    }

    console.log(data)
    const fromUid = context.auth.uid;
    const toUid = data.uid;
    const conversationId = util.guid();
    const fromUserRef = db.collection('users').doc(fromUid)
    const toUserRef = db.collection('users').doc(toUid)
    let toUserData;
    let drink;
    let fromUserData;
    const batch = db.batch();

    // buy drink and send
    return fromUserRef.get()
        .then(doc => {
            fromUserData = doc.data()
            console.log(fromUserData.conversations)
            if (fromUserData.conversations) {
                Object.keys(fromUserData.conversations).forEach(function (key) {
                    if (fromUserData.conversations[key].receiver === toUid) {
                        throw new functions.https.HttpsError('failed-precondition', 'The conversation between ' +
                            'these users already exist.');
                    }
                })
            }

            return buyDrinkFor(db, {
                uid: fromUid,
                receiver: toUid,
                drinktypeid: data.drinktypeid
            })
        })

        // add invitation to sender database
        .then(boughtDrink => {
            drink = boughtDrink
            console.log(drink)
            return batch.update(fromUserRef, {
                conversations: {
                    ...(fromUserData.conversations ? fromUserData.conversations : []), [conversationId]: {
                        id: conversationId,
                        sender: fromUid,
                        receiver: toUid,
                        accepted: true,
                        text: data.text,
                        drinkId: drink.id,
                        drinkPrice: drink.price,
                        drinkImage: drink.imageUrl,
                        drinkName: drink.name,
                        seen: false,
                        lastUpdated: new Date().getTime() / 1000,
                    }
                },
            });
        })

        // add invitation to receiver database
        .then(() => toUserRef.get()
            .then(doc => {
                toUserData = doc.data();
                return batch.update(toUserRef, {
                    conversations: {
                        ...(toUserData.conversations ? toUserData.conversations : []), [conversationId]: {
                            id: conversationId,
                            sender: fromUid,
                            receiver: toUid,
                            accepted: true,
                            seen: false,
                            text: data.text,
                            drinkId: drink.id,
                            drinkPrice: drink.price,
                            drinkImage: drink.imageUrl,
                            drinkName: drink.name,
                            lastUpdated: new Date().getTime() / 1000
                        }
                    },
                });
            })
        )

        // add message to conversation database
        .then(() => {
            const message = {
                sender: fromUid,
                receiver: toUid,
                seen: false,
                text: data.text,
                drinkId: drink.id,
                date: new Date().getTime() / 1000,
                lastUpdated: new Date().getTime() / 1000
            };

            const newMessageDoc = db.collection(`conversations/${conversationId}/messages`).doc()
            return batch.set(newMessageDoc, message)
        })

        // send notification to receiver about chat request
        .then(() => {
            // prepare message notification payload
            const payload = {
                notification: {
                    title: 'New chat request from ' + fromUserData.fullname,
                    from: fromUid,
                    body: util.truncateMessage(data.text),
                    badge: '1',
                    conversationId: conversationId,
                    categoryId: 'sendConversationRequest',
                }
            }
            console.log(`message: ${payload.notification.body} to token: ${toUserData.token}`)
            return messaging.sendToDevice(toUserData.token, payload)
        })
        .then(function (response) {
            console.log("Successfully sent message:", response);
        })
        .then(() => batch.commit())
        .then(() => acceptRequest(fromUid, toUid, conversationId, db))

        // catch error if any happens
        .catch(error => {
            console.error('error: ', error)
            throw new functions.https.HttpsError('internal', error)
        })
};
