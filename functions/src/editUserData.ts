import * as functions from 'firebase-functions';
import { transferTokens } from './transferTokens'

/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Needs to be secured (data validation) on production stage !!!!!!!!!!!!!!!!!!*/
// Edits user data in database
// data to update 
// context - Firebase Context
// db - database to use in function
export const handler = (data, context, db, web3) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    const batch = db.batch();
    const userRef = db.collection('users').doc(context.auth.uid);
    return userRef.get()
        .then(doc => {
            const newUser = doc.data();
            if (data.invitedBy && !newUser.invitedBy) {
                console.log('newUser.uid: ', newUser.uid);
                console.log('invitedBy: ', data.invitedBy);
                console.log('trying to send tokens to ', newUser.address);
                transferTokens(db, web3, {
                    uid: context.auth.uid,
                    to: newUser.address,
                    value: 10,
                    jotokenAddress: jotokenAddress,
                    relayer: relayer,
                    relayerPrivKey: relayerPrivKey
                }).then(() => {
                    console.log('newUser got the tokens');
                    // Send 10 Jo tokens to inviter
                    db.collection("users").where("invitationCode", "==", data.invitedBy)
                        .get()
                        .then((querySnapshot) => {
                            console.log('querySnapshot: ', querySnapshot);
                            return querySnapshot
                                .forEach(docInvitedBy => {
                                    console.log('trying to send tokens2 to ', docInvitedBy.data());
                                    transferTokens(db, web3, {
                                        uid: context.auth.uid,
                                        to: docInvitedBy.data().address,
                                        value: 10,
                                        jotokenAddress: jotokenAddress,
                                        relayer: relayer,
                                        relayerPrivKey: relayerPrivKey
                                    }).then(() => console.log('inviter got the tokens'))
                                        .catch(() => console.error('inviter couldnt get the tokens'));;
                                })
                        })
                        .catch(function (error) {
                            console.log("Error getting documents: ", error);
                        });
                }).catch(() => console.error('newUser couldnt get the tokens'));
            }
            return batch.update(userRef, {
                ...newUser,
                ...data,
                invitedBy: newUser.invitedBy ? newUser.invitedBy : //Prevent user from overwriting this field if already set
                    (data.invitedBy ? data.invitedBy : 'none'),
            });
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        });;
}

