import * as functions from 'firebase-functions';
import * as util from './util'
const fs = require('fs')
const Tx = require('ethereumjs-tx')
import { ACCOUNT_COMPLETION_REWARD } from "./config";
import { transferTokens } from './transferTokens'


let checkIfProfileCompletionReward;
let rewardProfile;
/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Needs to be secured (data validation) on production stage !!!!!!!!!!!!!!!!!!*/
// Edits user data in database
// data to update 
// context - Firebase Context
// db - database to use in function
export const handler = (data, context, db, web3, messaging) => {
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
            return newUser;
            }).then(async (user) => {
                console.log('user: ', user);
                let profileComplete = false;
                if(checkIfProfileCompletionReward(user)) {
                    profileComplete = true;
                    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
                    const parsedSource = JSON.parse(source)
                    const JOToken = new web3.eth.Contract(parsedSource.abi, '0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE')

                    await rewardProfile(user, web3);

                    const txRef = await db.collection("transactions").add({
                        fromUid: "mojo-app",
                        toAddr: user.address,
                        value: ACCOUNT_COMPLETION_REWARD/1e18,
                        status: "done",
                        type: "reward",
                        date: new Date().getTime()/1000
                    })
                    await txRef.update({id: txRef.id})
        
                    // print balance, to check if reward was paid properly
                    const weiBalance = await JOToken.methods.balanceOf(user.address).call()
                    const balance = Number(web3.utils.fromWei(weiBalance, 'ether'))
                    console.log(`balance: ${balance}`) 
        
                    const payload = {
                        notification: {
                            title: "Profile completion reward",
                            body: "Congratulations you get a reward for completing your profile!",
                            categoryId: 'profileCompletion',
                        }
                    }

                    // send notification to device
                    const response = await messaging.sendToDevice(user.token, payload)
                    console.log(`message: ${payload.notification.body} to token: ${user.token}`)
                    console.log("Successfully sent message:", response);
                }

                return batch.update(userRef, {
                    ...user,
                    ...data,
                    invitedBy: user.invitedBy ? user.invitedBy : //Prevent user from overwriting this field if already set
                        (data.invitedBy ? data.invitedBy : 'none'),
                    profileComplete: profileComplete,
            });
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        });;
}

checkIfProfileCompletionReward = (userData) => {
    const properties = ['fullname', 'age', 'gender', 'bio', 'genderSeeking', 'profileImgUrl', 'location', 'maxSeekingAge', 'minSeekingAge'];
    return !userData.profileComplete && properties.filter(item => userData[item] === undefined).length === 0;
};

rewardProfile = (userData, web3) => {
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    return web3.eth.getTransactionCount(relayer)
    .then(relayerNonce => {
        // create raw transaction and sign it by relayer
        const rawTransaction = {
            from: relayer,
            nonce: web3.utils.toHex(relayerNonce),
            gasPrice: web3.utils.toHex(20* 1e9),
            gasLimit: web3.utils.toHex(2000000),
            to: jotokenAddress,
            value: "0x0",
            data: JOToken.methods.transfer(userData.address, web3.utils.toHex(ACCOUNT_COMPLETION_REWARD)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(relayerPrivKey));

        // send transaction
        return web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    })
    .catch(err => {
        console.log('error: ', err);
        throw err;
    })
}
